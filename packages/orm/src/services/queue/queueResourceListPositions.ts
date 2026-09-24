/**
 * Gap between neighboring `queue_resource.list_position` values. Upcoming is `> 0`, now-playing
 * is `0`, and history is `< 0`, so an insert must stay strictly positive.
 */
export const QUEUE_LIST_POSITION_INCREMENT = 0.00000001;

/**
 * List position for "Queue: Next": just before the first upcoming row, and `1` when the queue
 * has no upcoming row. A history or now-playing anchor is not a valid predecessor — using one
 * writes the row back into history or onto the now-playing slot.
 */
export function upcomingListPositionBeforeFirst(firstListPosition: string | null): string {
  if (firstListPosition === null) {
    return '1';
  }

  const firstPosition = Number(firstListPosition);
  if (!Number.isFinite(firstPosition) || firstPosition <= 0) {
    return '1';
  }

  const next = firstPosition - QUEUE_LIST_POSITION_INCREMENT;
  if (next > 0) {
    return String(next);
  }

  return String(firstPosition / 2);
}
