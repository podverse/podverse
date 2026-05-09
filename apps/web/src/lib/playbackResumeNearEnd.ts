/** Shared with podcast/video/music resume: treat positions within 5s of end as 0. */
export function trimPlaybackPositionNearEnd(
  positionSeconds: number,
  durationSeconds: number
): number {
  if (durationSeconds > 0 && positionSeconds >= durationSeconds - 5) {
    return 0;
  }
  return positionSeconds;
}
