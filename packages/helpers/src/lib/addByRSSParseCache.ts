export type AddByRSSParseStatus = 'queued' | 'processing' | 'parsed' | 'not_modified' | 'failed';

export type AddByRSSParseCacheEntry<TParsedFeed> = {
  requestId: string;
  accountId: number;
  feedUrl: string;
  status: AddByRSSParseStatus;
  cache?: {
    feedHash?: string;
    etag?: string;
    lastModified?: string;
  };
  payload?: TParsedFeed;
  error?: string;
  updatedAt: string;
};

export type CacheGetJson = <T>(key: string) => Promise<T | null>;
export type CacheSetJson = <T>(key: string, value: T, ttlSeconds?: number | null) => Promise<void>;

/** Keep in sync with `@podverse/helpers-backend` `buildAddByRSSParseCacheKey` (avoid helpers → helpers-backend cycle). */
const addByRSSParseCacheKey = (requestId: string): string => `addByRSS:parse:${requestId}`;

export const getAddByRSSParseCacheEntry = async <TParsedFeed>(
  cacheGetJson: CacheGetJson,
  requestId: string
): Promise<AddByRSSParseCacheEntry<TParsedFeed> | null> =>
  cacheGetJson<AddByRSSParseCacheEntry<TParsedFeed>>(addByRSSParseCacheKey(requestId));

export const setAddByRSSParseCacheEntry = async <TParsedFeed>(
  cacheSetJson: CacheSetJson,
  entry: AddByRSSParseCacheEntry<TParsedFeed>
): Promise<void> => cacheSetJson(addByRSSParseCacheKey(entry.requestId), entry);
