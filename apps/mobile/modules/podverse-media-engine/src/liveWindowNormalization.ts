/**
 * Live-window normalization.
 *
 * Native `progress` and `getCurrentSource()` may omit live fields. This module fills the public
 * shape: `isLive` is true only when native said so, a live source always reports `durationSeconds`
 * of `0`, and `liveWindow` is a finite span with `startSeconds <= liveEdgeSeconds` or `null`.
 * Kept free of Expo and native imports so Vitest can cover it without a device.
 */
import type {
  MediaEngineCurrentSource,
  MediaEngineLiveWindow,
  NativeRawCurrentSource,
  NativeRawProgressEvent,
  ProgressEvent,
} from './types';

/**
 * A finite span with `startSeconds <= liveEdgeSeconds`, or `null`. The returned object is a copy.
 * Anything else (a non-object, a missing field, a non-finite number, a reversed span) is `null`.
 */
export function normalizeLiveWindow(value: unknown): MediaEngineLiveWindow | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  if (!('startSeconds' in value) || !('liveEdgeSeconds' in value)) {
    return null;
  }
  const startSeconds = value.startSeconds;
  const liveEdgeSeconds = value.liveEdgeSeconds;
  if (typeof startSeconds !== 'number' || typeof liveEdgeSeconds !== 'number') {
    return null;
  }
  if (!Number.isFinite(startSeconds) || !Number.isFinite(liveEdgeSeconds)) {
    return null;
  }
  if (startSeconds > liveEdgeSeconds) {
    return null;
  }
  return { startSeconds, liveEdgeSeconds };
}

/**
 * Public `progress` shape. `isLive` is true only when native set it. A live source reports
 * `durationSeconds` of `0` and a normalized window; any other source keeps its duration and has
 * no window.
 */
export function normalizeProgressEvent(raw: NativeRawProgressEvent): ProgressEvent {
  const isLive = raw.isLive === true;
  if (!isLive) {
    return {
      positionSeconds: raw.positionSeconds,
      durationSeconds: raw.durationSeconds,
      isLive: false,
      liveWindow: null,
    };
  }
  return {
    positionSeconds: raw.positionSeconds,
    durationSeconds: 0,
    isLive: true,
    liveWindow: normalizeLiveWindow(raw.liveWindow),
  };
}

/** Same live rules as {@link normalizeProgressEvent}. `null` passes through. */
export function normalizeCurrentSource(
  raw: NativeRawCurrentSource | null
): MediaEngineCurrentSource | null {
  if (raw === null) {
    return null;
  }
  const isLive = raw.isLive === true;
  const source: MediaEngineCurrentSource = {
    url: raw.url,
    meta: raw.meta,
    positionSeconds: raw.positionSeconds,
    durationSeconds: isLive ? 0 : raw.durationSeconds,
    isLive,
    liveWindow: isLive ? normalizeLiveWindow(raw.liveWindow) : null,
    ...(typeof raw.isPlaying === 'boolean' ? { isPlaying: raw.isPlaying } : {}),
  };
  return source;
}
