import type { DTOQueue } from '@podverse/helpers';
import type { ApiRequestService } from '../_request.js';

export async function reqQueueGetAllForAccountPrivate(api: ApiRequestService) {
  return api.apiRequest<DTOQueue[]>({
    path: '/queue/all-for-account/private',
    method: 'GET',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqQueueUpdateIsActiveQueue(
  api: ApiRequestService,
  params: { queue_id_text: string; is_active_queue: boolean }
) {
  return api.apiRequest<DTOQueue>({
    path: `/queue/${params.queue_id_text}/update-is-active`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: {
      is_active_queue: params.is_active_queue,
    },
  });
}
