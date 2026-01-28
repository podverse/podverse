import { ApiRequestService } from '../../_request';
import { DTOQueueResource } from '../../../../../dtos';
import { BetweenParams } from '../../../../../dtos/betweenParams';
import { QueueExtraParams } from '../../../../../dtos/queueExtraParams';

export async function reqQueueResourceItemAddNowPlaying(
  api: ApiRequestService,
  queue_id_text: string,
  item_id_text: string,
  params?: QueueExtraParams
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item/${item_id_text}/now-playing`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceItemAddNext(
  api: ApiRequestService,
  queue_id_text: string,
  item_id_text: string
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item/${item_id_text}/next`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqQueueResourceItemAddBetween(
  api: ApiRequestService,
  queue_id_text: string,
  item_id_text: string,
  params: BetweenParams
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item/${item_id_text}/between`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceItemAddLast(
  api: ApiRequestService,
  queue_id_text: string,
  item_id_text: string
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item/${item_id_text}/last`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqQueueResourceItemAddHistory(
  api: ApiRequestService,
  queue_id_text: string,
  item_id_text: string,
  params?: QueueExtraParams
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item/${item_id_text}/history`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceItemDelete(
  api: ApiRequestService,
  queue_id_text: string,
  item_id_text: string
) {
  return api.apiRequest<void>({
    path: `/queue/${queue_id_text}/item/${item_id_text}`,
    method: 'DELETE',
    config: {
      withCredentials: true,
    },
  });
}
