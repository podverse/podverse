/** One inbox row and one push per event type from a single channel parse. */
export const NOTIFICATIONS_PER_EVENT_PER_PARSE = 1;

export function limitNotificationsPerParse<T>(items: readonly T[]): T[] {
  return items.slice(0, NOTIFICATIONS_PER_EVENT_PER_PARSE);
}
