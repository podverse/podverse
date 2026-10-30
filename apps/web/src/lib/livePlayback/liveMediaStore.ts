import type { MediaSourceDelivery } from '@podverse/helpers';
import type { LivePlaybackDisplay, LiveSeekWindow } from '@podverse/playback-core';
import {
  clampLiveSeekSeconds,
  isRewindableLiveWindow,
  liveSeekSecondsAtFraction,
  resolveGoToLive,
  resolveLivePlaybackDisplay,
  resolveLiveResume,
} from '@podverse/playback-core';

import { readManagedHlsLiveSyncPosition } from '../../hooks/mediaElementBridgeSurface';
import { readLiveSeekWindow } from './liveSeekWindow';

/** The live element a host plays. One is registered at a time. */
export type LiveMediaRegistration = {
  media: HTMLMediaElement;
  delivery: MediaSourceDelivery;
  /** Drop the connection and start the stream again at live, playing. */
  reconnect: () => void;
};

export type LiveMediaSnapshot = {
  /** A live element is registered. */
  attached: boolean;
  display: LivePlaybackDisplay;
};

/**
 * What a host does after `prepareResume`. `play`: call `play()`. `reconnecting`: the host was
 * asked for a fresh connection, which starts playing on its own, so it must not call `play()`.
 */
export type LiveResumeOutcome = 'play' | 'reconnecting';

export type LiveMediaStore = {
  /**
   * Track a live element in place of any earlier one. Returns the unregister function, which
   * drops the registration only while it is still the current one.
   */
  register: (registration: LiveMediaRegistration) => () => void;
  /** Stable between changes, for `useSyncExternalStore`. */
  getSnapshot: () => LiveMediaSnapshot;
  subscribe: (listener: () => void) => () => void;
  /** Re-read the element; notifies only when a displayed value changes. */
  refresh: () => void;
  /** The registered element's window, read now. Null when nothing is registered. */
  readWindow: () => LiveSeekWindow | null;
  /** Seek to the live edge, or reconnect when there is no window. Does not start playback. */
  goToLive: () => void;
  /** Seek inside a rewindable window, clamped. Does nothing on any other window. */
  seekTo: (seconds: number) => void;
  /** Seek to a fraction 0..1 across a rewindable window, clamped. */
  seekToFraction: (fraction: number) => void;
  /** Jump from the current position inside a rewindable window, clamped. */
  jumpBy: (deltaSeconds: number) => void;
  /**
   * Call right before `play()`. A registered element that played and then paused resumes in
   * place while the window still holds that moment, jumps to live when it does not, and
   * reconnects when the stream holds no window. Any other element passes through untouched.
   */
  prepareResume: (media: HTMLMediaElement) => LiveResumeOutcome;
};

const REFRESH_EVENTS = [
  'timeupdate',
  'progress',
  'durationchange',
  'seeked',
  'playing',
  'pause',
  'loadedmetadata',
] as const;

/** The window keeps moving while paused, when `timeupdate` stops. */
const REFRESH_INTERVAL_MS = 1000;

type ActiveRegistration = {
  registration: LiveMediaRegistration;
  /** Native HLS only: how far before the seekable end playback sat when it first joined live. */
  nativeJoinOffsetSeconds: number | null;
  joinOffsetChecked: boolean;
};

const DETACHED_SNAPSHOT: LiveMediaSnapshot = {
  attached: false,
  display: resolveLivePlaybackDisplay({ positionSeconds: null, window: null }),
};

/** A detached element can throw on `played`; that reads as not played. */
function hasPlayed(media: HTMLMediaElement): boolean {
  try {
    return media.played.length > 0;
  } catch {
    return false;
  }
}

function roundedFraction(fraction: number | null): number | null {
  return fraction === null ? null : Math.round(fraction * 1000) / 1000;
}

function isSameSnapshot(a: LiveMediaSnapshot, b: LiveMediaSnapshot): boolean {
  return (
    a.attached === b.attached &&
    a.display.isAtLiveEdge === b.display.isAtLiveEdge &&
    a.display.behindLiveSeconds === b.display.behindLiveSeconds &&
    a.display.behindLiveLabel === b.display.behindLiveLabel &&
    a.display.canRewind === b.display.canRewind &&
    roundedFraction(a.display.windowFraction) === roundedFraction(b.display.windowFraction)
  );
}

/**
 * Where the playing live element sits in its seekable window, readable with
 * `useSyncExternalStore`, and the go-to-live, seek, and resume actions on it.
 *
 * The window comes only from what the stream reports: HLS has one, progressive delivery never
 * does. An element that has not played yet reads as at live. Displayed values are whole seconds,
 * so a playing or paused element notifies about once a second.
 */
