import type {
  AddByRssSeenListResponse,
  AddByRssSeenMarkEntry,
  AddByRssSeenState,
  ChannelSeenListResponse,
  ChannelSeenMarkEntry,
  ChannelSeenState,
} from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

const pagePath = (basePath: string, page?: number): string => {
  if (page === undefined) {
    return basePath;
  }
  return `${basePath}?page=${encodeURIComponent(String(page))}`;
};

/**
 * Read one bounded page of the account's per-channel seen state.
 *
 * Mobile pages the whole list during background sync so badges work offline; web asks for the page
 * it is rendering. Both stay on this one call rather than asking per channel.
 */
export const reqAccountChannelSeenList = (
  api: ApiRequestService,
  params?: { page?: number }
): Promise<ChannelSeenListResponse> => {
  return api.apiRequest<ChannelSeenListResponse>({
    path: pagePath('/account/channel-seen', params?.page),
    method: 'GET',
    config: { withCredentials: true },
  });
};

/**
 * Read one bounded page of seen state for followed add-by-RSS feeds.
 *
 * Timestamps only. Counting unseen items in a feed the server does not store is the device's job.
 */
export const reqAccountChannelSeenListAddByRss = (
  api: ApiRequestService,
  params?: { page?: number }
): Promise<AddByRssSeenListResponse> => {
  return api.apiRequest<AddByRssSeenListResponse>({
    path: pagePath('/account/channel-seen/add-by-rss', params?.page),
    method: 'GET',
    config: { withCredentials: true },
  });
};

/**
 * Mark channels seen.
 *
 * Omit `last_seen_at` to record now, which is what opening a channel does. Supply it to replay
 * moments a device already recorded — the server keeps whichever is later, so a merge can run on
 * every sync without ever moving state backward.
 */
export const reqAccountChannelSeenMark = async (
  api: ApiRequestService,
  params: { entries: ChannelSeenMarkEntry[] }
): Promise<ChannelSeenState[]> => {
  const response = await api.apiRequest<{ data: ChannelSeenState[] }>({
    path: '/account/channel-seen/mark',
    method: 'POST',
    data: { entries: params.entries },
    config: { withCredentials: true },
  });
  return response.data;
};

/** Mark every followed channel and add-by-RSS feed seen, swept server-side. */
export const reqAccountChannelSeenMarkAll = async (
  api: ApiRequestService
): Promise<{ last_seen_at: string; updated_count: number }> => {
  const response = await api.apiRequest<{
    data: { last_seen_at: string; updated_count: number };
  }>({
    path: '/account/channel-seen/mark-all',
    method: 'POST',
    config: { withCredentials: true },
  });
  return response.data;
};

/** Mark add-by-RSS feeds seen. Returns timestamps only, for the same reason the list does. */
export const reqAccountChannelSeenMarkAddByRss = async (
  api: ApiRequestService,
  params: { entries: AddByRssSeenMarkEntry[] }
): Promise<AddByRssSeenState[]> => {
  const response = await api.apiRequest<{ data: AddByRssSeenState[] }>({
    path: '/account/channel-seen/mark-add-by-rss',
    method: 'POST',
    data: { entries: params.entries },
    config: { withCredentials: true },
  });
  return response.data;
};
