import { describe, expect, it } from 'vitest';

import { trimPlaybackPositionNearEnd } from './playbackResumeNearEnd';

describe('trimPlaybackPositionNearEnd', () => {
  it('returns 0 when within 5 seconds of duration', () => {
    expect(trimPlaybackPositionNearEnd(95, 100)).toBe(0);
    expect(trimPlaybackPositionNearEnd(100, 100)).toBe(0);
  });

  it('returns position when clearly before the tail window', () => {
    expect(trimPlaybackPositionNearEnd(50, 100)).toBe(50);
    expect(trimPlaybackPositionNearEnd(94, 100)).toBe(94);
  });

  it('does not clamp when duration is unknown or zero', () => {
    expect(trimPlaybackPositionNearEnd(95, 0)).toBe(95);
    expect(trimPlaybackPositionNearEnd(95, -1)).toBe(95);
  });
});
