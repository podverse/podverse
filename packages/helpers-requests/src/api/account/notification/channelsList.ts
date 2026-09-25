import type { ApiRequestService } from '../../_request.js';

export async function reqAccountNotificationChannelsGetAll(api: ApiRequestService) {
  return api.apiRequest<Array<{ id: number; channel_id: number; account_id: number }>>({
    path: '/account/notification/channels',
    method: 'GET',
    config: { withCredentials: true },
  });
}
