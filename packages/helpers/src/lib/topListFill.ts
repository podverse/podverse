export const TOP_STATS_PAD_MAX_RANKED = 500;

export type TopPageFillPlan =
  | { mode: 'stats' }
  | { mode: 'recent' }
  | { mode: 'hybrid'; padTake: number; tailOffset: number };

export function planTopPageFill(input: {
  limit: number;
  offset: number;
  padMaxRanked?: number;
  rankedCount: number;
  statsPageLength: number;
}): TopPageFillPlan {
  const padMaxRanked = input.padMaxRanked ?? TOP_STATS_PAD_MAX_RANKED;
  const { limit, offset, rankedCount, statsPageLength } = input;

  if (statsPageLength >= limit) {
    return { mode: 'stats' };
  }

  if (rankedCount === 0) {
    return { mode: 'recent' };
  }

  if (rankedCount > padMaxRanked) {
    return { mode: 'stats' };
  }

  return {
    mode: 'hybrid',
    padTake: limit - statsPageLength,
    tailOffset: Math.max(0, offset - rankedCount),
  };
}

export function inferRankedCount(offset: number, statsPageLength: number): number | null {
  if (offset === 0 || statsPageLength > 0) {
    return offset + statsPageLength;
  }

  return null;
}

export async function fillTopPage<T>(args: {
  countRanked: () => Promise<number>;
  limit: number;
  loadRankedIds: () => Promise<number[]>;
  loadRecent: (skip: number, take: number, excludeIds: number[]) => Promise<T[]>;
  loadStatsPage: () => Promise<T[]>;
  offset: number;
  padMaxRanked?: number;
}): Promise<T[]> {
  const statsPage = await args.loadStatsPage();
  if (statsPage.length >= args.limit) {
    return statsPage;
  }

  const inferred = inferRankedCount(args.offset, statsPage.length);
  const rankedCount = inferred === null ? await args.countRanked() : inferred;
  const plan = planTopPageFill({
    limit: args.limit,
    offset: args.offset,
    padMaxRanked: args.padMaxRanked,
    rankedCount,
    statsPageLength: statsPage.length,
  });

  if (plan.mode === 'stats') {
    return statsPage;
  }

  if (plan.mode === 'recent') {
    return args.loadRecent(args.offset, args.limit, []);
  }

  const excludeIds = await args.loadRankedIds();
  const pad = await args.loadRecent(plan.tailOffset, plan.padTake, excludeIds);
  return [...statsPage, ...pad];
}
