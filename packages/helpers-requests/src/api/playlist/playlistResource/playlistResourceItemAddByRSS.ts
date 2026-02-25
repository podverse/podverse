import type { DTOPlaylistResource } from '@podverse/helpers';
import type { BetweenParams } from '@podverse/helpers';
import type { ApiRequestService } from '../../_request.js';

export async function reqPlaylistResourceItemAddByRSSAddFirst(
  api: ApiRequestService,
  playlist_id_text: string,
  params: { add_by_rss_resource_data: object }
) {
  return api.apiRequest<DTOPlaylistResource>({
    path: `/playlist/${playlist_id_text}/item-add-by-rss/first`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqPlaylistResourceItemAddByRSSAddLast(
  api: ApiRequestService,
  playlist_id_text: string,
  params: { add_by_rss_resource_data: object }
) {
  return api.apiRequest<DTOPlaylistResource>({
    path: `/playlist/${playlist_id_text}/item-add-by-rss/last`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqPlaylistResourceItemAddByRSSAddBetween(
  api: ApiRequestService,
  playlist_id_text: string,
  params: BetweenParams & { add_by_rss_resource_data: object }
) {
  return api.apiRequest<DTOPlaylistResource>({
    path: `/playlist/${playlist_id_text}/item-add-by-rss/between`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqPlaylistResourceItemAddByRSSDelete(
  api: ApiRequestService,
  playlist_id_text: string,
  add_by_rss_hash_id: string
) {
  return api.apiRequest<void>({
    path: `/playlist/${playlist_id_text}/item-add-by-rss/${add_by_rss_hash_id}`,
    method: 'DELETE',
    config: {
      withCredentials: true,
    },
  });
}
