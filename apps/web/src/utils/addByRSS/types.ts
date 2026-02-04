import type { AddByRSSParseStatus } from '@podverse/helpers';
import type { ParsedRSSFeedCompatBundle } from '@podverse/parser-mapping';
import type { ParseRSSFeedForAddByRSSResult } from '@podverse/parser';

export type AddByRSSResourceType =
  | 'podcasts'
  | 'episodes'
  | 'artists'
  | 'albums'
  | 'tracks'
  | 'livestreams';

type ParsedFeedResult = Extract<ParseRSSFeedForAddByRSSResult, { status: 'parsed' }>;

export type AddByRSSParsedFeed = ParsedFeedResult['parsedFeed'];
export type AddByRSSMappedFeed = ParsedRSSFeedCompatBundle;

export type AddByRSSCache = {
  feedHash?: string;
  etag?: string;
  lastModified?: string;
};

export type AddByRSSFeedRecord = {
  id: number;
  idText: string;
  resourceType: AddByRSSResourceType;
  feedUrl: string;
  title: string | null;
  imageUrl: string | null;
  status?: AddByRSSParseStatus;
  cache?: AddByRSSCache;
  mappedFeed?: AddByRSSMappedFeed;
  lastParsedAt?: string | null;
  updatedAt: string;
};
