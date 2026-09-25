export type AddByRSSParseStatus = 'queued' | 'processing' | 'parsed' | 'not_modified' | 'failed';

export type AddByRSSParseFailureReason =
  | 'credentials_required'
  | 'credentials_rejected'
  | 'credentials_withheld_other_domain'
  | 'credentials_withheld_insecure'
  | 'credentials_envelope_invalid'
  | 'http_error'
  | 'network'
  | 'parse';

export type AddByRSSParseAuthChallenge = 'basic' | 'other' | 'none';

export type AddByRSSParseCredentialsState =
  'sent' | 'not_provided' | 'withheld_other_domain' | 'withheld_insecure' | 'decrypt_failed';

/**
 * Parse status stored in Valkey and returned to clients. Never carries username or password —
 * only machine-readable metadata about whether credentials were sent and how the origin answered.
 * Metadata fields are optional so entries written before they existed still read.
 */
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
  failureReason?: AddByRSSParseFailureReason;
  httpStatus?: number;
  authChallenge?: AddByRSSParseAuthChallenge;
  credentialsState?: AddByRSSParseCredentialsState;
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
