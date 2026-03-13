import type { AddByRSSParseStatus } from '../addByRSSParseCache.js';

export type AddByRSSResourceType =
  | 'podcasts'
  | 'episodes'
  | 'artists'
  | 'albums'
  | 'tracks'
  | 'livestreams';

export type AddByRSSCache = {
  feedHash?: string;
  etag?: string;
  lastModified?: string;
};

/**
 * Minimal Add-by-RSS feed record for client storage.
 * mappedFeed is typed as unknown so helpers does not depend on parser-mapping;
 * consumers (web, RN) can use AddByRSSMappedFeed from parser-mapping when needed.
 */
export type AddByRSSFeedRecord = {
  id: number;
  idText: string;
  resourceType: AddByRSSResourceType;
  feedUrl: string;
  title: string | null;
  imageUrl: string | null;
  status?: AddByRSSParseStatus;
  cache?: AddByRSSCache;
  mappedFeed?: unknown;
  lastParsedAt?: string | null;
  updatedAt: string;
};

export type AddByRSSParseAllParams = {
  feedHashesByUrl: Record<string, string>;
  etagsByUrl: Record<string, string>;
  lastModifiedByUrl: Record<string, string>;
};
