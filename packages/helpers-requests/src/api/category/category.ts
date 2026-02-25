import type { ApiRequestService } from '../_request.js';
import type { ApiListResponse } from '../_response.js';
import type { DTOCategory } from '@podverse/helpers';

export async function reqCategoryGetAll(api: ApiRequestService) {
  return api.apiRequest<ApiListResponse<DTOCategory>>({
    path: '/category',
    method: 'GET',
  });
}
