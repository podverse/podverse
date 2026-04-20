import { cacheGetJson, cacheSetJson } from '@workers/lib/keyvaldb/keyvaldb.js';

import {
  type AddByRSSParseCacheEntry as AddByRSSParseCacheEntryBase,
  type AddByRSSParseStatus,
  getAddByRSSParseCacheEntry as getAddByRSSParseCacheEntryShared,
  setAddByRSSParseCacheEntry as setAddByRSSParseCacheEntryShared,
} from '@podverse/helpers';
import type { ParseRSSFeedForAddByRSSResult } from '@podverse/parser';

type ParsedFeedResult = Extract<ParseRSSFeedForAddByRSSResult, { status: 'parsed' }>;

export type AddByRSSParseCacheEntry = AddByRSSParseCacheEntryBase<ParsedFeedResult['parsedFeed']>;

export type { AddByRSSParseStatus };

export const getAddByRSSParseCacheEntry = async (
  requestId: string
): Promise<AddByRSSParseCacheEntry | null> =>
  getAddByRSSParseCacheEntryShared<ParsedFeedResult['parsedFeed']>(cacheGetJson, requestId);

export const setAddByRSSParseCacheEntry = async (entry: AddByRSSParseCacheEntry): Promise<void> =>
  setAddByRSSParseCacheEntryShared<ParsedFeedResult['parsedFeed']>(cacheSetJson, entry);
