import type { QueueHistoryLimitNotice } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export function reqAccountQueueHistoryLimitNoticeGet(
  service: ApiRequestService
): Promise<QueueHistoryLimitNotice> {
  return service.apiRequest<QueueHistoryLimitNotice>({
    path: '/account/queue-history-limit-notice',
    method: 'GET',
  });
}

export function reqAccountQueueHistoryLimitNoticeAcknowledge(
  service: ApiRequestService,
  params: { limit: number }
): Promise<QueueHistoryLimitNotice> {
  return service.apiRequest<QueueHistoryLimitNotice>({
    path: '/account/queue-history-limit-notice',
    method: 'POST',
    data: params,
  });
}
