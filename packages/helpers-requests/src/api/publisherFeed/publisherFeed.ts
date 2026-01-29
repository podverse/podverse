import { ApiRequestService } from '../_request';
import { RemoteItemsResponse } from '@podverse/helpers';

export async function reqPublisherFeedGetRemoteItemsForChannel(
  api: ApiRequestService,
  idOrIdText: string
) {
  return api.apiRequest<RemoteItemsResponse>({
    path: `/publisher-feed/channel/${idOrIdText}`,
    method: 'GET',
  });
}
