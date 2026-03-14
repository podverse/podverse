import type { PublisherRemoteItemsResponse } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export async function reqPublisherFeedGetRemoteItemsForChannel(
  api: ApiRequestService,
  idOrIdText: string
) {
  return api.apiRequest<PublisherRemoteItemsResponse>({
    path: `/publisher-feed/channel/${idOrIdText}`,
    method: 'GET',
  });
}
