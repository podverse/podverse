import type { DTOClip } from '@podverse/helpers';
import type { ApiRequestService } from '../_request.js';
import type { ApiListResponse } from '../_response.js';
import { emptyApiListResponse } from '../_response.js';
import type {
  QueryParamsCategoryRecent,
  QueryParamsCategoryTop,
  QueryParamsGetManyPartial,
  QueryParamsGlobalRecent,
  QueryParamsGlobalTop,
  QueryParamsIndividualList,
  QueryParamsPage,
  QueryParamsPageRange,
  QueryParamsSubscribedRecent,
  QueryParamsSubscribedTop,
} from '../queryParams.js';

export type ReqClipCreateParams = {
  item_id_text: string;
  sharable_status_id: number;
  title?: string | null;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
};

export async function reqClipCreate(api: ApiRequestService, params: ReqClipCreateParams) {
  return api.apiRequest<DTOClip>({
    path: '/clip',
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqClipUpdate(
  api: ApiRequestService,
  clip_id_text: string,
  params: ReqClipCreateParams
) {
  return api.apiRequest<DTOClip>({
    path: `/clip/${clip_id_text}`,
    method: 'PATCH',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

export async function reqClipDelete(api: ApiRequestService, clip_id_text: string) {
  return api.apiRequest<{ success: boolean }>({
    path: `/clip/${clip_id_text}`,
    method: 'DELETE',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqClipGet(api: ApiRequestService, clip_id_text: string) {
  return api.apiRequest<DTOClip>({
    path: `/clip/${clip_id_text}`,
    method: 'GET',
    config: {
      withCredentials: true,
    },
  });
}

export async function reqClipGetManyPublicRecent(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: '/clip/public/recent/',
    method: 'GET',
    config: {
      params: {
        page: params.page,
        medium: params.medium,
      },
    },
  });
}

export async function reqClipGetManyPublicOldest(
  api: ApiRequestService,
  params: QueryParamsGlobalRecent
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: '/clip/public/oldest/',
    method: 'GET',
    config: {
      params: {
        page: params.page,
        medium: params.medium,
      },
    },
  });
}

export async function reqClipGetManyPublicTop(
  api: ApiRequestService,
  params: QueryParamsGlobalTop
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: '/clip/public/top/',
    method: 'GET',
    config: {
      params: {
        page: params.page,
        medium: params.medium,
        range: params.range,
      },
    },
  });
}

export async function reqClipGetManyByCategoryPublicRecent(
  api: ApiRequestService,
  params: QueryParamsCategoryRecent
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: '/clip/public/category/recent/',
    method: 'GET',
    config: {
      params: {
        page: params.page,
        medium: params.medium,
        category: params.category,
      },
    },
  });
}

export async function reqClipGetManyByCategoryPublicOldest(
  api: ApiRequestService,
  params: QueryParamsCategoryRecent
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: '/clip/public/category/oldest/',
    method: 'GET',
    config: {
      params: {
        page: params.page,
        medium: params.medium,
        category: params.category,
      },
    },
  });
}

export async function reqClipGetManyByCategoryPublicTop(
  api: ApiRequestService,
  params: QueryParamsCategoryTop
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: '/clip/public/category/top/',
    method: 'GET',
    config: {
      params: {
        page: params.page,
        medium: params.medium,
        category: params.category,
        range: params.range,
      },
    },
  });
}

export async function reqClipGetManySubscribedPublicRecent(
  api: ApiRequestService,
  params: QueryParamsSubscribedRecent
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: '/clip/public/subscribed/recent',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqClipGetManySubscribedPublicTop(
  api: ApiRequestService,
  params: QueryParamsSubscribedTop
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: '/clip/public/subscribed/top',
    method: 'GET',
    config: {
      params,
      withCredentials: true,
    },
  });
}

