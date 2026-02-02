import type { ApiRequestService } from '../../_request.js';
import type { DTOQueueResource } from '@podverse/helpers';
import type { BetweenParams } from '@podverse/helpers';
import type { QueueExtraParams } from '@podverse/helpers';

export async function reqQueueResourceItemSoundbiteAddNowPlaying(
  api: ApiRequestService,
  queue_id_text: string,
  item_soundbite_id_text: string,
  params?: QueueExtraParams
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item-soundbite/${item_soundbite_id_text}/now-playing`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceItemSoundbiteAddNext(
  api: ApiRequestService,
  queue_id_text: string,
  item_soundbite_id_text: string
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item-soundbite/${item_soundbite_id_text}/next`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqQueueResourceItemSoundbiteAddBetween(
  api: ApiRequestService,
  queue_id_text: string,
  item_soundbite_id_text: string,
  params: BetweenParams
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item-soundbite/${item_soundbite_id_text}/between`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceItemSoundbiteAddLast(
  api: ApiRequestService,
  queue_id_text: string,
  item_soundbite_id_text: string
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item-soundbite/${item_soundbite_id_text}/last`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqQueueResourceItemSoundbiteAddHistory(
  api: ApiRequestService,
  queue_id_text: string,
  item_soundbite_id_text: string,
  params?: QueueExtraParams
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/item-soundbite/${item_soundbite_id_text}/history`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceItemSoundbiteDelete(
  api: ApiRequestService,
  queue_id_text: string,
  item_soundbite_id_text: string
) {
  return api.apiRequest<void>({
    path: `/queue/${queue_id_text}/item-soundbite/${item_soundbite_id_text}`,
    method: 'DELETE',
    config: {
      withCredentials: true,
    },
  });
}
