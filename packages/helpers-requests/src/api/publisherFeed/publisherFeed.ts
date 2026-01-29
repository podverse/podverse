import { ApiRequestService } from '../_request';
import { PublisherRemoteItemsResponse } from '@podverse/helpers';

export async function reqPublisherFeedGetRemoteItemsForChannel(
  api: ApiRequestService,
  idOrIdText: string
) {
  return api.apiRequest<PublisherRemoteItemsResponse>({
    path: `/publisher-feed/channel/${idOrIdText}`,
    method: 'GET',
  });
}