export function createLiveMediaStore(options?: {
  readLiveSyncPosition?: (media: HTMLMediaElement) => number | null;
  setInterval?: (fn: () => void, ms: number) => number;
  clearInterval?: (id: number) => void;
}): LiveMediaStore {
  const readLiveSyncPosition = options?.readLiveSyncPosition ?? readManagedHlsLiveSyncPosition;
  const setIntervalFn =
    options?.setInterval ?? ((fn: () => void, ms: number) => window.setInterval(fn, ms));
  const clearIntervalFn =
    options?.clearInterval ??
    ((id: number) => {
      window.clearInterval(id);
    });

  let active: ActiveRegistration | null = null;
  let releaseActive: (() => void) | null = null;
  let snapshot = DETACHED_SNAPSHOT;
  const listeners = new Set<() => void>();

  /** A detached element can throw on `seekable`; that reads as no window. */
  const readWindowOf = (entry: ActiveRegistration): LiveSeekWindow | null => {
    const { media, delivery } = entry.registration;
    try {
      return readLiveSeekWindow({
        delivery,
        seekable: media.seekable,
        liveSyncPositionSeconds: readLiveSyncPosition(media),
        nativeJoinOffsetSeconds: entry.nativeJoinOffsetSeconds,
      });
    } catch {
      return null;
    }
  };

  const buildSnapshot = (): LiveMediaSnapshot => {
    const entry = active;
    if (entry === null) {
      return DETACHED_SNAPSHOT;
    }
    const { media } = entry.registration;
    return {
      attached: true,
      display: resolveLivePlaybackDisplay({
        positionSeconds: hasPlayed(media) ? media.currentTime : null,
        window: readWindowOf(entry),
      }),
    };
  };

  const refresh = (): void => {
    const next = buildSnapshot();
    if (isSameSnapshot(snapshot, next)) {
      return;
    }
    snapshot = next;
    for (const listener of [...listeners]) {
      listener();
    }
  };

  /**
   * Native HLS reports no live sync position, so the first `playing` event records how far
   * behind the seekable end playback joined. Later events never move it.
   */
  const checkNativeJoinOffset = (entry: ActiveRegistration): void => {
    if (entry.joinOffsetChecked) {
      return;
    }
    entry.joinOffsetChecked = true;
    const { media, delivery } = entry.registration;
    if (delivery !== 'hls' || readLiveSyncPosition(media) !== null) {
      return;
    }
    try {
      const { seekable } = media;
      if (seekable.length === 0) {
        return;
      }
      const offset = seekable.end(seekable.length - 1) - media.currentTime;
      if (Number.isFinite(offset)) {
        entry.nativeJoinOffsetSeconds = Math.max(0, offset);
      }
    } catch {
      // A detached element can throw on `seekable`; the edge then sits at the range end.
    }
  };

  const register = (registration: LiveMediaRegistration): (() => void) => {
    releaseActive?.();
    const entry: ActiveRegistration = {
      registration,
      nativeJoinOffsetSeconds: null,
      joinOffsetChecked: false,
    };
    const { media } = registration;
    const onMediaEvent = (event: Event) => {
      if (event.type === 'playing') {
        checkNativeJoinOffset(entry);
      }
      refresh();
    };
    for (const type of REFRESH_EVENTS) {
      media.addEventListener(type, onMediaEvent);
    }
    const intervalId = setIntervalFn(refresh, REFRESH_INTERVAL_MS);

    let released = false;
    const release = () => {
      if (released) {
        return;
      }
      released = true;
      for (const type of REFRESH_EVENTS) {
        media.removeEventListener(type, onMediaEvent);
      }
      clearIntervalFn(intervalId);
      if (active === entry) {
        active = null;
        releaseActive = null;
      }
      refresh();
    };

    active = entry;
    releaseActive = release;
    refresh();
    return release;
  };

  const seekTo = (seconds: number): void => {
    const entry = active;
    if (entry === null) {
      return;
    }
    const liveWindow = readWindowOf(entry);
    if (!isRewindableLiveWindow(liveWindow)) {
      return;
    }
    entry.registration.media.currentTime = clampLiveSeekSeconds(liveWindow, seconds);
    refresh();
  };

  return {
    register,

    getSnapshot: () => snapshot,

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    refresh,

    readWindow: () => (active === null ? null : readWindowOf(active)),

    goToLive: () => {
      const entry = active;
      if (entry === null) {
        return;
      }
      const action = resolveGoToLive(readWindowOf(entry));
      if (action.action === 'seek') {
        entry.registration.media.currentTime = action.seconds;
      } else {
        entry.registration.reconnect();
      }
      refresh();
    },

    seekTo,

    seekToFraction: (fraction) => {
      const entry = active;
      if (entry === null) {
        return;
      }
      const liveWindow = readWindowOf(entry);
      if (!isRewindableLiveWindow(liveWindow)) {
        return;
      }
      entry.registration.media.currentTime = liveSeekSecondsAtFraction(liveWindow, fraction);
      refresh();
    },

    jumpBy: (deltaSeconds) => {
      const entry = active;
      if (entry === null) {
        return;
      }
      seekTo(entry.registration.media.currentTime + deltaSeconds);
    },

    prepareResume: (media) => {
      const entry = active;
      if (entry === null || entry.registration.media !== media) {
        return 'play';
      }
      if (!hasPlayed(media) || !media.paused) {
        return 'play';
      }
      const action = resolveLiveResume({
        positionSeconds: media.currentTime,
        window: readWindowOf(entry),
      });
      switch (action.action) {
        case 'resume-in-place':
          return 'play';
        case 'seek':
          media.currentTime = action.seconds;
          return 'play';
        case 'reconnect':
          entry.registration.reconnect();
          return 'reconnecting';
      }
    },
  };
}

export const liveMediaStore: LiveMediaStore = createLiveMediaStore();
