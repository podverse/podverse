import { ApiRequestService } from '../_request';
import { RemoteItemsResponse } from '@podverse/helpers';

export async function reqPodrollGetForChannel(api: ApiRequestService, idOrIdText: string) {
  return api.apiRequest<RemoteItemsResponse>({
    path: `/podroll/channel/${idOrIdText}`,
    method: 'GET',
  });
}
