import { ApiRequestService } from '../_request';
import { ApiListResponse } from '../_response';
import { DTOCategory } from 'src/dtos';

export async function reqCategoryGetAll(api: ApiRequestService) {
  return api.apiRequest<ApiListResponse<DTOCategory>>({
    path: '/category',
    method: 'GET',
  });
}
