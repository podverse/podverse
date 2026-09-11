import { describe, expect, it, vi } from 'vitest';

import {
  fillTopPage,
  inferRankedCount,
  planTopPageFill,
  TOP_STATS_PAD_MAX_RANKED,
} from './topListFill.js';

describe('inferRankedCount', () => {
  it('infers from a first page or a short later page', () => {
    expect(inferRankedCount(0, 0)).toBe(0);
    expect(inferRankedCount(0, 1)).toBe(1);
    expect(inferRankedCount(60, 20)).toBe(80);
  });

  it('asks for a count when a later page is empty', () => {
    expect(inferRankedCount(60, 0)).toBeNull();
  });
});

describe('planTopPageFill', () => {
  it('keeps a full stats page on the stats path', () => {
    expect(planTopPageFill({ limit: 60, offset: 0, rankedCount: 80, statsPageLength: 60 })).toEqual(
      { mode: 'stats' }
    );
  });

  it('falls back to recent when nothing is ranked', () => {
    expect(planTopPageFill({ limit: 60, offset: 0, rankedCount: 0, statsPageLength: 0 })).toEqual({
      mode: 'recent',
    });
    expect(planTopPageFill({ limit: 60, offset: 60, rankedCount: 0, statsPageLength: 0 })).toEqual({
      mode: 'recent',
    });
  });

  it('pads a single ranked row on page 1', () => {
    expect(planTopPageFill({ limit: 60, offset: 0, rankedCount: 1, statsPageLength: 1 })).toEqual({
      mode: 'hybrid',
      padTake: 59,
      tailOffset: 0,
    });
  });

  it('continues the recent tail after a single ranked row', () => {
    expect(planTopPageFill({ limit: 60, offset: 60, rankedCount: 1, statsPageLength: 0 })).toEqual({
      mode: 'hybrid',
      padTake: 60,
      tailOffset: 59,
    });
  });

  it('pads the remainder after a short last stats page', () => {
    expect(
      planTopPageFill({ limit: 60, offset: 60, rankedCount: 80, statsPageLength: 20 })
    ).toEqual({ mode: 'hybrid', padTake: 40, tailOffset: 0 });
  });

  it('does not pad once ranked count exceeds the cap', () => {
    expect(
      planTopPageFill({
        limit: 60,
        offset: 9960,
        padMaxRanked: TOP_STATS_PAD_MAX_RANKED,
        rankedCount: 10000,
        statsPageLength: 40,
      })
    ).toEqual({ mode: 'stats' });
  });
});

describe('fillTopPage', () => {
  it('returns stats only when the page is full', async () => {
    const loadRecent = vi.fn(async () => ['r']);
    const rows = await fillTopPage({
      countRanked: async () => 200,
      limit: 2,
      loadRankedIds: async () => [1, 2],
      loadRecent,
      loadStatsPage: async () => ['a', 'b'],
      offset: 0,
    });

    expect(rows).toEqual(['a', 'b']);
    expect(loadRecent).not.toHaveBeenCalled();
  });

  it('uses recent when ranked count is zero', async () => {
    const rows = await fillTopPage({
      countRanked: async () => 0,
      limit: 2,
      loadRankedIds: async () => [],
      loadRecent: async (skip, take, excludeIds) => {
        expect(skip).toBe(0);
        expect(take).toBe(2);
        expect(excludeIds).toEqual([]);
        return ['r1', 'r2'];
      },
      loadStatsPage: async () => [],
      offset: 0,
    });

    expect(rows).toEqual(['r1', 'r2']);
  });

  it('counts ranked rows only when a later page is empty', async () => {
    const countRanked = vi.fn(async () => 1);
    const rows = await fillTopPage({
      countRanked,
      limit: 2,
      loadRankedIds: async () => [9],
      loadRecent: async (skip, take, excludeIds) => {
        expect(skip).toBe(1);
        expect(take).toBe(2);
        expect(excludeIds).toEqual([9]);
        return ['r2', 'r3'];
      },
      loadStatsPage: async () => [],
      offset: 2,
    });

    expect(countRanked).toHaveBeenCalledTimes(1);
    expect(rows).toEqual(['r2', 'r3']);
  });

  it('concatenates ranked rows then the recent tail', async () => {
    const countRanked = vi.fn(async () => 99);
    const rows = await fillTopPage({
      countRanked,
      limit: 3,
      loadRankedIds: async () => [1],
      loadRecent: async () => ['r1', 'r2'],
      loadStatsPage: async () => ['s1'],
      offset: 0,
    });

    expect(countRanked).not.toHaveBeenCalled();
    expect(rows).toEqual(['s1', 'r1', 'r2']);
  });
});
