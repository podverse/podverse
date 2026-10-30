import type {
  AddByRSSRemoteItemLookupRef,
  AddByRSSRemoteItemRef,
  DTOAddByRSSRemoteItemLookupResponse,
  DTOAddByRSSRemoteItemResolveResult,
} from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export async function reqAccountAddByRSSRemoteItemLookup(
  api: ApiRequestService,
  refs: AddByRSSRemoteItemLookupRef[]
) {
  return api.apiRequest<DTOAddByRSSRemoteItemLookupResponse>({
    path: '/account/add-by-rss/remote-item/lookup',
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: {
      refs: refs.map((ref) => ({
        feed_guid: ref.feed_guid,
        feed_url: ref.feed_url,
        item_guid: ref.item_guid,
      })),
    },
  });
}

export async function reqAccountAddByRSSRemoteItemResolve(
  api: ApiRequestService,
  ref: AddByRSSRemoteItemRef
) {
  return api.apiRequest<DTOAddByRSSRemoteItemResolveResult>({
    path: '/account/add-by-rss/remote-item/resolve',
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: {
      feed_guid: ref.feed_guid,
      feed_url: ref.feed_url,
    },
  });
}
