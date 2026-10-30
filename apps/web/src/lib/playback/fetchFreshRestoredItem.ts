import type { DTOItem } from '@podverse/helpers';
import { resolveItemLiveStatusId } from '@podverse/helpers';
import { getStatusCodeFromError } from '@podverse/helpers-requests';
import type {
  FreshLiveItemStatusLookup,
  RestoredLivestreamDecision,
} from '@podverse/playback-core';
import { resolveRestoredLivestream } from '@podverse/playback-core';

import { getApiRequestService } from '../../factories/apiRequestService';

export type FreshRestoredItem = {
  /** The item as the server returned it on this read; null when the read failed or found nothing. */
  item: DTOItem | null;
  decision: RestoredLivestreamDecision;
};

/**
 * Reads a restored or adopted now-playing item from the server and decides whether it stays
 * loaded. A 404 is a missing item. Any other failure is no answer: the decision keeps the item
 * with `item: null`, and the caller loads the copy it already has.
 */
export async function fetchFreshRestoredItem(itemIdText: string): Promise<FreshRestoredItem> {
  let item: DTOItem | null;
  try {
    item = await getApiRequestService().reqItemGetByIdOrIdText(itemIdText);
  } catch (error: unknown) {
    const lookup: FreshLiveItemStatusLookup =
      getStatusCodeFromError(error) === 404 ? { kind: 'not-found' } : { kind: 'unavailable' };
    return { item: null, decision: resolveRestoredLivestream(lookup) };
  }
  if (!item) {
    return { item: null, decision: resolveRestoredLivestream({ kind: 'unavailable' }) };
  }
  return {
    item,
    decision: resolveRestoredLivestream({
      kind: 'status',
      statusId: resolveItemLiveStatusId(item),
    }),
  };
}
