/**
 * Leading-plus-trailing decision for seek network posts. The first seek of a burst posts
 * immediately; seeks inside the window are local-only until a trailing flush.
 */

export function shouldPostSeekEventNow({
  lastSeekPostAtMs,
  occurredAt,
  windowMs,
}: {
  lastSeekPostAtMs: number | null;
  occurredAt: number;
  windowMs: number;
}): boolean {
  if (lastSeekPostAtMs === null) {
    return true;
  }
  return occurredAt - lastSeekPostAtMs >= windowMs;
}
