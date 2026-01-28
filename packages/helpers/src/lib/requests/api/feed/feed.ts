import { DTOFeed } from 'src/dtos';
import { ApiRequestService } from '../_request';

export async function reqFeedGetByPodcastIndexId(
  api: ApiRequestService,
  idOrIdText: number | string
) {
  return api.apiRequest<DTOFeed>({
    path: `/feed/${idOrIdText}`,
    method: 'GET',
  });
}
