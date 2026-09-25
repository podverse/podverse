import { describe, expect, it, vi } from 'vitest';

import {
  getPlaybackDurationSeconds,
  getPlaybackPositionClockSeconds,
  getPlaybackProgressRatio,
  getPlaybackProgressSnapshot,
  resetPlaybackProgress,
  setPlaybackProgress,
  setPlaybackProgressPlaying,
  subscribePlaybackDuration,
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

  it('notifies the duration subscriber only when duration changes', () => {
    resetPlaybackProgress();
    let durationTicks = 0;
    const unsubscribe = subscribePlaybackDuration(() => {
      durationTicks += 1;
    });
    setPlaybackProgress({ durationSeconds: 60, positionSeconds: 1 });
    expect(getPlaybackDurationSeconds()).toBe(60);
    expect(durationTicks).toBe(1);
    setPlaybackProgress({ durationSeconds: 60, positionSeconds: 12 });
    expect(durationTicks).toBe(1);
    setPlaybackProgress({ durationSeconds: 90, positionSeconds: 12 });
    expect(durationTicks).toBe(2);
    unsubscribe();
  });

  it('advances the playhead once per second while playing even without native samples', () => {
    resetPlaybackProgress();
    vi.useFakeTimers();
    setPlaybackProgress({ durationSeconds: 120, positionSeconds: 10 });
    setPlaybackProgressPlaying(true);
    vi.advanceTimersByTime(1000);
    expect(getPlaybackPositionClockSeconds()).toBe(11);
    expect(getPlaybackProgressSnapshot().positionSeconds).toBeGreaterThan(10);
    setPlaybackProgressPlaying(false);
    const paused = getPlaybackProgressSnapshot().positionSeconds;
    vi.advanceTimersByTime(2000);
    expect(getPlaybackProgressSnapshot().positionSeconds).toBe(paused);
    vi.useRealTimers();
    resetPlaybackProgress();
  });
});
