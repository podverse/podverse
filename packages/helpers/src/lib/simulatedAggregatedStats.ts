export const SIMULATED_STATS_ITEMS_PER_CHANNEL = 30;

export type SimulatedAggregatedCounts = {
  all_time_count: number;
  day_1_count: number;
  day_2_count: number;
  day_3_count: number;
  day_4_count: number;
  day_5_count: number;
  day_6_count: number;
  day_7_count: number;
  day_8_count: number;
  day_current_count: number;
  month_1_count: number;
  month_current_count: number;
  week_1_count: number;
  week_2_count: number;
  week_3_count: number;
  week_4_count: number;
  week_current_count: number;
};

export type SimulatedStatsCohort = 'fading' | 'headliner' | 'rising' | 'tail';

type Rng = () => number;

function hash32(n: number): number {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
}

function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function intIn(rng: Rng, min: number, max: number): number {
  if (max <= min) {
    return min;
  }
  return min + Math.floor(rng() * (max - min + 1));
}

function zipfWeight(rank: number): number {
  return 1 / (rank + 1) ** 1.2;
}

export function assignSimulatedStatsCohort(
  rank: number,
  total: number,
  entityId: number
): SimulatedStatsCohort {
  const rng = mulberry32(hash32(entityId * 31 + 7));
  const position = total <= 1 ? 0 : rank / (total - 1);
  const jitter = (rng() - 0.5) * 0.08;
  const t = Math.min(1, Math.max(0, position + jitter));

  if (t < 0.15) {
    return 'headliner';
  }
  if (t < 0.3) {
    return 'rising';
  }
  if (t < 0.45) {
    return 'fading';
  }
  return 'tail';
}

function cohortAllTimeRange(cohort: SimulatedStatsCohort): { max: number; min: number } {
  switch (cohort) {
    case 'headliner':
      return { max: 45000, min: 8000 };
    case 'rising':
      return { max: 900, min: 80 };
    case 'fading':
      return { max: 30000, min: 5000 };
    case 'tail':
      return { max: 400, min: 20 };
  }
}

function cohortDayPeakRange(cohort: SimulatedStatsCohort): { max: number; min: number } {
  switch (cohort) {
    case 'headliner':
      return { max: 220, min: 40 };
    case 'rising':
      return { max: 180, min: 30 };
    case 'fading':
      return { max: 25, min: 0 };
    case 'tail':
      return { max: 12, min: 0 };
  }
}

function daySeries(cohort: SimulatedStatsCohort, peak: number, rng: Rng): number[] {
  const peakDay =
    cohort === 'rising' ? intIn(rng, 0, 1) : cohort === 'fading' ? intIn(rng, 5, 8) : intIn(rng, 1, 4);
  const weekdayBump = intIn(rng, 1, 3);

  return Array.from({ length: 9 }, (_, day) => {
    const distance = Math.abs(day - peakDay);
    const decay = 1 / (1 + distance * 0.55);
    const weekday = day % 7 < 5 ? 1 + weekdayBump * 0.08 : 0.72;
    const noise = 0.85 + rng() * 0.3;
    if (cohort === 'tail' && rng() < 0.45) {
      return 0;
    }
    return Math.max(0, Math.round(peak * decay * weekday * noise));
  });
}

function enforceInvariants(counts: SimulatedAggregatedCounts): SimulatedAggregatedCounts {
  const weekFromDays =
    counts.day_current_count +
    counts.day_1_count +
    counts.day_2_count +
    counts.day_3_count +
    counts.day_4_count +
    counts.day_5_count +
    counts.day_6_count;
  const weekCurrent = Math.max(counts.week_current_count, weekFromDays, counts.day_current_count);
  const monthCurrent = Math.max(
    counts.month_current_count,
    weekCurrent + counts.week_1_count + counts.week_2_count + counts.week_3_count
  );
  const allTime = Math.max(
    counts.all_time_count,
    monthCurrent + counts.month_1_count,
    weekCurrent
  );

  return {
    ...counts,
    all_time_count: allTime,
    month_current_count: monthCurrent,
    week_current_count: weekCurrent,
  };
}

export function buildSimulatedChannelAggregatedCounts(input: {
  entityId: number;
  rank: number;
  total: number;
}): SimulatedAggregatedCounts {
  const rng = mulberry32(hash32(input.entityId * 17 + input.rank * 13 + 101));
  const cohort = assignSimulatedStatsCohort(input.rank, input.total, input.entityId);
  const allTimeRange = cohortAllTimeRange(cohort);
  const dayRange = cohortDayPeakRange(cohort);
  const zipf = zipfWeight(input.rank);
  const allTime = Math.round(intIn(rng, allTimeRange.min, allTimeRange.max) * (0.55 + zipf));
  const dayPeak = intIn(rng, dayRange.min, dayRange.max);
  const days = daySeries(cohort, dayPeak, rng);

  const priorWeekScale = cohort === 'rising' ? 0.55 : cohort === 'fading' ? 1.15 : 0.9;
  const weekCurrent = Math.round(
    (days[0] ?? 0) +
      (days[1] ?? 0) +
      (days[2] ?? 0) +
      (days[3] ?? 0) +
      (days[4] ?? 0) +
      (days[5] ?? 0) +
      (days[6] ?? 0)
  );
  const week1 = Math.max(0, Math.round(weekCurrent * priorWeekScale * (0.7 + rng() * 0.35)));
  const week2 = Math.max(0, Math.round(week1 * (0.65 + rng() * 0.3)));
  const week3 = Math.max(0, Math.round(week2 * (0.65 + rng() * 0.3)));
  const week4 = Math.max(0, Math.round(week3 * (0.6 + rng() * 0.3)));
  const monthCurrent = weekCurrent + week1 + week2 + week3;
  const month1 = Math.max(monthCurrent, Math.round(allTime * (cohort === 'rising' ? 0.25 : 0.4)));

  return enforceInvariants({
    all_time_count: Math.max(allTime, 1),
    day_1_count: days[1] ?? 0,
    day_2_count: days[2] ?? 0,
    day_3_count: days[3] ?? 0,
    day_4_count: days[4] ?? 0,
    day_5_count: days[5] ?? 0,
    day_6_count: days[6] ?? 0,
    day_7_count: days[7] ?? 0,
    day_8_count: days[8] ?? 0,
    day_current_count: days[0] ?? 0,
    month_1_count: month1,
    month_current_count: monthCurrent,
    week_1_count: week1,
    week_2_count: week2,
    week_3_count: week3,
    week_4_count: week4,
    week_current_count: weekCurrent,
  });
}

