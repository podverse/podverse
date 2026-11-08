/**
 * A return to the foreground is a trip through `background`.
 *
 * iOS reports `inactive` for a screenshot preview, Control Center, and system alerts. The app is
 * still in the foreground, so a sync there only flashes the progress row. Android does not report
 * `inactive`; a pause is `background`, and that still syncs.
 */
export const shouldRequestForegroundSync = (previous: string | null, next: string): boolean =>
  previous === 'background' && next === 'active';
