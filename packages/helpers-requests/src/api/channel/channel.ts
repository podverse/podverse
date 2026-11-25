import type {
  DTOAddByRSSMatchFeedRef,
  DTOAddByRSSMatchResponse,
  DTOChannel,
  DTOChannelDirectoryMatch,
  QueryParamsPodcastIndexSearchMedium,
} from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';
import type { ApiListResponse } from '../_response.js';
import { emptyApiListResponse } from '../_response.js';
import type {
  QueryParamsCategoryRecent,
  QueryParamsCategoryTop,
  QueryParamsGetMany,
  QueryParamsGlobalRecent,
  QueryParamsGlobalTop,
  QueryParamsSubscribedAZ,
  QueryParamsSubscribedRecent,
  QueryParamsSubscribedTop,
} from '../queryParams.js';

export async function reqChannelGetByIdOrIdText(
  api: ApiRequestService,
  idOrIdText: number | string
) {
  return api.apiRequest<DTOChannel>({
    path: `/channel/${idOrIdText}`,
    method: 'GET',
  });
}

export async function reqChannelGetByPodcastIndexId(
  api: ApiRequestService,
  podcast_index_id: number | string
) {
  // API returns the channel or `null` when it is not parsed-ready (see ChannelController.getbyPodcastIndexId).
  return api.apiRequest<DTOChannel | null>({
    path: `/channel/podcast-index/${podcast_index_id}`,
    method: 'GET',
  });
}

export async function reqChannelAddByRSSMatch(
  api: ApiRequestService,
  body: { feeds: DTOAddByRSSMatchFeedRef[] }
): Promise<DTOAddByRSSMatchResponse> {
  return api.apiRequest<DTOAddByRSSMatchResponse>({
    path: '/channel/add-by-rss-match',
    method: 'POST',
    data: body,
  });
}

export async function reqChannelGetDirectoryMatch(
  api: ApiRequestService,
  params: { feed_guid: string; feed_url?: string | null }
) {
  // API returns the match or `null` when the guid is not a directory channel.
  return api.apiRequest<DTOChannelDirectoryMatch | null>({
    path: '/channel/directory-match',
    method: 'GET',
    config: {
      params: {
        feed_guid: params.feed_guid,
        ...(params.feed_url ? { feed_url: params.feed_url } : {}),
      },
    },
  });
}

export async function reqChannelGetManyGlobalRecent(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent
) {
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: '/channel/global/recent',
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqChannelGetManyGlobalTop(
  api: ApiRequestService,
  params: QueryParamsGlobalTop
) {
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: '/channel/global/top',
    method: 'GET',
    config: {
      params,
    },
  });
}

/**
 * Title search over stored channels. Only an instance with a Podcast Index id allowlist answers.
 */
export async function reqChannelSearchByTitle(
  api: ApiRequestService,
  params: { q: string; medium: QueryParamsPodcastIndexSearchMedium; page: number }
) {
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: '/channel/search/title',
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqChannelGetManyCategoryRecent(
  api: ApiRequestService,
  params: QueryParamsCategoryRecent
) {
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: '/channel/category/recent',
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqChannelGetManyCategoryTop(
  api: ApiRequestService,
  params: QueryParamsCategoryTop
) {
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: '/channel/category/top',
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqChannelGetManySubscribedAZ(
  api: ApiRequestService,
  params: QueryParamsSubscribedAZ
) {
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: '/channel/subscribed/az',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqChannelGetManySubscribedRecent(
  api: ApiRequestService,
  params: QueryParamsSubscribedRecent
) {
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: '/channel/subscribed/recent',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqChannelGetManySubscribedTop(
  api: ApiRequestService,
  params: QueryParamsSubscribedTop
) {
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: '/channel/subscribed/top',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqChannelGetMany(api: ApiRequestService, params: QueryParamsGetMany) {
  const { type, sort, range, category, page, medium } = params;

  if (type === 'category' && category) {
    if (sort === 'recent') {
      return reqChannelGetManyCategoryRecent(api, {
        page,
        medium,
        category,
      });
    } else if (sort === 'top' && range) {
      return reqChannelGetManyCategoryTop(api, {
        page,
        medium,
        range,
        category,
      });
    }
  } else if (type === 'global') {
    if (sort === 'recent') {
      return reqChannelGetManyGlobalRecent(api, {
        page,
        medium,
      });
    } else if (sort === 'top' && range) {
      return reqChannelGetManyGlobalTop(api, {
        page,
        medium,
        range,
      });
    }
  } else if (type === 'subscribed') {
    if (sort === 'a_z') {
      return reqChannelGetManySubscribedAZ(api, {
        page,
        medium,
      });
    } else if (sort === 'recent') {
      return reqChannelGetManySubscribedRecent(api, {
        page,
        medium,
      });
    } else if (sort === 'top' && range) {
      return reqChannelGetManySubscribedTop(api, {
        page,
        medium,
        range,
      });
    }
  }

  return Promise.resolve(emptyApiListResponse);
}
