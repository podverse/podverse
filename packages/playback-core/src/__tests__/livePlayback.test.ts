import { describe, expect, it } from 'vitest';

import {
  clampLiveSeekSeconds,
  formatBehindLiveLabel,
  getBehindLiveSeconds,
  isRewindableLiveWindow,
  liveSeekSecondsAtFraction,
  resolveGoToLive,
  resolveLivePlaybackDisplay,
  resolveLiveResume,
} from '../livePlayback.js';

const window = { startSeconds: 100, liveEdgeSeconds: 400 };

describe('isRewindableLiveWindow', () => {
  it('returns false when the window is null', () => {
    expect(isRewindableLiveWindow(null)).toBe(false);
  });

  it('returns false for a 29 second window', () => {
    expect(isRewindableLiveWindow({ startSeconds: 0, liveEdgeSeconds: 29 })).toBe(false);
  });

  it('returns true for a window of exactly 30 seconds', () => {
    expect(isRewindableLiveWindow({ startSeconds: 0, liveEdgeSeconds: 30 })).toBe(true);
  });
});

describe('getBehindLiveSeconds', () => {
  it('returns 0 when the window is null', () => {
    expect(getBehindLiveSeconds({ positionSeconds: 10, window: null })).toBe(0);
  });

  it('returns 0 when the position is null', () => {
    expect(getBehindLiveSeconds({ positionSeconds: null, window })).toBe(0);
  });

  it('returns 0 when the position is not finite', () => {
    expect(getBehindLiveSeconds({ positionSeconds: Number.NaN, window })).toBe(0);
  });

  it('floors the distance behind the live edge', () => {
    expect(getBehindLiveSeconds({ positionSeconds: 358.4, window })).toBe(41);
  });

  it('returns 0 when the position is past the live edge', () => {
    expect(getBehindLiveSeconds({ positionSeconds: 410, window })).toBe(0);
  });
});

describe('formatBehindLiveLabel', () => {
  it('prefixes a minutes-and-seconds clock with a minus sign', () => {
    expect(formatBehindLiveLabel(42)).toBe('\u22120:42');
  });

  it('prefixes an hours clock with a minus sign', () => {
    expect(formatBehindLiveLabel(3725)).toBe('\u22121:02:05');
  });
});

describe('resolveLivePlaybackDisplay', () => {
  it('treats a position 5 seconds behind the edge as live', () => {
    expect(resolveLivePlaybackDisplay({ positionSeconds: 395, window })).toEqual({
      isAtLiveEdge: true,
      behindLiveSeconds: 0,
      behindLiveLabel: null,
      canRewind: true,
      windowFraction: 1,
    });
  });

  it('treats a position exactly 10 seconds behind the edge as live', () => {
    expect(resolveLivePlaybackDisplay({ positionSeconds: 390, window })).toEqual({
      isAtLiveEdge: true,
      behindLiveSeconds: 0,
      behindLiveLabel: null,
      canRewind: true,
      windowFraction: 1,
    });
  });

  it('shows the behind-live clock and scrubber fraction when 42 seconds behind', () => {
    expect(resolveLivePlaybackDisplay({ positionSeconds: 358, window })).toEqual({
      isAtLiveEdge: false,
      behindLiveSeconds: 42,
      behindLiveLabel: '\u22120:42',
      canRewind: true,
      windowFraction: (358 - 100) / 300,
    });
  });

  it('reads a missing window as live with no rewind', () => {
    expect(resolveLivePlaybackDisplay({ positionSeconds: 50, window: null })).toEqual({
      isAtLiveEdge: true,
      behindLiveSeconds: 0,
      behindLiveLabel: null,
      canRewind: false,
      windowFraction: null,
    });
  });

  it('shows the behind-live clock without a scrubber for a short window', () => {
    expect(
      resolveLivePlaybackDisplay({
        positionSeconds: 5,
        window: { startSeconds: 0, liveEdgeSeconds: 20 },
      })
    ).toEqual({
      isAtLiveEdge: false,
      behindLiveSeconds: 15,
      behindLiveLabel: '\u22120:15',
      canRewind: false,
      windowFraction: null,
    });
  });
});

describe('clampLiveSeekSeconds', () => {
  it('lifts a target inside the start margin up to the margin', () => {
    expect(clampLiveSeekSeconds(window, 50)).toBe(106);
  });

  it('keeps a target inside the window', () => {
    expect(clampLiveSeekSeconds(window, 250)).toBe(250);
  });

  it('caps a target past the live edge', () => {
    expect(clampLiveSeekSeconds(window, 500)).toBe(400);
  });

  it('returns the live edge when the start margin passes the edge', () => {
    const shortWindow = { startSeconds: 0, liveEdgeSeconds: 4 };
    expect(clampLiveSeekSeconds(shortWindow, 0)).toBe(4);
    expect(clampLiveSeekSeconds(shortWindow, 100)).toBe(4);
  });
});

describe('liveSeekSecondsAtFraction', () => {
  it('clamps the start of the window to the start margin', () => {
    expect(liveSeekSecondsAtFraction(window, 0)).toBe(106);
  });

  it('seeks to the middle of the window', () => {
    expect(liveSeekSecondsAtFraction(window, 0.5)).toBe(250);
  });

  it('seeks to the live edge at fraction 1', () => {
    expect(liveSeekSecondsAtFraction(window, 1)).toBe(400);
  });

  it('clamps a fraction below 0 to the start margin', () => {
    expect(liveSeekSecondsAtFraction(window, -1)).toBe(106);
  });

  it('clamps a fraction above 1 to the live edge', () => {
    expect(liveSeekSecondsAtFraction(window, 2)).toBe(400);
  });
});

describe('resolveLiveResume', () => {
  it('reconnects when the window is null', () => {
    expect(resolveLiveResume({ positionSeconds: 200, window: null })).toEqual({
      action: 'reconnect',
    });
  });

  it('resumes in place when the paused position is inside the window', () => {
    expect(resolveLiveResume({ positionSeconds: 200, window })).toEqual({
      action: 'resume-in-place',
    });
  });

  it('resumes in place when the paused position is exactly the start margin', () => {
    expect(resolveLiveResume({ positionSeconds: 106, window })).toEqual({
      action: 'resume-in-place',
    });
  });

  it('seeks to the live edge when the paused position is inside the start margin', () => {
    expect(resolveLiveResume({ positionSeconds: 105, window })).toEqual({
      action: 'seek',
      seconds: 400,
    });
  });

  it('seeks to the live edge when the position is null', () => {
    expect(resolveLiveResume({ positionSeconds: null, window })).toEqual({
      action: 'seek',
      seconds: 400,
    });
  });

  it('resumes in place on a short window when the paused moment is still held', () => {
    expect(
      resolveLiveResume({
        positionSeconds: 10,
        window: { startSeconds: 0, liveEdgeSeconds: 20 },
      })
    ).toEqual({ action: 'resume-in-place' });
  });
});

describe('resolveGoToLive', () => {
  it('reconnects when the window is null', () => {
    expect(resolveGoToLive(null)).toEqual({ action: 'reconnect' });
  });

  it('seeks to the live edge when the window is present', () => {
    expect(resolveGoToLive(window)).toEqual({ action: 'seek', seconds: 400 });
  });
});
