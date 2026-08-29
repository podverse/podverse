/**
 * Pure bridge command serialization.
 *
 * The native module takes **positional** args (`load(url, seek?)`, `attachVideoSurface(targetId, x,
 * y, width, height, cornerRadius)`, …). This module converts the object-based bridge inputs into the
 * exact positional tuples the native modules expect and validates them, so the JS adapter never
 * hands malformed payloads (missing url, `NaN`/negative rect) to native. Kept free of native/`expo`
 * imports so Vitest can cover the arg order + validation without a device.
 */
import type { MediaEngineSource, VideoSurfaceRect, VideoSurfaceTargetId } from './types';

/** Positional args for the native `load` / `loadAndStart` functions. */
export type LoadCommandArgs = readonly [url: string, initialSeekSeconds?: number];

/** Positional args for the native `attachVideoSurface` function (iOS + Android agree on this order). */
export type AttachVideoSurfaceCommandArgs = readonly [
  targetId: VideoSurfaceTargetId,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number,
];

/** Positional args for the native `animateVideoSurface` function. */
export type AnimateVideoSurfaceCommandArgs = readonly [
  toTargetId: VideoSurfaceTargetId,
  durationMs: number,
];

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number (got ${value})`);
  }
}

function assertNonNegativeFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite number >= 0 (got ${value})`);
  }
}

/**
 * Serialize a {@link MediaEngineSource} into positional `load` / `loadAndStart` args. Throws when
 * `url` is empty/whitespace or `initialSeekSeconds` is not a finite number `>= 0`. When
 * `initialSeekSeconds` is omitted the tuple is one element so the native optional arg stays unset.
 */
export function serializeLoadCommand(source: MediaEngineSource): LoadCommandArgs {
  const url = source.url.trim();
  if (url.length === 0) {
    throw new Error('serializeLoadCommand: `url` is required');
  }

  const seek = source.initialSeekSeconds;
  if (seek === undefined) {
    return [url];
  }
  assertNonNegativeFiniteNumber(seek, 'serializeLoadCommand: `initialSeekSeconds`');
  return [url, seek];
}

/**
 * Serialize a video-surface target + rect into positional `attachVideoSurface` args. `x`/`y` may be
 * negative (off-screen), but `width`/`height`/`cornerRadius` must be finite and `>= 0`. `cornerRadius`
 * defaults to `0` when omitted. Throws on malformed rects.
 */
export function serializeAttachVideoSurfaceCommand(
  targetId: VideoSurfaceTargetId,
  rect: VideoSurfaceRect
): AttachVideoSurfaceCommandArgs {
  assertFiniteNumber(rect.x, 'serializeAttachVideoSurfaceCommand: `x`');
  assertFiniteNumber(rect.y, 'serializeAttachVideoSurfaceCommand: `y`');
  assertNonNegativeFiniteNumber(rect.width, 'serializeAttachVideoSurfaceCommand: `width`');
  assertNonNegativeFiniteNumber(rect.height, 'serializeAttachVideoSurfaceCommand: `height`');
  const cornerRadius = rect.cornerRadius ?? 0;
  assertNonNegativeFiniteNumber(cornerRadius, 'serializeAttachVideoSurfaceCommand: `cornerRadius`');

  return [targetId, rect.x, rect.y, rect.width, rect.height, cornerRadius];
}

/**
 * Serialize an animate-to-target command into positional `animateVideoSurface` args. `durationMs`
 * must be a finite number `>= 0` (`0` snaps without animation). Throws otherwise.
 */
export function serializeAnimateVideoSurfaceCommand(
  toTargetId: VideoSurfaceTargetId,
  durationMs: number
): AnimateVideoSurfaceCommandArgs {
  assertNonNegativeFiniteNumber(durationMs, 'serializeAnimateVideoSurfaceCommand: `durationMs`');
  return [toTargetId, durationMs];
}
