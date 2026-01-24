import { ApiRequestService } from '../_request';
import { ApiListResponse, emptyApiListResponse } from '../_response';
import { DTOChannel } from '../../../../dtos';
import { QueryParamsCategoryRecent, QueryParamsCategoryTop, QueryParamsGetMany,
  QueryParamsGlobalRecent, QueryParamsGlobalTop, QueryParamsSubscribedAZ,
  QueryParamsSubscribedRecent, QueryParamsSubscribedTop } from '../queryParams';

export async function reqChannelGetByIdOrIdText(
  api: ApiRequestService,
  idOrIdText: number | string,
) {
  return api.apiRequest<DTOChannel>({
    path: `/channel/${idOrIdText}`,
    method: 'GET',
  });
}

export async function reqChannelGetByPodcastIndexId(
  api: ApiRequestService,
  podcast_index_id: number | string,
) {
  return api.apiRequest<DTOChannel>({
    path: `/channel/podcast-index/${podcast_index_id}`,
    method: 'GET',
  });
}

export async function reqChannelGetManyGlobalRecent(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent,
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
  params: QueryParamsGlobalTop,
) {
  return api.apiRequest<ApiListResponse<DTOChannel>>({
    path: '/channel/global/top',
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqChannelGetManyCategoryRecent(
  api: ApiRequestService,
  params: QueryParamsCategoryRecent,
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
  params: QueryParamsCategoryTop,
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
  params: QueryParamsSubscribedAZ,
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
  params: QueryParamsSubscribedRecent,
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
  params: QueryParamsSubscribedTop,
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

export async function reqChannelGetMany(
  api: ApiRequestService,
  params: QueryParamsGetMany,
) {
  const { type, sort, range, category, page, medium } = params;

  if (type === 'category' && category) {
    if (sort === 'recent') {
      return reqChannelGetManyCategoryRecent(
        api,
        {
          page,
          medium,
          category,
        },
      );
    } else if (sort === 'top' && range) {
      return reqChannelGetManyCategoryTop(
        api,
        {
          page,
          medium,
          range,
          category,
        },
      );
    }
  } else if (type === 'global') {
    if (sort === 'recent') {
      return reqChannelGetManyGlobalRecent(
        api,
        {
          page,
          medium,
        },
      );
    } else if (sort === 'top' && range) {
      return reqChannelGetManyGlobalTop(
        api,
        {
          page,
          medium,
          range,
        },
      );
    }
  } else if (type === 'subscribed') {
    if (sort === 'a_z') {
      return reqChannelGetManySubscribedAZ(
        api,
        {
          page,
          medium,
        },
      );
    } else if (sort === 'recent') {
      return reqChannelGetManySubscribedRecent(
        api,
        {
          page,
          medium,
        },
      );
    } else if (sort === 'top' && range) {
      return reqChannelGetManySubscribedTop(
        api,
        {
          page,
          medium,
          range,
        },
      );
    }
  }

  return Promise.resolve(emptyApiListResponse);
}
