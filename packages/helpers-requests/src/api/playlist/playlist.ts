import type { QueryParamsQueueMedium } from '@podverse/helpers';
import type { DTOPlaylist, DTOPlaylistLikes } from '@podverse/helpers';

import type { ApiListResponse } from '../../index.js';
import { emptyApiListResponse } from '../../index.js';
import type { ApiRequestService } from '../_request.js';
import type {
  QueryParamsGlobalRecent,
  QueryParamsGlobalTop,
  QueryParamsPlaylists,
} from '../queryParams.js';

export async function reqPlaylistGet(api: ApiRequestService, id_text: string) {
  return api.apiRequest<DTOPlaylist>({
    path: `/playlist/${id_text}`,
    method: 'GET',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqPlaylistGetManyPublicTop(
  api: ApiRequestService,
  params: QueryParamsGlobalTop
) {
  return api.apiRequest<ApiListResponse<DTOPlaylist>>({
    path: '/playlist/public/top',
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqPlaylistGetManyPrivateTop(
  api: ApiRequestService,
  params: QueryParamsGlobalTop
) {
  return api.apiRequest<ApiListResponse<DTOPlaylist>>({
    path: '/playlist/private/top',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqPlaylistGetManyPrivateRecent(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent
) {
  return api.apiRequest<ApiListResponse<DTOPlaylist>>({
    path: '/playlist/private/recent',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqPlaylistGetManyPrivateOldest(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent
) {
  return api.apiRequest<ApiListResponse<DTOPlaylist>>({
    path: '/playlist/private/oldest',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqPlaylistGetManyPrivateAZ(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent
) {
  return api.apiRequest<ApiListResponse<DTOPlaylist>>({
    path: '/playlist/private/az',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqPlaylistGetManyPrivateFollowedTop(
  api: ApiRequestService,
  params: QueryParamsGlobalTop
) {
  return api.apiRequest<ApiListResponse<DTOPlaylist>>({
    path: '/playlist/private/followed/top',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqPlaylistGetManyPrivateFollowedRecent(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent
) {
  return api.apiRequest<ApiListResponse<DTOPlaylist>>({
    path: '/playlist/private/followed/recent',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqPlaylistGetManyPrivateFollowedOldest(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent
) {
  return api.apiRequest<ApiListResponse<DTOPlaylist>>({
    path: '/playlist/private/followed/oldest',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqPlaylistGetManyPrivateFollowedAZ(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent
) {
  return api.apiRequest<ApiListResponse<DTOPlaylist>>({
    path: '/playlist/private/followed/az',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqPlaylistGetMany(api: ApiRequestService, params: QueryParamsPlaylists) {
  if (params.type === 'public') {
    return reqPlaylistGetManyPublicTop(api, {
      page: params.page,
      medium: params.medium,
      range: params.range ?? 'week',
    });
  } else if (params.type === 'private') {
    if (params.sort === 'recent') {
      return reqPlaylistGetManyPrivateRecent(api, {
        page: params.page,
        medium: params.medium,
      });
    } else if (params.sort === 'oldest') {
      return reqPlaylistGetManyPrivateOldest(api, {
        page: params.page,
        medium: params.medium,
      });
    } else if (params.sort === 'a_z') {
      return reqPlaylistGetManyPrivateAZ(api, {
        page: params.page,
        medium: params.medium,
      });
    } else if (params.sort === 'top') {
      return reqPlaylistGetManyPrivateTop(api, {
        page: params.page,
        medium: params.medium,
        range: params.range ?? 'week',
      });
    }
  } else if (params.type === 'private_followed') {
    if (params.sort === 'recent') {
      return reqPlaylistGetManyPrivateFollowedRecent(api, {
        page: params.page,
        medium: params.medium,
      });
    } else if (params.sort === 'oldest') {
      return reqPlaylistGetManyPrivateFollowedOldest(api, {
        page: params.page,
        medium: params.medium,
      });
    } else if (params.sort === 'a_z') {
      return reqPlaylistGetManyPrivateFollowedAZ(api, {
        page: params.page,
        medium: params.medium,
      });
    } else if (params.sort === 'top') {
      return reqPlaylistGetManyPrivateFollowedTop(api, {
        page: params.page,
        medium: params.medium,
        range: params.range ?? 'week',
      });
    }
  }

  return emptyApiListResponse;
}

export type ReqPlaylistGetAllLikesPrivateParams = {
  /** When false, adds `?include_resources=0` to omit playlist_resources (metadata-only). */
  includeResources?: boolean;
};

export async function reqPlaylistGetAllLikesPrivate(
  api: ApiRequestService,
  params: ReqPlaylistGetAllLikesPrivateParams = {}
) {
  const includeResources = params.includeResources !== false;
  const path = includeResources
    ? '/playlist/private/likes'
    : '/playlist/private/likes?include_resources=0';
  return api.apiRequest<DTOPlaylistLikes[]>({
    path,
    method: 'GET',
    config: {
      withCredentials: true,
    },
  });
}

export type ReqPlaylistLikesMembershipParams = {
  item_id_texts?: string[];
  clip_id_texts?: string[];
  add_by_rss_hash_ids?: string[];
};

export async function reqPlaylistLikesMembership(
  api: ApiRequestService,
  params: ReqPlaylistLikesMembershipParams
) {
  return api.apiRequest<{
    item_id_texts: string[];
    clip_id_texts: string[];
    add_by_rss_hash_ids: string[];
  }>({
    path: '/playlist/private/likes/membership',
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export type ReqPlaylistToggleLikeParams =
  | {
      resource_type: 'item';
      item_id_text: string;
    }
  | {
      resource_type: 'clip';
      clip_id_text: string;
    }
  | {
      resource_type: 'add_by_rss';
      add_by_rss_hash_id?: string;
      add_by_rss_resource_data: object;
    };

export async function reqPlaylistToggleLike(
  api: ApiRequestService,
  params: ReqPlaylistToggleLikeParams
) {
  return api.apiRequest<{
    liked: boolean;
    resource_type: 'item' | 'clip' | 'add_by_rss';
  }>({
    path: '/playlist/private/likes/toggle',
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export type ReqPlaylistCreateParams = {
  title: string;
  description?: string;
  medium: QueryParamsQueueMedium;
  sharable_status_id: number;
};

export async function reqPlaylistCreate(api: ApiRequestService, params: ReqPlaylistCreateParams) {
  return api.apiRequest<DTOPlaylist>({
    path: '/playlist',
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export type ReqPlaylistEditParams = {
  id_text: string;
  title: string;
  description?: string;
  sharable_status_id: number;
};

export async function reqPlaylistEdit(api: ApiRequestService, params: ReqPlaylistEditParams) {
  return api.apiRequest<DTOPlaylist>({
    path: `/playlist/${params.id_text}`,
    method: 'PATCH',
    config: {
      withCredentials: true,
    },
    data: {
      title: params.title,
      description: params.description,
      sharable_status_id: params.sharable_status_id,
    },
  });
}

export async function reqPlaylistDelete(api: ApiRequestService, id_text: string) {
  return api.apiRequest<void>({
    path: `/playlist/${id_text}`,
    method: 'DELETE',
    config: {
      withCredentials: true,
    },
  });
}
