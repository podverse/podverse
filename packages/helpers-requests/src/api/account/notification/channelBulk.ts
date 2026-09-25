import type { ApiRequestService } from '../../_request.js';

export async function reqAccountNotificationChannelsBulkEnable(api: ApiRequestService) {
  return api.apiRequest<{ created: number }>({
    path: '/account/notification/channels/bulk-enable',
    method: 'POST',
    config: { withCredentials: true },
  });
}

export async function reqAccountNotificationChannelsBulkDisable(api: ApiRequestService) {
  return api.apiRequest<{ deleted: number }>({
    path: '/account/notification/channels/bulk-disable',
    method: 'POST',
    config: { withCredentials: true },
  });
}

export async function reqAccountNotificationChannelsBulkType(
  api: ApiRequestService,
  params: { type: string; enabled: boolean }
) {
  return api.apiRequest<{ updated: number }>({
    path: '/account/notification/channels/bulk-type',
    method: 'POST',
    data: params,
    config: { withCredentials: true },
  });
}
