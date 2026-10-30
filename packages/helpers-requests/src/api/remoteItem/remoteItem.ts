import type { RemoteItemsResponse } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export async function reqRemoteItemGetForChannel(api: ApiRequestService, idOrIdText: string) {
  return api.apiRequest<RemoteItemsResponse>({
    path: `/remote-item/channel/${idOrIdText}`,
    method: 'GET',
  });
}
