'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PlaybackLoadDecision } from '../lib/playback';
import { playMediaWhenReady } from '../utils/mediaPlayer/mediaPlayerPlayMediaWhenReady';
import type {
  ApplyItemEnclosureSurfaceChangeInput,
  SyncHttpFileUrlRestoreSeekAndPlayInput,
} from './mediaElementBridgeSurface';
import {
  applyItemEnclosureSurfaceChangeFromRef,
  syncHttpFileUrlRestoreSeekAndPlayFromRef,
  waitForLoadedMetadataOnce,
} from './mediaElementBridgeSurface';

export type {
  ApplyItemEnclosureSurfaceChangeInput,
  SyncHttpFileUrlRestoreSeekAndPlayInput,
} from './mediaElementBridgeSurface';

export type MediaElementSource = { kind: 'file'; src: string; mimeType?: string };

export type MediaElementBridge = {
  /** Imperative load: sets `src`, waits for `loadedmetadata`, then applies the decision. */
  loadAndStart: (source: MediaElementSource, decision: PlaybackLoadDecision) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;
  seek: (seconds: number) => void;
  /** Returns the element's `currentTime` after applying the jump (clamped). */
  jumpBy: (deltaSeconds: number) => number;
  /**
   * Arm a playback-time boundary where the element pauses itself on `timeupdate`.
   * Pass a **negative** value to disarm (clear any armed boundary).
   */
  pauseAt: (seconds: number) => void;
  /**
   * Pause immediately and clear any armed `pauseAt` boundary so a later
   * `timeupdate` does not re-trigger the scheduled stop.
   */
  pauseAndDisarmBoundary: () => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  /** `file` after first successful `loadAndStart`; `null` before. */
  currentSourceKind: 'file' | null;
  /**
   * Add-by-RSS URL effect: set `src`+`load` when URL changes, optional persisted seek after
   * metadata, optional `playMediaWhenReady`.
   */
  syncHttpFileUrlRestoreSeekAndPlay: (input: SyncHttpFileUrlRestoreSeekAndPlayInput) => void;
  /** Regular-item enclosure switch: rewind+load or clear src for mismatched kind. */
  applyItemEnclosureSurfaceChange: (input: ApplyItemEnclosureSurfaceChangeInput) => void;
  /** Live element playhead when mounted; `undefined` when no element or time is invalid. */
  readCurrentTimeSeconds: () => number | undefined;
};

export type UseMediaElementBridgeOptions = {
  onTimeUpdate?: (seconds: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: MediaError | null) => void;
  onLoadedMetadata?: (durationSeconds: number) => void;
};

function isTokenCurrent(token: number, loadGenRef: { current: number }): boolean {
  return token === loadGenRef.current;
}

