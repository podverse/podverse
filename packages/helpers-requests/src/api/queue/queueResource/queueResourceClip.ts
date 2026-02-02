import type { ApiRequestService } from '../../_request.js';
import type { DTOQueueResource } from '@podverse/helpers';
import type { BetweenParams } from '@podverse/helpers';
import type { QueueExtraParams } from '@podverse/helpers';

export async function reqQueueResourceClipAddNowPlaying(
  api: ApiRequestService,
  queue_id_text: string,
  clip_id_text: string,
  params?: QueueExtraParams
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/clip/${clip_id_text}/now-playing`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceClipAddNext(
  api: ApiRequestService,
  queue_id_text: string,
  clip_id_text: string
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/clip/${clip_id_text}/next`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqQueueResourceClipAddBetween(
  api: ApiRequestService,
  queue_id_text: string,
  clip_id_text: string,
  params: BetweenParams
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/clip/${clip_id_text}/between`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceClipAddLast(
  api: ApiRequestService,
  queue_id_text: string,
  clip_id_text: string
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/clip/${clip_id_text}/last`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqQueueResourceClipAddHistory(
  api: ApiRequestService,
  queue_id_text: string,
  clip_id_text: string,
  params?: QueueExtraParams
) {
  return api.apiRequest<DTOQueueResource>({
    path: `/queue/${queue_id_text}/clip/${clip_id_text}/history`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqQueueResourceClipDelete(
  api: ApiRequestService,
  queue_id_text: string,
  clip_id_text: string
) {
  return api.apiRequest<void>({
    path: `/queue/${queue_id_text}/clip/${clip_id_text}`,
    method: 'DELETE',
    config: {
      withCredentials: true,
    },
  });
}
