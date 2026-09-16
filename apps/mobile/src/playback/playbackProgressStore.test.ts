import { describe, expect, it } from 'vitest';

import {
  getPlaybackPositionClockSeconds,
  getPlaybackProgressRatio,
  getPlaybackProgressSnapshot,
  resetPlaybackProgress,
  setPlaybackProgress,
  subscribePlaybackPositionClock,
} from './playbackProgressStore';

describe('playbackProgressStore', () => {
  it('stores position and duration', () => {
    resetPlaybackProgress();
    setPlaybackProgress({ durationSeconds: 100, positionSeconds: 12.4 });
    expect(getPlaybackProgressSnapshot()).toEqual({
      durationSeconds: 100,
      positionSeconds: 12.4,
    });
    expect(getPlaybackProgressRatio()).toBeCloseTo(0.124);
    expect(getPlaybackPositionClockSeconds()).toBe(12);
  });

  it('notifies the clock subscriber only when the whole second changes', () => {
    resetPlaybackProgress();
    let clockTicks = 0;
    const unsubscribe = subscribePlaybackPositionClock(() => {
      clockTicks += 1;
    });
    setPlaybackProgress({ durationSeconds: 60, positionSeconds: 1.1 });
    setPlaybackProgress({ durationSeconds: 60, positionSeconds: 1.9 });
    expect(clockTicks).toBe(1);
    setPlaybackProgress({ durationSeconds: 60, positionSeconds: 2.0 });
    expect(clockTicks).toBe(2);
    unsubscribe();
  });
});
