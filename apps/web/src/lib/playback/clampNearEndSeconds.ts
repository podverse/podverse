/**
 * Single home for the "treat positions within 5 seconds of `duration`
 * as 0" rule, also known as the **5-second near-end clamp**.
 *
 * Mirrors the existing inline rule in
 * `apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx`
 * (`getAbridgedAndSet`):
 *
 * ```
 * if (duration > 0 && currentTime >= duration - 5) {
 *   currentTime = 0;
 * }
 * ```
 *
 * Both inputs are expected to already be finite non-negative seconds
 * (see `parsePlaybackSeconds`). When `durationSeconds` is `0` or
 * negative, the clamp never applies — the caller's `currentSeconds`
 * passes through unchanged.
 */
export function clampNearEndSeconds({
  currentSeconds,
  durationSeconds,
}: {
  currentSeconds: number;
  durationSeconds: number;
}): number {
  if (durationSeconds > 0 && currentSeconds >= durationSeconds - 5) {
    return 0;
  }
  return currentSeconds;
}
