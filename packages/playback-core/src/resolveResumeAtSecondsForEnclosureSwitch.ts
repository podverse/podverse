/**
 * Prefer the live media element playhead when staging an enclosure switch;
 * fall back to React context when the bridge is not attached.
 */
export function resolveResumeAtSecondsForEnclosureSwitch(
  elementSeconds: number | undefined,
  contextSeconds: number
): number {
  return elementSeconds ?? contextSeconds;
}
