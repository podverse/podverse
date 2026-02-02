import type { BetweenParams, DTOPlaylistResource } from '@podverse/helpers';
import type { ApiRequestService } from '../../_request.js';

export async function reqPlaylistResourceItemSoundbiteAddFirst(
  api: ApiRequestService,
  playlist_id_text: string,
  item_soundbite_id_text: string
) {
  return api.apiRequest<DTOPlaylistResource>({
    path: `/playlist/${playlist_id_text}/item-soundbite/${item_soundbite_id_text}/first`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqPlaylistResourceItemSoundbiteAddBetween(
  api: ApiRequestService,
  playlist_id_text: string,
  item_soundbite_id_text: string,
  params: BetweenParams
) {
  return api.apiRequest<DTOPlaylistResource>({
    path: `/playlist/${playlist_id_text}/item-soundbite/${item_soundbite_id_text}/between`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqPlaylistResourceItemSoundbiteAddLast(
  api: ApiRequestService,
  playlist_id_text: string,
  item_soundbite_id_text: string
) {
  return api.apiRequest<DTOPlaylistResource>({
    path: `/playlist/${playlist_id_text}/item-soundbite/${item_soundbite_id_text}/last`,
    method: 'POST',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqPlaylistResourceItemSoundbiteDelete(
  api: ApiRequestService,
  playlist_id_text: string,
  item_soundbite_id_text: string
) {
  return api.apiRequest<void>({
    path: `/playlist/${playlist_id_text}/item-soundbite/${item_soundbite_id_text}`,
    method: 'DELETE',
    config: {
      withCredentials: true,
    },
  });
}
