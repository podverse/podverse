import type { PublicClientConfig } from '@podverse/helpers';

import type { AbortOpts, ApiRequestService } from '../_request.js';

export async function reqPublicClientConfigGet(api: ApiRequestService, abort?: AbortOpts) {
  return api.apiRequest<{ data: PublicClientConfig }>({
    path: '/config',
    method: 'GET',
    ...(abort !== undefined ? { abort } : {}),
  });
}
