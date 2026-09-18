import { describe, expect, it } from 'vitest';

import { resolveQueueAdvance } from '../resolveQueueAdvance.js';

describe('resolveQueueAdvance', () => {
  it('plays the next manual item when manual upcoming has items', () => {
    expect(
      resolveQueueAdvance({ hasAutoQueueNext: false, holdNowPlaying: false, upcomingManualCount: 1 })
    ).toEqual({
      kind: 'play-next-manual',
    });
  });

  it('prefers manual upcoming over auto-queue when both are available', () => {
    expect(
      resolveQueueAdvance({ hasAutoQueueNext: true, holdNowPlaying: false, upcomingManualCount: 3 })
    ).toEqual({
      kind: 'play-next-manual',
    });
  });

  it('advances the auto-queue when manual is empty but auto-queue has next', () => {
    expect(
      resolveQueueAdvance({ hasAutoQueueNext: true, holdNowPlaying: false, upcomingManualCount: 0 })
    ).toEqual({
      kind: 'advance-auto-queue',
    });
  });

  it('stops when both manual upcoming and auto-queue are exhausted', () => {
    expect(
      resolveQueueAdvance({ hasAutoQueueNext: false, holdNowPlaying: false, upcomingManualCount: 0 })
    ).toEqual({
      kind: 'stop',
    });
  });

  it('holds when holdNowPlaying is true and manual upcoming is non-empty', () => {
    expect(
      resolveQueueAdvance({ hasAutoQueueNext: false, holdNowPlaying: true, upcomingManualCount: 2 })
    ).toEqual({
      kind: 'hold',
    });
  });

  it('holds when holdNowPlaying is true and auto-queue has next', () => {
    expect(
      resolveQueueAdvance({ hasAutoQueueNext: true, holdNowPlaying: true, upcomingManualCount: 0 })
    ).toEqual({
      kind: 'hold',
    });
  });

  it('holds when holdNowPlaying is true and both other branches are available', () => {
    expect(
      resolveQueueAdvance({ hasAutoQueueNext: true, holdNowPlaying: true, upcomingManualCount: 2 })
    ).toEqual({
      kind: 'hold',
    });
  });
});
