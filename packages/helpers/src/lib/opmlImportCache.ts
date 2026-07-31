import type { CacheGetJson, CacheSetJson } from './addByRSSParseCache.js';

export type OpmlImportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type OpmlImportFeedOutcome =
  | 'subscribed'
  | 'enqueued_indexed'
  | 'added_by_rss'
  | 'already_subscribed'
  | 'rate_limited'
  | 'failed';

export type OpmlImportPerFeedResult = {
  feedUrl: string;
  title?: string;
  outcome: OpmlImportFeedOutcome;
  error?: string;
};

export type OpmlImportTotals = {
  total: number;
  subscribed: number;
  enqueuedIndexed: number;
  addedByRss: number;
  failed: number;
  skippedExisting: number;
  rateLimited: number;
};

export type OpmlImportRateLimitedInfo = {
  limit: number;
  retryAfterSeconds: number;
};

export type OpmlImportCacheEntry = {
  requestId: string;
  accountId: number;
  status: OpmlImportStatus;
  totals: OpmlImportTotals;
  rateLimited?: OpmlImportRateLimitedInfo;
  results: OpmlImportPerFeedResult[];
  error?: string;
  updatedAt: string;
};

export type OpmlImportFeedInput = {
  title?: string;
  feedUrl: string;
};

/** Keep in sync with any app-local wrappers (avoid helpers → helpers-backend cycle). */
const opmlImportCacheKey = (requestId: string): string => `opml:import:${requestId}`;

export const buildOpmlImportHourlyKey = (accountId: number, hourBucket: number): string =>
  `opml:import:hourly:${accountId}:${hourBucket}`;

export const getOpmlImportHourBucket = (nowMs: number = Date.now()): number =>
  Math.floor(nowMs / (60 * 60 * 1000));

export const getOpmlImportRetryAfterSeconds = (nowMs: number = Date.now()): number => {
  const bucketEndMs = (getOpmlImportHourBucket(nowMs) + 1) * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((bucketEndMs - nowMs) / 1000));
};

export const emptyOpmlImportTotals = (total: number = 0): OpmlImportTotals => ({
  total,
  subscribed: 0,
  enqueuedIndexed: 0,
  addedByRss: 0,
  failed: 0,
  skippedExisting: 0,
  rateLimited: 0,
});

export const incrementOpmlImportTotals = (
  totals: OpmlImportTotals,
  outcome: OpmlImportFeedOutcome
): OpmlImportTotals => {
  const next = { ...totals };
  if (outcome === 'subscribed') {
    next.subscribed += 1;
  } else if (outcome === 'enqueued_indexed') {
    next.enqueuedIndexed += 1;
  } else if (outcome === 'added_by_rss') {
    next.addedByRss += 1;
  } else if (outcome === 'already_subscribed') {
    next.skippedExisting += 1;
  } else if (outcome === 'rate_limited') {
    next.rateLimited += 1;
  } else if (outcome === 'failed') {
    next.failed += 1;
  }
  return next;
};

export const getOpmlImportCacheEntry = async (
  cacheGetJson: CacheGetJson,
  requestId: string
): Promise<OpmlImportCacheEntry | null> =>
  cacheGetJson<OpmlImportCacheEntry>(opmlImportCacheKey(requestId));

export const setOpmlImportCacheEntry = async (
  cacheSetJson: CacheSetJson,
  entry: OpmlImportCacheEntry
): Promise<void> => cacheSetJson(opmlImportCacheKey(entry.requestId), entry);