export function buildSimulatedItemAggregatedCounts(input: {
  channelCounts: SimulatedAggregatedCounts;
  entityId: number;
  itemCount: number;
  itemIndex: number;
}): SimulatedAggregatedCounts {
  const rng = mulberry32(hash32(input.entityId * 41 + input.itemIndex * 19 + 3));
  const newestShare =
    input.itemIndex === 0 ? 0.38 : input.itemIndex === 1 ? 0.22 : input.itemIndex === 2 ? 0.12 : 0;
  const longTailShare =
    newestShare === 0 ? 0.28 / Math.max(input.itemCount - 3, 1) : newestShare;
  const viral = input.itemCount > 4 && hash32(input.entityId) % Math.max(input.itemCount, 1) === input.itemIndex;
  const allTimeShare = viral
    ? 0.22
    : newestShare === 0
      ? 0.08 + (input.itemIndex / Math.max(input.itemCount, 1)) * 0.12
      : 0.04;

  const scaleDay = viral ? 0.18 : longTailShare;
  const scaleWeek = viral ? 0.2 : longTailShare;
  const scaleMonth = viral ? 0.2 : Math.max(longTailShare, allTimeShare * 0.6);
  const scaleAllTime = Math.min(0.35, allTimeShare);

  const scaled: SimulatedAggregatedCounts = {
    all_time_count: Math.max(1, Math.round(input.channelCounts.all_time_count * scaleAllTime)),
    day_1_count: Math.round(input.channelCounts.day_1_count * scaleDay),
    day_2_count: Math.round(input.channelCounts.day_2_count * scaleDay),
    day_3_count: Math.round(input.channelCounts.day_3_count * scaleDay),
    day_4_count: Math.round(input.channelCounts.day_4_count * scaleDay),
    day_5_count: Math.round(input.channelCounts.day_5_count * scaleDay),
    day_6_count: Math.round(input.channelCounts.day_6_count * scaleDay),
    day_7_count: Math.round(input.channelCounts.day_7_count * scaleDay),
    day_8_count: Math.round(input.channelCounts.day_8_count * scaleDay),
    day_current_count: Math.round(input.channelCounts.day_current_count * scaleDay),
    month_1_count: Math.round(input.channelCounts.month_1_count * scaleMonth),
    month_current_count: Math.round(input.channelCounts.month_current_count * scaleMonth),
    week_1_count: Math.round(input.channelCounts.week_1_count * scaleWeek),
    week_2_count: Math.round(input.channelCounts.week_2_count * scaleWeek),
    week_3_count: Math.round(input.channelCounts.week_3_count * scaleWeek),
    week_4_count: Math.round(input.channelCounts.week_4_count * scaleWeek),
    week_current_count: Math.round(input.channelCounts.week_current_count * scaleWeek),
  };

  const jitter = 0.9 + rng() * 0.2;
  const jittered: SimulatedAggregatedCounts = {
    all_time_count: Math.max(1, Math.round(scaled.all_time_count * jitter)),
    day_1_count: Math.round(scaled.day_1_count * jitter),
    day_2_count: Math.round(scaled.day_2_count * jitter),
    day_3_count: Math.round(scaled.day_3_count * jitter),
    day_4_count: Math.round(scaled.day_4_count * jitter),
    day_5_count: Math.round(scaled.day_5_count * jitter),
    day_6_count: Math.round(scaled.day_6_count * jitter),
    day_7_count: Math.round(scaled.day_7_count * jitter),
    day_8_count: Math.round(scaled.day_8_count * jitter),
    day_current_count: Math.round(scaled.day_current_count * jitter),
    month_1_count: Math.round(scaled.month_1_count * jitter),
    month_current_count: Math.round(scaled.month_current_count * jitter),
    week_1_count: Math.round(scaled.week_1_count * jitter),
    week_2_count: Math.round(scaled.week_2_count * jitter),
    week_3_count: Math.round(scaled.week_3_count * jitter),
    week_4_count: Math.round(scaled.week_4_count * jitter),
    week_current_count: Math.round(scaled.week_current_count * jitter),
  };

  const bounded = enforceInvariants(jittered);
  return {
    ...bounded,
    all_time_count: Math.min(bounded.all_time_count, input.channelCounts.all_time_count),
    month_current_count: Math.min(bounded.month_current_count, input.channelCounts.month_current_count),
    week_current_count: Math.min(bounded.week_current_count, input.channelCounts.week_current_count),
  };
}
