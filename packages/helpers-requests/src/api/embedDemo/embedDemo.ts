import type { EmbedDemoShowcaseApiResponse } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export async function reqEmbedDemoGetShowcase(api: ApiRequestService) {
  return api.apiRequest<EmbedDemoShowcaseApiResponse>({
    path: '/embed-demo/showcase',
    method: 'GET',
  });
}
