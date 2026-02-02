import type { DTOFeed } from '@podverse/helpers';
import type { ApiRequestService } from '../_request.js';

export async function reqFeedGetByPodcastIndexId(
  api: ApiRequestService,
  idOrIdText: number | string
) {
  return api.apiRequest<DTOFeed>({
    path: `/feed/${idOrIdText}`,
    method: 'GET',
  });
}
