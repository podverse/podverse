import { describe, expect, it } from 'vitest';

import {
  assignSimulatedStatsCohort,
  buildSimulatedChannelAggregatedCounts,
  buildSimulatedItemAggregatedCounts,
} from './simulatedAggregatedStats.js';

function expectInvariants(counts: ReturnType<typeof buildSimulatedChannelAggregatedCounts>) {
  expect(counts.week_current_count).toBeGreaterThanOrEqual(counts.day_current_count);
  expect(counts.month_current_count).toBeGreaterThanOrEqual(counts.week_current_count);
  expect(counts.all_time_count).toBeGreaterThanOrEqual(counts.month_current_count);
  expect(counts.all_time_count).toBeGreaterThan(0);
}

describe('simulated aggregated stats', () => {
  it('assigns staggered cohorts across a ranked set', () => {
    const cohorts = Array.from({ length: 20 }, (_, rank) =>
      assignSimulatedStatsCohort(rank, 20, 100 + rank)
    );

    expect(new Set(cohorts).size).toBeGreaterThan(1);
    expect(cohorts[0]).toBe('headliner');
    expect(cohorts[19]).toBe('tail');
  });

  it('is deterministic for the same entity id and rank', () => {
    const a = buildSimulatedChannelAggregatedCounts({ entityId: 42, rank: 2, total: 10 });
    const b = buildSimulatedChannelAggregatedCounts({ entityId: 42, rank: 2, total: 10 });
    expect(a).toEqual(b);
  });

  it('keeps range windows internally consistent', () => {
    for (let rank = 0; rank < 12; rank += 1) {
      expectInvariants(buildSimulatedChannelAggregatedCounts({ entityId: 7 + rank, rank, total: 12 }));
    }
  });

  it('makes day / week / all-time disagree across a set', () => {
    const rows = Array.from({ length: 12 }, (_, rank) =>
      buildSimulatedChannelAggregatedCounts({ entityId: 200 + rank, rank, total: 12 })
    );
    const byDay = rows.map((row) => row.day_current_count).join(',');
    const byWeek = rows.map((row) => row.week_current_count).join(',');
    const byAllTime = rows.map((row) => row.all_time_count).join(',');

    expect(byDay === byWeek && byWeek === byAllTime).toBe(false);
  });

  it('keeps item counts at or below the parent channel', () => {
    const channel = buildSimulatedChannelAggregatedCounts({ entityId: 9, rank: 0, total: 4 });
    const item = buildSimulatedItemAggregatedCounts({
      channelCounts: channel,
      entityId: 900,
      itemCount: 8,
      itemIndex: 0,
    });

    expectInvariants(item);
    expect(item.all_time_count).toBeLessThanOrEqual(channel.all_time_count);
    expect(item.week_current_count).toBeLessThanOrEqual(channel.week_current_count);
  });
});
