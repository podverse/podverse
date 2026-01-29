import { ApiRequestService } from '../../_request';
import { DTOPlaylistResource, PlaylistResourceIdTextOptions } from '@podverse/helpers';
import { ApiListResponse } from '../../_response';
import { QueryParamsPlaylistResources } from '../../queryParams';

export async function reqPlaylistResourceGetAllByPlaylistIdTextPrivate(
  api: ApiRequestService,
  playlist_id_text: string
) {
  return api.apiRequest<DTOPlaylistResource[]>({
    path: `/playlist/${playlist_id_text}/resources/private-all`,
    method: 'GET',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqPlaylistResourceGetManyByPlaylistIdText(
  api: ApiRequestService,
  playlist_id_text: string,
  params: QueryParamsPlaylistResources
) {
  return api.apiRequest<ApiListResponse<DTOPlaylistResource>>({
    path: `/playlist/${playlist_id_text}/resources`,
    method: 'GET',
    config: {
      withCredentials: true,
      params,
    },
  });
}

export async function reqPlaylistResourceGetManyForQueueByListPosition(
  api: ApiRequestService,
  playlist_id_text: string,
  idTextOptions: PlaylistResourceIdTextOptions,
  direction: 'forward' | 'backward'
) {
  return api.apiRequest<ApiListResponse<DTOPlaylistResource>>({
    path: `/playlist/${playlist_id_text}/resources/queue-by-list-position`,
    method: 'GET',
    config: {
      params: {
        ...idTextOptions,
        direction,
      },
      withCredentials: true,
    },
  });
}

export async function reqPlaylistResourceGetManyByShuffle(
  api: ApiRequestService,
  playlist_id_text: string,
  shuffleHash: string,
  page: number
) {
  return api.apiRequest<ApiListResponse<DTOPlaylistResource>>({
    path: `/playlist/${playlist_id_text}/resources/shuffle`,
    method: 'GET',
    config: {
      params: {
        shuffleHash,
        page,
      },
      withCredentials: true,
    },
  });
}
