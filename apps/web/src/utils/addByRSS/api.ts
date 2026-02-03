import type { AddByRSSParseCacheEntry } from '@podverse/helpers';
import type { DTOAccountFollowingAddByRSSChannel } from '@podverse/helpers';
import { apiRequestService } from '../../factories/apiRequestService';
import type { AddByRSSCache, AddByRSSParsedFeed } from './types';

export type AddByRSSParseStatusResponse = AddByRSSParseCacheEntry<AddByRSSParsedFeed>;

export type AddByRSSParseAllResponse = {
  request_ids: Array<{ request_id: string; feed_url: string }>;
};

export const getFollowedAddByRSSChannels = async (
  accountIdText: string
): Promise<DTOAccountFollowingAddByRSSChannel[]> =>
  apiRequestService.reqAccountGetFollowedAddByRSSChannels({
    account_id_text: accountIdText,
  });

export const followAddByRSSChannel = async (params: {
  feedUrl: string;
  title?: string | null;
  imageUrl?: string | null;
}): Promise<{ message: string }> =>
  apiRequestService.reqAccountFollowAddByRSSChannel({
    feed_url: params.feedUrl,
    title: params.title ?? null,
    image_url: params.imageUrl ?? null,
  });

export const unfollowAddByRSSChannel = async (feedUrl: string): Promise<void> => {
  await apiRequestService.reqAccountUnfollowAddByRSSChannel({ feed_url: feedUrl });
};

export const enqueueAddByRSSParse = async (params: {
  feedUrl: string;
  cache?: AddByRSSCache;
}): Promise<{ request_id: string }> =>
  apiRequestService.apiRequest<{ request_id: string }>({
    path: '/account/add-by-rss/parse',
    method: 'POST',
    data: {
      feed_url: params.feedUrl,
      feed_hash: params.cache?.feedHash,
      etag: params.cache?.etag,
      last_modified: params.cache?.lastModified,
    },
    config: { withCredentials: true },
  });

export const enqueueAddByRSSParseAll = async (params: {
  feedHashesByUrl?: Record<string, string>;
  etagsByUrl?: Record<string, string>;
  lastModifiedByUrl?: Record<string, string>;
}): Promise<AddByRSSParseAllResponse> =>
  apiRequestService.apiRequest<AddByRSSParseAllResponse>({
    path: '/account/add-by-rss/parse/all',
    method: 'POST',
    data: {
      feed_hashes_by_url: params.feedHashesByUrl,
      etags_by_url: params.etagsByUrl,
      last_modified_by_url: params.lastModifiedByUrl,
    },
    config: { withCredentials: true },
  });

export const getAddByRSSParseStatus = async (
  requestId: string
): Promise<AddByRSSParseStatusResponse> =>
  apiRequestService.apiRequest<AddByRSSParseStatusResponse>({
    path: `/account/add-by-rss/parse/status/${requestId}`,
    method: 'GET',
    config: { withCredentials: true },
  });
