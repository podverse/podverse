import { cacheGetJson, cacheSetJson } from '@api/lib/keyvaldb/keyvaldb.js';

import {
  type AddByRSSParseCacheEntry as AddByRSSParseCacheEntryBase,
  type AddByRSSParseStatus,
  type CacheSetJson,
  getAddByRSSParseCacheEntry as getAddByRSSParseCacheEntryShared,
  setAddByRSSParseCacheEntry as setAddByRSSParseCacheEntryShared,
} from '@podverse/helpers';
import type { ParseRSSFeedForAddByRSSResult } from '@podverse/parser';

type ParsedFeedResult = Extract<ParseRSSFeedForAddByRSSResult, { status: 'parsed' }>;

export type AddByRSSParseCacheEntry = AddByRSSParseCacheEntryBase<ParsedFeedResult['parsedFeed']>;

export type { AddByRSSParseStatus };

const cacheSetJsonAdapter: CacheSetJson = (key, value, ttlSeconds) =>
  cacheSetJson(key, value, ttlSeconds ?? undefined);

export const getAddByRSSParseCacheEntry = async (
  requestId: string
): Promise<AddByRSSParseCacheEntry | null> =>
  getAddByRSSParseCacheEntryShared<ParsedFeedResult['parsedFeed']>(cacheGetJson, requestId);

export const setAddByRSSParseCacheEntry = async (entry: AddByRSSParseCacheEntry): Promise<void> =>
  setAddByRSSParseCacheEntryShared<ParsedFeedResult['parsedFeed']>(cacheSetJsonAdapter, entry);
