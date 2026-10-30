import { LiveItemStatusEnum } from '@podverse/helpers';

/**
 * What the server said about a restored now-playing item, read fresh on this load.
 *
 * - `status`: the item was returned. `statusId` is `resolveItemLiveStatusId(item)` on the
 *   returned item, or the live status from a fresh Add by RSS parse. `null` means the item is no
 *   longer a live item.
 * - `not-found`: the server answered that the item does not exist (HTTP 404).
 * - `unavailable`: no answer: offline, timeout, 5xx, or any other failure.
 *
 * A copy of the item stored on the device, or a placeholder built from engine metadata, is never
 * a `status` lookup.
 */
export type FreshLiveItemStatusLookup =
  | { kind: 'status'; statusId: LiveItemStatusEnum | null }
  | { kind: 'not-found' }
  | { kind: 'unavailable' };

export type RestoredLivestreamDecision =
  | { action: 'keep'; reason: 'live' | 'pending' | 'not-live-item' | 'status-unavailable' }
  | { action: 'retire'; reason: 'ended' | 'not-found' };

/**
 * Whether a restored or adopted now-playing livestream stays loaded. Only an ended status or a
 * missing item retires it; every other answer, including no answer, keeps it, so a stream that
 * is really live is never hidden. Start and end times are never consulted.
 */
export function resolveRestoredLivestream(
  lookup: FreshLiveItemStatusLookup
): RestoredLivestreamDecision {
  switch (lookup.kind) {
    case 'unavailable':
      return { action: 'keep', reason: 'status-unavailable' };
    case 'not-found':
      return { action: 'retire', reason: 'not-found' };
    case 'status':
      switch (lookup.statusId) {
        case LiveItemStatusEnum.Ended:
          return { action: 'retire', reason: 'ended' };
        case LiveItemStatusEnum.Live:
          return { action: 'keep', reason: 'live' };
        case LiveItemStatusEnum.Pending:
          return { action: 'keep', reason: 'pending' };
        case null:
          return { action: 'keep', reason: 'not-live-item' };
      }
  }
}
