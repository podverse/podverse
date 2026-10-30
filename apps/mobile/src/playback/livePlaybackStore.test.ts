import { beforeEach, describe, expect, it } from 'vitest';

import {
  getLivePlaybackCanRewind,
  getLivePlaybackDisplay,
  getLivePlaybackHasPlayed,
  getLivePlaybackWindow,
  markLivePlaybackPlayed,
  resetLivePlayback,
  setLivePlaybackSample,
  setLivePlaybackWindow,
  subscribeLivePlayback,
  subscribeLivePlaybackCanRewind,
  toLiveSeekWindow,
} from './livePlaybackStore';
import { resetPlaybackProgress, setPlaybackPositionSeconds } from './playbackProgressStore';

const liveWindow = { startSeconds: 100, liveEdgeSeconds: 400 };

describe('livePlaybackStore', () => {
  beforeEach(() => {
    resetLivePlayback();
    resetPlaybackProgress();
  });

  it('copies an engine window and passes null through', () => {
    expect(toLiveSeekWindow(null)).toBeNull();
    const copy = toLiveSeekWindow(liveWindow);
    expect(copy).toEqual(liveWindow);
    expect(copy).not.toBe(liveWindow);
  });

  it('reads a stream that has not played yet as at live', () => {
    setLivePlaybackSample({ engineWindow: liveWindow, isPlaying: false });
    const display = getLivePlaybackDisplay();
    expect(display.isAtLiveEdge).toBe(true);
    expect(display.behindLiveLabel).toBeNull();
    expect(display.canRewind).toBe(true);
    expect(display.windowFraction).toBeNull();
  });

  it('shows how far behind live a played stream is', () => {
    setPlaybackPositionSeconds(358);
    setLivePlaybackSample({ engineWindow: liveWindow, isPlaying: true });
    const display = getLivePlaybackDisplay();
    expect(display.isAtLiveEdge).toBe(false);
    expect(display.behindLiveSeconds).toBe(42);
    expect(display.behindLiveLabel).toBe('\u22120:42');
  });

  it('shows a played stream near the live edge as at live', () => {
    setPlaybackPositionSeconds(395);
    setLivePlaybackSample({ engineWindow: liveWindow, isPlaying: true });
    const display = getLivePlaybackDisplay();
    expect(display.isAtLiveEdge).toBe(true);
    expect(display.behindLiveLabel).toBeNull();
    expect(display.windowFraction).toBe(1);
  });

  it('measures the position once the stream is marked played', () => {
    setPlaybackPositionSeconds(358);
    setLivePlaybackSample({ engineWindow: liveWindow, isPlaying: false });
    expect(getLivePlaybackDisplay().isAtLiveEdge).toBe(true);
    markLivePlaybackPlayed();
    expect(getLivePlaybackDisplay().behindLiveSeconds).toBe(42);
  });

  it('keeps the played flag when the window is re-read while paused', () => {
    setPlaybackPositionSeconds(358);
    setLivePlaybackSample({ engineWindow: liveWindow, isPlaying: true });
    setLivePlaybackWindow({ startSeconds: 100, liveEdgeSeconds: 460 });
    expect(getLivePlaybackHasPlayed()).toBe(true);
    expect(getLivePlaybackDisplay().behindLiveSeconds).toBe(102);
  });

  it('returns the same display while nothing changes and skips repeat samples', () => {
    setPlaybackPositionSeconds(358);
    setLivePlaybackSample({ engineWindow: liveWindow, isPlaying: true });
    expect(getLivePlaybackDisplay()).toBe(getLivePlaybackDisplay());
    let notifications = 0;
    const unsubscribe = subscribeLivePlayback(() => {
      notifications += 1;
    });
    setLivePlaybackSample({ engineWindow: { ...liveWindow }, isPlaying: true });
    expect(notifications).toBe(0);
    unsubscribe();
  });

  it('offers rewind only for a window of at least 30 seconds', () => {
    expect(getLivePlaybackCanRewind()).toBe(false);
    setLivePlaybackWindow({ startSeconds: 0, liveEdgeSeconds: 20 });
    expect(getLivePlaybackCanRewind()).toBe(false);
    setLivePlaybackWindow(liveWindow);
    expect(getLivePlaybackCanRewind()).toBe(true);
  });

  it('notifies the rewind subscriber only when rewind appears or goes', () => {
    let notifications = 0;
    const unsubscribe = subscribeLivePlaybackCanRewind(() => {
      notifications += 1;
    });
    setLivePlaybackWindow(liveWindow);
    expect(notifications).toBe(1);
    setLivePlaybackWindow({ startSeconds: 110, liveEdgeSeconds: 410 });
    expect(notifications).toBe(1);
    unsubscribe();
  });

  it('drops the window and the played flag on reset', () => {
    setPlaybackPositionSeconds(358);
    setLivePlaybackSample({ engineWindow: liveWindow, isPlaying: true });
    resetLivePlayback();
    expect(getLivePlaybackWindow()).toBeNull();
    expect(getLivePlaybackHasPlayed()).toBe(false);
    expect(getLivePlaybackDisplay().isAtLiveEdge).toBe(true);
  });
});
