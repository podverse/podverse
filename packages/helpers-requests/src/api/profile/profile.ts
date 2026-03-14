import type { DTOChannel, DTOClip, DTOPlaylist } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';
import type { ApiListResponse } from '../_response.js';
import type { QueryParamsPage } from '../queryParams.js';

export type QueryParamsProfileContent = QueryParamsPage & {
  account_id_text: string;
};

// Public profile routes

export async function reqProfilePodcastsAZ(
  api: ApiRequestService,
  params: QueryParamsProfileContent
): Promise<ApiListResponse<DTOChannel>> {
  const { account_id_text, page } = params;
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: `/profile/${account_id_text}/podcasts/az`,
    method: 'GET',
    config: {
      params: { page },
    },
  });
}

export async function reqProfileAlbumsAZ(
  api: ApiRequestService,
  params: QueryParamsProfileContent
): Promise<ApiListResponse<DTOChannel>> {
  const { account_id_text, page } = params;
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: `/profile/${account_id_text}/albums/az`,
    method: 'GET',
    config: {
      params: { page },
    },
  });
}

export async function reqProfilePlaylistsAZ(
  api: ApiRequestService,
  params: QueryParamsProfileContent
): Promise<ApiListResponse<DTOPlaylist>> {
  const { account_id_text, page } = params;
  return api.apiRequest<ApiListResponse<DTOPlaylist>>({
    path: `/profile/${account_id_text}/playlists/az`,
    method: 'GET',
    config: {
      params: { page },
    },
  });
}

export async function reqProfileClipsRecent(
  api: ApiRequestService,
  params: QueryParamsProfileContent
): Promise<ApiListResponse<DTOClip>> {
  const { account_id_text, page } = params;
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: `/profile/${account_id_text}/clips/recent`,
    method: 'GET',
    config: {
      params: { page },
    },
  });
}

// My profile routes (authenticated)

export async function reqMyProfilePodcastsAZ(
  api: ApiRequestService,
  params: QueryParamsPage
): Promise<ApiListResponse<DTOChannel>> {
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: '/my-profile/podcasts/az',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqMyProfileAlbumsAZ(
  api: ApiRequestService,
  params: QueryParamsPage
): Promise<ApiListResponse<DTOChannel>> {
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: '/my-profile/albums/az',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqMyProfilePlaylistsAZ(
  api: ApiRequestService,
  params: QueryParamsPage
): Promise<ApiListResponse<DTOPlaylist>> {
  return api.apiRequest<ApiListResponse<DTOPlaylist>>({
    path: '/my-profile/playlists/az',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqMyProfileClipsRecent(
  api: ApiRequestService,
  params: QueryParamsPage
): Promise<ApiListResponse<DTOClip>> {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: '/my-profile/clips/recent',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}
