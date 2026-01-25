import { ApiRequestService } from '../_request';
import { RemoteItemsResponse } from 'src/dtos';

export async function reqPublisherFeedGetRemoteItemsForChannel(
  api: ApiRequestService,
  idOrIdText: string,
) {
  return api.apiRequest<RemoteItemsResponse>({
    path: `/publisher-feed/channel/${idOrIdText}`,
    method: 'GET',
  });
}
