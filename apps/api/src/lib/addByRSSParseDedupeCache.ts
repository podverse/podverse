import { createHash } from 'node:crypto';

import { cacheGetJson, cacheSetJson } from '@api/lib/keyvaldb/keyvaldb.js';

export type AddByRSSParseDedupeEntry = {
  createdAt: string;
};

const buildAddByRSSParseDedupeKey = (accountId: number, feedUrl: string): string => {
  const feedHash = createHash('sha256').update(feedUrl).digest('hex');
  return `addByRSS:parseDedupe:${accountId}:${feedHash}`;
};

export const getAddByRSSParseDedupeEntry = async (
  accountId: number,
  feedUrl: string
): Promise<AddByRSSParseDedupeEntry | null> =>
  cacheGetJson<AddByRSSParseDedupeEntry>(buildAddByRSSParseDedupeKey(accountId, feedUrl));

export const setAddByRSSParseDedupeEntry = async (
  accountId: number,
  feedUrl: string,
  ttlSeconds: number
): Promise<void> =>
  cacheSetJson(
    buildAddByRSSParseDedupeKey(accountId, feedUrl),
    { createdAt: new Date().toISOString() },
    ttlSeconds
  );
