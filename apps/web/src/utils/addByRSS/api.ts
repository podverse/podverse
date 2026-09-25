import type { AddByRSSParseCacheEntry } from '@podverse/helpers';
import type { DTOAccount, DTOAccountFollowingAddByRSSChannel } from '@podverse/helpers';
import type { AddByRSSBasicAuthCredentials } from '@podverse/helpers-validation/client';

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

/** Follow never carries credentials; `requiresCredentials` only flags the feed for other devices. */
export const followAddByRSSChannel = async (params: {
  feedUrl: string;
  title?: string | null;
  imageUrl?: string | null;
  requiresCredentials?: boolean;
}): Promise<DTOAccount> =>
  getApiRequestService().reqAccountFollowAddByRSSChannel({
    feed_url: params.feedUrl,
    title: params.title ?? null,
    image_url: params.imageUrl ?? null,
    ...(params.requiresCredentials !== undefined
      ? { requires_credentials: params.requiresCredentials }
      : {}),
  });

export const unfollowAddByRSSChannel = async (feedUrl: string): Promise<DTOAccount> =>
  getApiRequestService().reqAccountUnfollowAddByRSSChannel({ feed_url: feedUrl });

/** Credentials go only in this request body; the API seals them for the worker and keeps nothing. */
export const enqueueAddByRSSParse = async (params: {
  feedUrl: string;
  cache?: AddByRSSCache;
  credentials?: AddByRSSBasicAuthCredentials | null;
}): Promise<{ request_id: string }> =>
  getApiRequestService().apiRequest<{ request_id: string }>({
    path: '/account/add-by-rss/parse',
    method: 'POST',
    data: {
      feed_url: params.feedUrl,
      feed_hash: params.cache?.feedHash,
      etag: params.cache?.etag,
      last_modified: params.cache?.lastModified,
      ...(params.credentials
        ? {
            basic_auth_username: params.credentials.username,
            basic_auth_password: params.credentials.password,
          }
        : {}),
    },
    config: { withCredentials: true },
  });

export const enqueueAddByRSSParseAll = async (params: {
  feedHashesByUrl?: Record<string, string>;
  etagsByUrl?: Record<string, string>;
  lastModifiedByUrl?: Record<string, string>;
  credentialsByUrl?: Record<string, AddByRSSBasicAuthCredentials>;
}): Promise<AddByRSSParseAllResponse> =>
  getApiRequestService().apiRequest<AddByRSSParseAllResponse>({
    path: '/account/add-by-rss/parse/all',
    method: 'POST',
    data: {
      feed_hashes_by_url: params.feedHashesByUrl,
      etags_by_url: params.etagsByUrl,
      last_modified_by_url: params.lastModifiedByUrl,
      ...(params.credentialsByUrl && Object.keys(params.credentialsByUrl).length > 0
        ? { credentials_by_url: params.credentialsByUrl }
        : {}),
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
