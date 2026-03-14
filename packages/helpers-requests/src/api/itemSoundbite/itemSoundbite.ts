import type { DTOItemSoundbite } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';
import type { ApiListResponse } from '../_response.js';
import type {
  QueryParamsItemSoundbitesByChannel,
  QueryParamsItemSoundbitesByItem,
} from '../queryParams.js';

export type ReqClipCreateParams = {
  item_id_text: string;
  sharable_status_id: number;
  title?: string | null;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
};

export async function reqItemSoundbiteGet(api: ApiRequestService, item_soundbite_id_text: string) {
  return api.apiRequest<DTOItemSoundbite>({
    path: `/item-soundbite/${item_soundbite_id_text}`,
    method: 'GET',
  });
}

export async function reqItemSoundbiteGetManyByChannelIdText(
  api: ApiRequestService,
  channel_id_text: string,
  params: QueryParamsItemSoundbitesByChannel
) {
  return api.apiRequest<ApiListResponse<DTOItemSoundbite>>({
    path: `/item-soundbite/channel/${channel_id_text}`,
    method: 'GET',
    config: {
      params: {
        ...(params.page ? { page: params.page } : {}),
        ...(params.sort ? { sort: params.sort } : {}),
      },
    },
  });
}

export async function reqItemSoundbiteGetManyByItemIdText(
  api: ApiRequestService,
  item_id_text: string,
  params: QueryParamsItemSoundbitesByItem
) {
  return api.apiRequest<ApiListResponse<DTOItemSoundbite>>({
    path: `/item-soundbite/item/${item_id_text}`,
    method: 'GET',
    config: {
      params: {
        ...(params.page ? { page: params.page } : {}),
        ...(params.sort ? { sort: params.sort } : {}),
      },
    },
  });
}
