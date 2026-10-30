import { resolveItemLiveStatusId } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';
import type { FreshLiveItemStatusLookup } from '@podverse/playback-core/restoredLivestream';
import { resolveRestoredLivestream } from '@podverse/playback-core/restoredLivestream';

/** A fresh server read of one item by id. 404 is `not-found`; any other failure is `unavailable`. */
export type FreshRestoredItem =
  { kind: 'found'; item: DTOItem } | { kind: 'not-found' } | { kind: 'unavailable' };

/**
 * What a cold-start restore does with an item it is about to load paused.
 *
 * - `load`: load this fresh item. It replaces the stored or queue copy, so a livestream that
 *   became a regular item, or a regular item that is live now, loads as the server has it.
 * - `load-stored`: no usable answer; load the copy already in hand, as before.
 * - `retire`: the livestream ended or is gone; treat it like a finished item.
 */
export type RestoredItemLoadDecision =
  | { action: 'load'; item: DTOItem }
  | { action: 'load-stored' }
  | { action: 'retire'; reason: 'ended' | 'not-found' };

export const freshLiveItemStatusLookup = (fresh: FreshRestoredItem): FreshLiveItemStatusLookup => {
  switch (fresh.kind) {
    case 'found':
      return { kind: 'status', statusId: resolveItemLiveStatusId(fresh.item) };
    case 'not-found':
      return { kind: 'not-found' };
    case 'unavailable':
      return { kind: 'unavailable' };
  }
};

/**
 * `knownLiveBeforeFetch` does not change the result. Callers still pass it: on the snapshot path
 * it is what decided whether this read happened at all. A `not-found` result retires the item
 * whether or not it was known to be live. `unavailable` loads the copy already in hand.
 */
export const resolveRestoredItemLoad = (params: {
  fresh: FreshRestoredItem;
  knownLiveBeforeFetch: boolean;
}): RestoredItemLoadDecision => {
  const { fresh } = params;
  const decision = resolveRestoredLivestream(freshLiveItemStatusLookup(fresh));
  if (decision.action === 'retire') {
    return { action: 'retire', reason: decision.reason };
  }
  return fresh.kind === 'found' ? { action: 'load', item: fresh.item } : { action: 'load-stored' };
};
