import { describe, expect, it } from 'vitest';

import { LiveItemStatusEnum } from '../dtos/liveItem/liveItem.js';
import {
  LIVE_ITEM_ENDED_VISIBILITY_MAX_AGE_MS,
  getEndedLiveItemVisibilityCutoff,
  isLiveItemEndedAndStale,
} from './liveItemVisibility.js';

const NOW = new Date('2026-06-13T12:00:00.000Z');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('LIVE_ITEM_ENDED_VISIBILITY_MAX_AGE_MS', () => {
  it('is exactly one day in milliseconds', () => {
    expect(LIVE_ITEM_ENDED_VISIBILITY_MAX_AGE_MS).toBe(ONE_DAY_MS);
  });
});

describe('getEndedLiveItemVisibilityCutoff', () => {
  it('returns now minus one day', () => {
    const cutoff = getEndedLiveItemVisibilityCutoff(NOW);
    expect(cutoff.getTime()).toBe(NOW.getTime() - ONE_DAY_MS);
  });
});

describe('isLiveItemEndedAndStale', () => {
  it('returns false for non-ended statuses regardless of age', () => {
    const longAgo = new Date(NOW.getTime() - 10 * ONE_DAY_MS).toISOString();
    expect(
      isLiveItemEndedAndStale(
        { live_item_status_id: LiveItemStatusEnum.Live, start_time: longAgo, end_time: longAgo },
        NOW
      )
    ).toBe(false);
    expect(
      isLiveItemEndedAndStale(
        { live_item_status_id: LiveItemStatusEnum.Pending, start_time: longAgo, end_time: longAgo },
        NOW
      )
    ).toBe(false);
  });

  it('returns true when an ended item ended more than a day ago', () => {
    const endTime = new Date(NOW.getTime() - ONE_DAY_MS - 1).toISOString();
    expect(
      isLiveItemEndedAndStale(
        { live_item_status_id: LiveItemStatusEnum.Ended, start_time: endTime, end_time: endTime },
        NOW
      )
    ).toBe(true);
  });

  it('returns false at exactly the one-day boundary (cutoff is inclusive of keep)', () => {
    const endTime = new Date(NOW.getTime() - ONE_DAY_MS).toISOString();
    expect(
      isLiveItemEndedAndStale(
        { live_item_status_id: LiveItemStatusEnum.Ended, start_time: endTime, end_time: endTime },
        NOW
      )
    ).toBe(false);
  });

  it('returns false when an ended item ended within the last day', () => {
    const endTime = new Date(NOW.getTime() - 60 * 1000).toISOString();
    expect(
      isLiveItemEndedAndStale(
        { live_item_status_id: LiveItemStatusEnum.Ended, start_time: endTime, end_time: endTime },
        NOW
      )
    ).toBe(false);
  });

  it('falls back to start_time when end_time is null', () => {
    const staleStart = new Date(NOW.getTime() - 2 * ONE_DAY_MS).toISOString();
    expect(
      isLiveItemEndedAndStale(
        { live_item_status_id: LiveItemStatusEnum.Ended, start_time: staleStart, end_time: null },
        NOW
      )
    ).toBe(true);
  });

  it('falls back to start_time when end_time is undefined', () => {
    const freshStart = new Date(NOW.getTime() - 60 * 1000).toISOString();
    expect(
      isLiveItemEndedAndStale(
        { live_item_status_id: LiveItemStatusEnum.Ended, start_time: freshStart },
        NOW
      )
    ).toBe(false);
  });

  it('accepts Date values for start_time and end_time', () => {
    const staleEnd = new Date(NOW.getTime() - 2 * ONE_DAY_MS);
    expect(
      isLiveItemEndedAndStale(
        { live_item_status_id: LiveItemStatusEnum.Ended, start_time: staleEnd, end_time: staleEnd },
        NOW
      )
    ).toBe(true);
  });
});
