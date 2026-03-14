import type { DTOCategory } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';
import type { ApiListResponse } from '../_response.js';

export async function reqCategoryGetAll(api: ApiRequestService) {
  return api.apiRequest<ApiListResponse<DTOCategory>>({
    path: '/category',
    method: 'GET',
  });
}