export function useMediaElementBridge(
  mediaRef: RefObject<HTMLMediaElement | null>,
  options: UseMediaElementBridgeOptions
): MediaElementBridge {
  const loadGenRef = useRef(0);
  const pauseAtRef = useRef<number | null>(null);
  const [currentSourceKind, setCurrentSourceKind] = useState<'file' | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    const onTimeUpdate = () => {
      const t = media.currentTime;
      const stop = pauseAtRef.current;
      if (stop !== null && t >= stop) {
        media.pause();
        pauseAtRef.current = null;
      }
      optionsRef.current.onTimeUpdate?.(t);
    };
    const onPlay = () => {
      optionsRef.current.onPlay?.();
    };
    const onPause = () => {
      optionsRef.current.onPause?.();
    };
    const onEnded = () => {
      optionsRef.current.onEnded?.();
    };
    const onError = () => {
      optionsRef.current.onError?.(media.error);
    };
    const onLoadedMetadata = () => {
      const d = Number.isFinite(media.duration) ? media.duration : NaN;
      optionsRef.current.onLoadedMetadata?.(d);
    };

    media.addEventListener('timeupdate', onTimeUpdate);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('ended', onEnded);
    media.addEventListener('error', onError);
    media.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      media.removeEventListener('timeupdate', onTimeUpdate);
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('ended', onEnded);
      media.removeEventListener('error', onError);
      media.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [mediaRef]);

  const loadAndStart = useCallback(
    async (source: MediaElementSource, decision: PlaybackLoadDecision) => {
      if (source.kind !== 'file') {
        throw new Error('useMediaElementBridge: only file sources are supported');
      }
      const myToken = ++loadGenRef.current;
      pauseAtRef.current = null;
      const media = mediaRef.current;
      if (!media) {
        throw new Error('useMediaElementBridge: media element not mounted');
      }
      if (media.src !== source.src) {
        media.src = source.src;
        media.load();
      }
      await waitForLoadedMetadataOnce(media, () => isTokenCurrent(myToken, loadGenRef));
      if (!isTokenCurrent(myToken, loadGenRef)) {
        return;
      }
      media.currentTime = decision.initialSeekSeconds;
      if (decision.shouldAutoPlay) {
        try {
          await media.play();
        } catch {
          // Autoplay policy may reject play(); observability only.
        }
        if (!isTokenCurrent(myToken, loadGenRef)) {
          return;
        }
      }
      if (typeof decision.pauseAtSeconds === 'number') {
        if (!isTokenCurrent(myToken, loadGenRef)) {
          return;
        }
        pauseAtRef.current = decision.pauseAtSeconds;
      }
      if (isTokenCurrent(myToken, loadGenRef)) {
        setCurrentSourceKind('file');
      }
    },
    [mediaRef]
  );

  const play = useCallback(async () => {
    const media = mediaRef.current;
    if (!media) {
      throw new Error('useMediaElementBridge: media element not mounted');
    }
    await new Promise<void>((resolve) => {
      playMediaWhenReady(media, () => resolve());
    });
  }, [mediaRef]);

  const pause = useCallback(() => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    media.pause();
  }, [mediaRef]);

  const togglePlay = useCallback(async () => {
    const media = mediaRef.current;
    if (!media) {
      throw new Error('useMediaElementBridge: media element not mounted');
    }
    if (media.paused) {
      await new Promise<void>((resolve) => {
        playMediaWhenReady(media, () => resolve());
      });
    } else {
      media.pause();
    }
  }, [mediaRef]);

  const seek = useCallback(
    (seconds: number) => {
      const media = mediaRef.current;
      if (!media) {
        throw new Error('useMediaElementBridge: media element not mounted');
      }
      media.currentTime = seconds;
    },
    [mediaRef]
  );

  const jumpBy = useCallback(
    (deltaSeconds: number): number => {
      const media = mediaRef.current;
      if (!media) {
        throw new Error('useMediaElementBridge: media element not mounted');
      }
      const duration =
        typeof media.duration === 'number' && Number.isFinite(media.duration)
          ? media.duration
          : undefined;
      const next = media.currentTime + deltaSeconds;
      const clampedLow = Math.max(next, 0);
      const clamped = duration !== undefined ? Math.min(clampedLow, duration) : clampedLow;
      media.currentTime = clamped;
      return clamped;
    },
    [mediaRef]
  );

  const pauseAt = useCallback((seconds: number) => {
    pauseAtRef.current = seconds < 0 ? null : seconds;
  }, []);

  const pauseAndDisarmBoundary = useCallback(() => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    pauseAtRef.current = null;
    media.pause();
  }, [mediaRef]);

  const setVolume = useCallback(
    (volume: number) => {
      const media = mediaRef.current;
      if (!media) {
        return;
      }
      media.volume = volume;
    },
    [mediaRef]
  );

  const setMuted = useCallback(
    (muted: boolean) => {
      const media = mediaRef.current;
      if (!media) {
        return;
      }
      media.muted = muted;
    },
    [mediaRef]
  );

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const media = mediaRef.current;
      if (!media) {
        return;
      }
      media.playbackRate = rate;
    },
    [mediaRef]
  );

  const syncHttpFileUrlRestoreSeekAndPlay = useCallback(
    (input: SyncHttpFileUrlRestoreSeekAndPlayInput) => {
      syncHttpFileUrlRestoreSeekAndPlayFromRef(mediaRef, input);
    },
    [mediaRef]
  );

  const applyItemEnclosureSurfaceChange = useCallback(
    (input: ApplyItemEnclosureSurfaceChangeInput) => {
      applyItemEnclosureSurfaceChangeFromRef(mediaRef, input);
    },
    [mediaRef]
  );

  const readCurrentTimeSeconds = useCallback((): number | undefined => {
    const media = mediaRef.current;
    if (!media) {
      return undefined;
    }
    const currentTime = media.currentTime;
    if (!Number.isFinite(currentTime) || currentTime < 0) {
      return undefined;
    }
    return currentTime;
  }, [mediaRef]);

  return useMemo(
    () => ({
      loadAndStart,
      play,
      pause,
      togglePlay,
      seek,
      jumpBy,
      pauseAt,
      pauseAndDisarmBoundary,
      setVolume,
      setMuted,
      setPlaybackRate,
      currentSourceKind,
      syncHttpFileUrlRestoreSeekAndPlay,
      applyItemEnclosureSurfaceChange,
      readCurrentTimeSeconds,
    }),
    [
      loadAndStart,
      play,
      pause,
      togglePlay,
      seek,
      jumpBy,
      pauseAt,
      pauseAndDisarmBoundary,
      setVolume,
      setMuted,
      setPlaybackRate,
      currentSourceKind,
      syncHttpFileUrlRestoreSeekAndPlay,
      applyItemEnclosureSurfaceChange,
      readCurrentTimeSeconds,
    ]
  );
}
