import { DTOPlaylistResource } from '@podverse/helpers';
import { ApiRequestService } from '../../_request';
import { BetweenParams } from '@podverse/helpers';

export async function reqPlaylistResourceItemAddFirst(
  api: ApiRequestService,
  playlist_id_text: string,
  item_id_text: string
) {
  return api.apiRequest<DTOPlaylistResource>({
    path: `/playlist/${playlist_id_text}/item/${item_id_text}/first`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqPlaylistResourceItemAddBetween(
  api: ApiRequestService,
  playlist_id_text: string,
  item_id_text: string,
  params: BetweenParams
) {
  return api.apiRequest<DTOPlaylistResource>({
    path: `/playlist/${playlist_id_text}/item/${item_id_text}/between`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqPlaylistResourceItemAddLast(
  api: ApiRequestService,
  playlist_id_text: string,
  item_id_text: string
) {
  return api.apiRequest<DTOPlaylistResource>({
    path: `/playlist/${playlist_id_text}/item/${item_id_text}/last`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqPlaylistResourceItemDelete(
  api: ApiRequestService,
  playlist_id_text: string,
  item_id_text: string
) {
  return api.apiRequest<void>({
    path: `/playlist/${playlist_id_text}/item/${item_id_text}`,
    method: 'DELETE',
    config: {
      withCredentials: true,
    },
  });
}
