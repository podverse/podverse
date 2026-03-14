import type { DTOItem, LiveItemStatus } from '@podverse/helpers';

import type {
  ApiListResponse,
  QueryParamsCategoryRecent,
  QueryParamsCategoryTop,
  QueryParamsGetManyPartial,
  QueryParamsGlobalRecent,
  QueryParamsGlobalTop,
  QueryParamsSubscribedRecent,
  QueryParamsSubscribedTop,
} from '../../index.js';
import { emptyApiListResponse } from '../../index.js';
import type { ApiRequestService } from '../_request.js';

export async function reqLiveItemGetManyGlobalRecent(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent,
  liveItemType: LiveItemStatus
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: '/live-item/global/recent',
    method: 'GET',
    config: {
      params: {
        ...params,
        liveItemType,
      },
    },
  });
}

export async function reqLiveItemGetManyGlobalTop(
  api: ApiRequestService,
  params: QueryParamsGlobalTop,
  liveItemType: LiveItemStatus
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: '/live-item/global/top',
    method: 'GET',
    config: {
      params: {
        ...params,
        liveItemType,
      },
    },
  });
}

export async function reqLiveItemGetManyCategoryRecent(
  api: ApiRequestService,
  params: QueryParamsCategoryRecent,
  liveItemType: LiveItemStatus
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: '/live-item/category/recent',
    method: 'GET',
    config: {
      params: {
        ...params,
        liveItemType,
      },
    },
  });
}

export async function reqLiveItemGetManyCategoryTop(
  api: ApiRequestService,
  params: QueryParamsCategoryTop,
  liveItemType: LiveItemStatus
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: '/live-item/category/top',
    method: 'GET',
    config: {
      params: {
        ...params,
        liveItemType,
      },
    },
  });
}

export async function reqLiveItemGetManySubscribedRecent(
  api: ApiRequestService,
  params: QueryParamsSubscribedRecent,
  liveItemType: LiveItemStatus
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: '/live-item/subscribed/recent',
    method: 'GET',
    config: {
      params: {
        ...params,
        liveItemType,
      },
      withCredentials: true,
    },
  });
}

export async function reqLiveItemGetManySubscribedTop(
  api: ApiRequestService,
  params: QueryParamsSubscribedTop,
  liveItemType: LiveItemStatus
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: '/live-item/subscribed/top',
    method: 'GET',
    config: {
      params: {
        ...params,
        liveItemType,
      },
      withCredentials: true,
    },
  });
}

export async function reqLiveItemGetMany(
  api: ApiRequestService,
  params: QueryParamsGetManyPartial,
  liveItemType: LiveItemStatus
) {
  const { type, sort, range, category, page, medium } = params;

  if (type === 'category' && category) {
    if (sort === 'recent') {
      return reqLiveItemGetManyCategoryRecent(
        api,
        {
          page,
          medium,
          category,
        },
        liveItemType
      );
    } else if (sort === 'top' && range) {
      return reqLiveItemGetManyCategoryTop(
        api,
        {
          page,
          medium,
          range,
          category,
        },
        liveItemType
      );
    }
  } else if (type === 'global') {
    if (sort === 'recent') {
      return reqLiveItemGetManyGlobalRecent(
        api,
        {
          page,
          medium,
        },
        liveItemType
      );
    } else if (sort === 'top' && range) {
      return reqLiveItemGetManyGlobalTop(
        api,
        {
          page,
          medium,
          range,
        },
        liveItemType
      );
    }
  } else if (type === 'subscribed') {
    if (sort === 'recent') {
      return reqLiveItemGetManySubscribedRecent(
        api,
        {
          page,
          medium,
        },
        liveItemType
      );
    } else if (sort === 'top' && range) {
      return reqLiveItemGetManySubscribedTop(
        api,
        {
          page,
          medium,
          range,
        },
        liveItemType
      );
    }
  }

  return Promise.resolve(emptyApiListResponse);
}

export async function reqLiveItemGetManyByChannel(
  api: ApiRequestService,
  channelIdOrIdText: string
) {
  return api.apiRequest<DTOItem[]>({
    path: `/live-item/channel/${channelIdOrIdText}`,
    method: 'GET',
  });
}
