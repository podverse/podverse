import type { RemoteItemsResponse } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export async function reqPodrollGetForChannel(api: ApiRequestService, idOrIdText: string) {
  return api.apiRequest<RemoteItemsResponse>({
    path: `/podroll/channel/${idOrIdText}`,
    method: 'GET',
  });
}
