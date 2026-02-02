import type { ApiRequestService } from '../_request.js';
import type { ApiMessageResponse } from '../_response.js';

export async function reqMQRSSAddOnDemand(
  api: ApiRequestService,
  params: {
    url: string;
    podcast_index_id: number;
  }
) {
  return api.apiRequest<ApiMessageResponse>({
    path: '/mq/rss/add/on-demand',
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: {
      url: params.url,
      podcast_index_id: params.podcast_index_id,
    },
  });
}

export async function reqMQRSSRefreshOnDemand(
  api: ApiRequestService,
  params: {
    url: string;
    podcast_index_id: number;
  }
) {
  return api.apiRequest<ApiMessageResponse>({
    path: '/mq/rss/refresh/on-demand',
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: {
      url: params.url,
      podcast_index_id: params.podcast_index_id,
    },
  });
}
