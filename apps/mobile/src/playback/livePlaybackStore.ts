/**
 * The loaded livestream's seekable window, as the native engine reports it, and whether that
 * stream has played since it loaded. The provider writes the window from each `progress` sample
 * and, while the stream is paused, from `getCurrentSource()`. A stream that has not played yet
 * reads as at live, so a paused restore or adopt does not show a large behind time from position 0.
 */

import { useSyncExternalStore } from 'react';

import type { LivePlaybackDisplay, LiveSeekWindow } from '@podverse/playback-core/livePlayback';
import {
  isRewindableLiveWindow,
  resolveLivePlaybackDisplay,
} from '@podverse/playback-core/livePlayback';

import type { MediaEngineLiveWindow } from '../../modules/podverse-media-engine';
import {
  getPlaybackPositionClockSeconds,
  subscribePlaybackPositionClock,
} from './playbackProgressStore';

type Listener = () => void;

let liveWindow: LiveSeekWindow | null = null;
let hasPlayed = false;
const listeners = new Set<Listener>();

let displayPositionSeconds: number | null = null;
let displayLiveWindow: LiveSeekWindow | null = null;
let displayHasPlayed = false;
let display: LivePlaybackDisplay = resolveLivePlaybackDisplay({
  positionSeconds: null,
  window: null,
});

const emit = (): void => {
  listeners.forEach((listener) => {
    listener();
  });
};

/** The engine's window as the shared live rules read it; `null` passes through. */
export const toLiveSeekWindow = (
  engineWindow: MediaEngineLiveWindow | null
): LiveSeekWindow | null => {
  if (engineWindow === null) {
    return null;
  }
  return {
    startSeconds: engineWindow.startSeconds,
    liveEdgeSeconds: engineWindow.liveEdgeSeconds,
  };
};

const isSameLiveWindow = (a: LiveSeekWindow | null, b: LiveSeekWindow | null): boolean => {
  if (a === null || b === null) {
    return a === b;
  }
  return a.startSeconds === b.startSeconds && a.liveEdgeSeconds === b.liveEdgeSeconds;
};

/** Replaces the held window when the engine's differs; true when it changed. */
const replaceLiveWindow = (engineWindow: MediaEngineLiveWindow | null): boolean => {
  const nextLiveWindow = toLiveSeekWindow(engineWindow);
  if (isSameLiveWindow(liveWindow, nextLiveWindow)) {
    return false;
  }
  liveWindow = nextLiveWindow;
  return true;
};

/** The loaded livestream's seekable window, or `null` when it holds none or has not reported. */
export const getLivePlaybackWindow = (): LiveSeekWindow | null => liveWindow;

/** True once the loaded livestream has played since it loaded. */
export const getLivePlaybackHasPlayed = (): boolean => hasPlayed;

/** A `progress` sample: the window it carried, and whether the player is playing. */
export const setLivePlaybackSample = (params: {
  engineWindow: MediaEngineLiveWindow | null;
  isPlaying: boolean;
}): void => {
  const windowChanged = replaceLiveWindow(params.engineWindow);
  const playedChanged = params.isPlaying && !hasPlayed;
  if (playedChanged) {
    hasPlayed = true;
  }
  if (windowChanged || playedChanged) {
    emit();
  }
};

/** A window read while paused; leaves the has-played flag alone. */
export const setLivePlaybackWindow = (engineWindow: MediaEngineLiveWindow | null): void => {
  if (replaceLiveWindow(engineWindow)) {
    emit();
  }
};

/** Marks the loaded livestream as played, so the display measures its position. */
export const markLivePlaybackPlayed = (): void => {
  if (hasPlayed) {
    return;
  }
  hasPlayed = true;
  emit();
};

/** Drops the window and the has-played flag; called on every load and on clear. */
export const resetLivePlayback = (): void => {
  if (liveWindow === null && !hasPlayed) {
    return;
  }
  liveWindow = null;
  hasPlayed = false;
  emit();
};

/** Notifies when the window or the has-played flag changes. */
export const subscribeLivePlayback = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Live-edge flag, behind-live label, and scrubber fraction; the same object while unchanged. */
export const getLivePlaybackDisplay = (): LivePlaybackDisplay => {
  const positionSeconds = hasPlayed ? getPlaybackPositionClockSeconds() : null;
  if (
    positionSeconds === displayPositionSeconds &&
    liveWindow === displayLiveWindow &&
    hasPlayed === displayHasPlayed
  ) {
    return display;
  }
  displayPositionSeconds = positionSeconds;
  displayLiveWindow = liveWindow;
  displayHasPlayed = hasPlayed;
  display = resolveLivePlaybackDisplay({ positionSeconds, window: liveWindow });
  return display;
};

/** Notifies on a window or has-played change, and at most once a second as the playhead moves. */
export const subscribeLivePlaybackDisplay = (listener: Listener): (() => void) => {
  const unsubscribeLive = subscribeLivePlayback(listener);
  const unsubscribeClock = subscribePlaybackPositionClock(listener);
  return () => {
    unsubscribeLive();
    unsubscribeClock();
  };
};

/** True when the held window is long enough to offer a scrubber and skips. */
export const getLivePlaybackCanRewind = (): boolean => isRewindableLiveWindow(liveWindow);

/** Notifies only when the scrubber and skips appear or go, not on every window move. */
export const subscribeLivePlaybackCanRewind = (listener: Listener): (() => void) => {
  let lastCanRewind = getLivePlaybackCanRewind();
  return subscribeLivePlayback(() => {
    const nextCanRewind = getLivePlaybackCanRewind();
    if (nextCanRewind !== lastCanRewind) {
      lastCanRewind = nextCanRewind;
      listener();
    }
  });
};

/** How far behind live the loaded livestream is, re-rendering at most once a second. */
export function useLivePlaybackDisplay(): LivePlaybackDisplay {
  return useSyncExternalStore(
    subscribeLivePlaybackDisplay,
    getLivePlaybackDisplay,
    getLivePlaybackDisplay
  );
}

/** The loaded livestream's seekable window, re-rendering whenever it moves. */
export function useLivePlaybackWindow(): LiveSeekWindow | null {
  return useSyncExternalStore(subscribeLivePlayback, getLivePlaybackWindow, getLivePlaybackWindow);
}

/** Whether the loaded livestream offers rewind, re-rendering only when that flips. */
export function useLivePlaybackCanRewind(): boolean {
  return useSyncExternalStore(
    subscribeLivePlaybackCanRewind,
    getLivePlaybackCanRewind,
    getLivePlaybackCanRewind
  );
}
