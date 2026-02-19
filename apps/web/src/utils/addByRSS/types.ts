import type { AddByRSSFeedRecord as AddByRSSFeedRecordBase } from '@podverse/helpers';
import type { ParseRSSFeedForAddByRSSResult } from '@podverse/parser';

// Re-export from parser-mapping
export type {
  AddByRSSItemIndexItem,
  AddByRSSLivestreamIndexItem,
  AddByRSSMappedFeed,
} from '@podverse/parser-mapping';

// Re-export from helpers
export type {
  AddByRSSResourceType,
  AddByRSSCache,
  AddByRSSParseAllParams,
} from '@podverse/helpers';

import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

type ParsedFeedResult = Extract<ParseRSSFeedForAddByRSSResult, { status: 'parsed' }>;

export type AddByRSSParsedFeed = ParsedFeedResult['parsedFeed'];

/** Web feed record: helpers shape + mappedFeed from parser-mapping for type safety. */
export type AddByRSSFeedRecord = AddByRSSFeedRecordBase & {
  mappedFeed?: AddByRSSMappedFeed;
};
