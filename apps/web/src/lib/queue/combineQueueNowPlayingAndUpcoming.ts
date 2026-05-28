import type { DTOQueueResource } from '@podverse/helpers';

/**
 * Builds the ordered list shown as "active queue + upcoming" after a reload.
 * `activeResource` for load-active is always `combined[0] ?? null`.
 */
export function combineQueueNowPlayingAndUpcoming(
  nowPlaying: DTOQueueResource | null,
  upcoming: DTOQueueResource[]
): DTOQueueResource[] {
  if (nowPlaying !== null) {
    return [nowPlaying, ...upcoming];
  }
  if (upcoming.length > 0) {
    return [...upcoming];
  }
  return [];
}
