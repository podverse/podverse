import type { AddByRSSParseCacheEntry } from '@podverse/helpers';
import type { DTOAccount, DTOAccountFollowingAddByRSSChannel } from '@podverse/helpers';
import { getApiRequestService } from '../../factories/apiRequestService';
import type { AddByRSSCache, AddByRSSParsedFeed } from './types';

export type AddByRSSParseStatusResponse = AddByRSSParseCacheEntry<AddByRSSParsedFeed>;

export type AddByRSSParseAllResponse = {
  request_ids: Array<{ request_id: string; feed_url: string }>;
  deduped_feed_urls?: string[];
  dedupe_ttl_seconds?: number | null;
};

export const getFollowedAddByRSSChannels = async (
  accountIdText: string
): Promise<DTOAccountFollowingAddByRSSChannel[]> =>
  getApiRequestService().reqAccountGetFollowedAddByRSSChannels({
    account_id_text: accountIdText,
  });

export const followAddByRSSChannel = async (params: {
  feedUrl: string;
  title?: string | null;
  imageUrl?: string | null;
  basic_auth_username?: string | null;
  basic_auth_password?: string | null;
}): Promise<DTOAccount> =>
  getApiRequestService().reqAccountFollowAddByRSSChannel({
    feed_url: params.feedUrl,
    title: params.title ?? null,
    image_url: params.imageUrl ?? null,
    basic_auth_username: params.basic_auth_username ?? null,
    basic_auth_password: params.basic_auth_password ?? null,
  });

export const unfollowAddByRSSChannel = async (feedUrl: string): Promise<DTOAccount> =>
  getApiRequestService().reqAccountUnfollowAddByRSSChannel({ feed_url: feedUrl });

export const enqueueAddByRSSParse = async (params: {
  feedUrl: string;
  cache?: AddByRSSCache;
}): Promise<{ request_id: string }> =>
  getApiRequestService().apiRequest<{ request_id: string }>({
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
  getApiRequestService().apiRequest<AddByRSSParseAllResponse>({
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
  getApiRequestService().apiRequest<AddByRSSParseStatusResponse>({
    path: `/account/add-by-rss/parse/status/${requestId}`,
    method: 'GET',
    config: { withCredentials: true },
  });
