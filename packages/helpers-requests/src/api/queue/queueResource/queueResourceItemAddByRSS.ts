import type { ApiRequestService } from '../../_request.js';
import type { DTOQueueResource } from '@podverse/helpers';
import type { BetweenParams } from '@podverse/helpers';
import type { QueueExtraParams } from '@podverse/helpers';

export async function reqQueueResourceItemAddByRSSAddNowPlaying(
  api: ApiRequestService,
  queue_id_text: string,
  params: QueueExtraParams & { add_by_rss_resource_data: object }
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item-add-by-rss/now-playing`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceItemAddByRSSAddNext(
  api: ApiRequestService,
  queue_id_text: string,
  params: { add_by_rss_resource_data: object }
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item-add-by-rss/next`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceItemAddByRSSAddBetween(
  api: ApiRequestService,
  queue_id_text: string,
  params: BetweenParams & { add_by_rss_resource_data: object }
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item-add-by-rss/between`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceItemAddByRSSAddLast(
  api: ApiRequestService,
  queue_id_text: string,
  params: { add_by_rss_resource_data: object }
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item-add-by-rss/last`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceItemAddByRSSAddHistory(
  api: ApiRequestService,
  queue_id_text: string,
  params: QueueExtraParams & { add_by_rss_resource_data: object }
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item-add-by-rss/history`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceItemAddByRSSDelete(
  api: ApiRequestService,
  queue_id_text: string,
  add_by_rss_hash_id: string
) {
  return api.apiRequest<void>({
    path: `/queue/${queue_id_text}/item-add-by-rss/${add_by_rss_hash_id}`,
    method: 'DELETE',
    config: {
      withCredentials: true,
    },
  });
}
