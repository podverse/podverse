import { ApiRequestService } from '../_request';
import { ApiListResponse, emptyApiListResponse } from '../_response';
import { DTOItem, DTOItemChapter, DTOItemQueueItem } from '../../../../dtos';
import { QueryDirection, QueryParamsCategoryRecent, QueryParamsCategoryTop,
  QueryParamsGetManyPartial, QueryParamsGlobalRecent, QueryParamsGlobalTop,
  QueryParamsIndividualList, QueryParamsIndividualListMusic, QueryParamsPage, QueryParamsPageRange,
  QueryParamsShuffle,
  QueryParamsSubscribedRecent, QueryParamsSubscribedTop } from '../queryParams';

export async function reqItemGetByIdOrIdText(
  api: ApiRequestService,
  idOrIdText: string,
) {
  return api.apiRequest<DTOItem>({
    path: `/item/${idOrIdText}`,
    method: 'GET',
  });
}

export async function reqItemGetManyGlobalRecent(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent,
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: '/item/global/recent',
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqItemGetManyGlobalTop(
  api: ApiRequestService,
  params: QueryParamsGlobalTop,
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: '/item/global/top',
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqItemGetManyCategoryRecent(
  api: ApiRequestService,
  params: QueryParamsCategoryRecent,
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: '/item/category/recent',
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqItemGetManyCategoryTop(
  api: ApiRequestService,
  params: QueryParamsCategoryTop,
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: '/item/category/top',
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqItemGetManySubscribedRecent(
  api: ApiRequestService,
  params: QueryParamsSubscribedRecent,
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: '/item/subscribed/recent',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqItemGetManySubscribedTop(
  api: ApiRequestService,
  params: QueryParamsSubscribedTop,
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: '/item/subscribed/top',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqItemGetMany(
  api: ApiRequestService,
  params: QueryParamsGetManyPartial,
) {
  const { type, sort, range, category, page, medium } = params;

  if (type === 'category' && category) {
    if (sort === 'recent') {
      return reqItemGetManyCategoryRecent(
        api,
        {
          page,
          medium,
          category,
        },
      );
    } else if (sort === 'top' && range) {
      return reqItemGetManyCategoryTop(
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
      return reqItemGetManyGlobalRecent(
        api,
        {
          page,
          medium,
        },
      );
    } else if (sort === 'top' && range) {
      return reqItemGetManyGlobalTop(
        api,
        {
          page,
          medium,
          range,
        },
      );
    }
  } else if (type === 'subscribed') {
    if (sort === 'recent') {
      return reqItemGetManySubscribedRecent(
        api,
        {
          page,
          medium,
        },
      );
    } else if (sort === 'top' && range) {
      return reqItemGetManySubscribedTop(
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

export async function reqItemGetManyByChannelRecent(
  api: ApiRequestService,
  channelIdOrIdText: string,
  params: QueryParamsPage,
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: `/item/channel/recent/${channelIdOrIdText}`,
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqItemGetManyByChannelOldest(
  api: ApiRequestService,
  channelIdOrIdText: string,
  params: QueryParamsPage,
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: `/item/channel/oldest/${channelIdOrIdText}`,
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqItemGetManyByChannelTop(
  api: ApiRequestService,
  channelIdOrIdText: string,
  params: QueryParamsPageRange,
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: `/item/channel/top/${channelIdOrIdText}`,
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqItemGetManyByChannel(
  api: ApiRequestService,
  params: QueryParamsIndividualList,
) {
  const { idOrIdText, sort, range, page } = params;

  if (sort === 'recent') {
    return reqItemGetManyByChannelRecent(
      api,
      idOrIdText,
      {
        page,
      },
    );
  } else if (sort === 'oldest') {
    return reqItemGetManyByChannelOldest(
      api,
      idOrIdText,
      {
        page,
      },
    );
  } else if (sort === 'top' && range) {
    return reqItemGetManyByChannelTop(
      api,
      idOrIdText,
      {
        page,
        range,
      },
    );
  }

  return Promise.resolve(emptyApiListResponse);
}

export async function reqItemGetManyByChannelBySeasonForward(
  api: ApiRequestService,
  channelIdOrIdText: string,
  params: QueryParamsPage,
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: `/item/channel/season/forward/${channelIdOrIdText}`,
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqItemGetManyByChannelBySeasonBackward(
  api: ApiRequestService,
  channelIdOrIdText: string,
  params: QueryParamsPage,
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: `/item/channel/season/backward/${channelIdOrIdText}`,
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqItemGetManyByChannelBySeason(
  api: ApiRequestService,
  params: QueryParamsIndividualListMusic,
) {
  const { idOrIdText, sort, range, page } = params;

  if (sort === 'forward') {
    return reqItemGetManyByChannelBySeasonForward(
      api,
      idOrIdText,
      {
        page,
      },
    );
  } else if (sort === 'backward') {
    return reqItemGetManyByChannelBySeasonBackward(
      api,
      idOrIdText,
      {
        page,
      },
    );
  } else if (sort === 'top' && range) {
    return reqItemGetManyByChannelTop(
      api,
      idOrIdText,
      {
        page,
        range,
      },
    );
  }

  return Promise.resolve(emptyApiListResponse);
}

export async function reqItemGetManyByChannelShuffle(
  api: ApiRequestService,
  channelIdOrIdText: string,
  params: QueryParamsShuffle,
) {
  return api.apiRequest<ApiListResponse<DTOItem>>({
    path: `/item/channel/shuffle/${channelIdOrIdText}`,
    method: 'GET',
    config: {
      params,
    },
  });
}

export async function reqItemGetManyForQueueByPubDate(
  api: ApiRequestService,
  idText: string,
  direction: QueryDirection,
) {
  return api.apiRequest<DTOItemQueueItem[]>({
    path: `/item/queue/pub-date/${idText}`,
    method: 'GET',
    config: {
      params: {
        direction,
      },
    },
  });
}

export async function reqItemGetManyForQueueBySeason(
  api: ApiRequestService,
  idText: string,
  direction: QueryDirection,
) {
  return api.apiRequest<DTOItemQueueItem[]>({
    path: `/item/queue/season/${idText}`,
    method: 'GET',
    config: {
      params: {
        direction,
      },
    },
  });
}

export async function reqItemParseAndGetChapters(
  api: ApiRequestService,
  item_id_text: string,
) {
  return api.apiRequest<ApiListResponse<DTOItemChapter>>({
    path: `/item/chapters/${item_id_text}/`,
    method: 'GET',
  });
}
