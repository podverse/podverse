/**
 * After a scrub commits, the element can still emit a timeupdate at the pre-seek playhead.
 * Keep showing the committed second until a sample lands near it, or until this window ends.
 * Same numbers as the mobile seek hold (`apps/mobile/src/lib/playback/seekPositionHold.ts`).
 */
export const SEEK_DISPLAY_HOLD_TOLERANCE_SECONDS = 1.5;

export const SEEK_DISPLAY_HOLD_MAX_MS = 1500;

export function isSeekDisplayHoldLanded(params: {
  positionSeconds: number;
  seekSeconds: number;
  toleranceSeconds?: number;
}): boolean {
  if (!Number.isFinite(params.positionSeconds)) {
    return false;
  }
  const tolerance = params.toleranceSeconds ?? SEEK_DISPLAY_HOLD_TOLERANCE_SECONDS;
  return Math.abs(params.positionSeconds - params.seekSeconds) <= tolerance;
}
