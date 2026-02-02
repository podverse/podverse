import type { ParseRSSFeedForAddByRSSResult } from '@podverse/parser';
import {
  buildAddByRSSParseCacheKey as buildAddByRSSParseCacheKeyShared,
  getAddByRSSParseCacheEntry as getAddByRSSParseCacheEntryShared,
  setAddByRSSParseCacheEntry as setAddByRSSParseCacheEntryShared,
  type AddByRSSParseCacheEntry as AddByRSSParseCacheEntryBase,
  type AddByRSSParseStatus,
} from '@podverse/helpers';

import { cacheGetJson, cacheSetJson } from '@workers/lib/keyvaldb/keyvaldb.js';

type ParsedFeedResult = Extract<ParseRSSFeedForAddByRSSResult, { status: 'parsed' }>;

export type AddByRSSParseCacheEntry = AddByRSSParseCacheEntryBase<ParsedFeedResult['parsedFeed']>;

export type { AddByRSSParseStatus };

export const buildAddByRSSParseCacheKey = (requestId: string): string =>
  buildAddByRSSParseCacheKeyShared(requestId);

export const getAddByRSSParseCacheEntry = async (
  requestId: string
): Promise<AddByRSSParseCacheEntry | null> =>
  getAddByRSSParseCacheEntryShared<ParsedFeedResult['parsedFeed']>(cacheGetJson, requestId);

export const setAddByRSSParseCacheEntry = async (entry: AddByRSSParseCacheEntry): Promise<void> =>
  setAddByRSSParseCacheEntryShared<ParsedFeedResult['parsedFeed']>(cacheSetJson, entry);