export async function reqClipGetManyPublic(
  api: ApiRequestService,
  params: QueryParamsGetManyPartial
) {
  const { type, sort, range, category, page, medium } = params;

  if (type === 'category' && category) {
    if (sort === 'recent') {
      return reqClipGetManyByCategoryPublicRecent(api, {
        page,
        medium,
        category,
      });
    } else if (sort === 'oldest') {
      return reqClipGetManyByCategoryPublicOldest(api, {
        page,
        medium,
        category,
      });
    } else if (sort === 'top' && range) {
      return reqClipGetManyByCategoryPublicTop(api, {
        page,
        medium,
        range,
        category,
      });
    }
  } else if (type === 'global') {
    if (sort === 'recent') {
      return reqClipGetManyPublicRecent(api, {
        page,
        medium,
      });
    } else if (sort === 'oldest') {
      return reqClipGetManyPublicOldest(api, {
        page,
        medium,
      });
    } else if (sort === 'top' && range) {
      return reqClipGetManyPublicTop(api, {
        page,
        medium,
        range,
      });
    }
  } else if (type === 'subscribed') {
    if (sort === 'recent') {
      return reqClipGetManySubscribedPublicRecent(api, {
        page,
        medium,
      });
    } else if (sort === 'top' && range) {
      return reqClipGetManySubscribedPublicTop(api, {
        page,
        medium,
        range,
      });
    }
  }

  return Promise.resolve(emptyApiListResponse);
}

export async function reqClipGetManyByChannelPublicRecent(
  api: ApiRequestService,
  channel_id_text: string,
  params: QueryParamsPage
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: `/clip/public/channel/recent/${channel_id_text}`,
    method: 'GET',
    config: {
      params: {
        page: params.page,
      },
    },
  });
}

export async function reqClipGetManyByChannelPublicOldest(
  api: ApiRequestService,
  channel_id_text: string,
  params: QueryParamsPage
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: `/clip/public/channel/oldest/${channel_id_text}`,
    method: 'GET',
    config: {
      params: {
        page: params.page,
      },
    },
  });
}

export async function reqClipGetManyByChannelPublicTop(
  api: ApiRequestService,
  channel_id_text: string,
  params: QueryParamsPageRange
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: `/clip/public/channel/top/${channel_id_text}`,
    method: 'GET',
    config: {
      params: {
        page: params.page,
      },
    },
  });
}

export async function reqClipGetManyByChannelPublic(
  api: ApiRequestService,
  params: QueryParamsIndividualList
) {
  const { idOrIdText, sort, range, page } = params;

  if (sort === 'recent') {
    return reqClipGetManyByChannelPublicRecent(api, idOrIdText, {
      page,
    });
  } else if (sort === 'oldest') {
    return reqClipGetManyByChannelPublicOldest(api, idOrIdText, {
      page,
    });
  } else if (sort === 'top' && range) {
    return reqClipGetManyByChannelPublicTop(api, idOrIdText, {
      page,
      range,
    });
  }

  return Promise.resolve(emptyApiListResponse);
}

export async function reqClipGetManyByItemPublicRecent(
  api: ApiRequestService,
  item_id_text: string,
  params: QueryParamsPage
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: `/clip/public/item/recent/${item_id_text}`,
    method: 'GET',
    config: {
      params: {
        page: params.page,
      },
    },
  });
}

export async function reqClipGetManyByItemPublicOldest(
  api: ApiRequestService,
  item_id_text: string,
  params: QueryParamsPage
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: `/clip/public/item/oldest/${item_id_text}`,
    method: 'GET',
    config: {
      params: {
        page: params.page,
      },
    },
  });
}

export async function reqClipGetManyByItemPublicTop(
  api: ApiRequestService,
  item_id_text: string,
  params: QueryParamsPageRange
) {
  return api.apiRequest<ApiListResponse<DTOClip>>({
    path: `/clip/public/item/top/${item_id_text}`,
    method: 'GET',
    config: {
      params: {
        page: params.page,
      },
    },
  });
}

export async function reqClipGetManyByItemPublic(
  api: ApiRequestService,
  params: QueryParamsIndividualList
) {
  const { idOrIdText, sort, range, page } = params;

  if (sort === 'recent') {
    return reqClipGetManyByItemPublicRecent(api, idOrIdText, {
      page,
    });
  } else if (sort === 'oldest') {
    return reqClipGetManyByItemPublicOldest(api, idOrIdText, {
      page,
    });
  } else if (sort === 'top' && range) {
    return reqClipGetManyByItemPublicTop(api, idOrIdText, {
      page,
      range,
    });
  }

  return Promise.resolve(emptyApiListResponse);
}
