import { cacheGetJson, cacheSetJson } from '@workers/lib/keyvaldb/keyvaldb.js';

import {
  type CacheSetJson,
  getOpmlImportCacheEntry as getOpmlImportCacheEntryShared,
  type OpmlImportCacheEntry,
  setOpmlImportCacheEntry as setOpmlImportCacheEntryShared,
} from '@podverse/helpers';

export type { OpmlImportCacheEntry };

const cacheSetJsonAdapter: CacheSetJson = (key, value, ttlSeconds) =>
  cacheSetJson(key, value, ttlSeconds ?? undefined);

export const getOpmlImportCacheEntry = async (
  requestId: string
): Promise<OpmlImportCacheEntry | null> => getOpmlImportCacheEntryShared(cacheGetJson, requestId);

export const setOpmlImportCacheEntry = async (entry: OpmlImportCacheEntry): Promise<void> =>
  setOpmlImportCacheEntryShared(cacheSetJsonAdapter, entry);
