import type { ApiRequestService } from '../_request.js';

export type ReqAccountAddByRSSFeedLimitResponse = {
  data: { maxAddByRSSFeeds: number };
};

export async function reqAccountAddByRSSFeedLimitGet(api: ApiRequestService) {
  return api.apiRequest<ReqAccountAddByRSSFeedLimitResponse>({
    path: '/account/add-by-rss/feed-limit',
    method: 'GET',
    config: { withCredentials: true },
  });
}
