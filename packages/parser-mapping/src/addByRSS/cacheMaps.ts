import type { AddByRSSFeedRecord, AddByRSSParseAllParams } from '@podverse/helpers';

/** Intentionally local: folds Add-by-RSS feed records into parser queue params; not a generic utility. */
export const buildCacheMaps = (feeds: AddByRSSFeedRecord[]): AddByRSSParseAllParams => {
  const feedHashesByUrl: Record<string, string> = {};
  const etagsByUrl: Record<string, string> = {};
  const lastModifiedByUrl: Record<string, string> = {};

  for (const feed of feeds) {
    if (feed.cache?.feedHash) {
      feedHashesByUrl[feed.feedUrl] = feed.cache.feedHash;
    }
    if (feed.cache?.etag) {
      etagsByUrl[feed.feedUrl] = feed.cache.etag;
    }
    if (feed.cache?.lastModified) {
      lastModifiedByUrl[feed.feedUrl] = feed.cache.lastModified;
    }
  }

  return { feedHashesByUrl, etagsByUrl, lastModifiedByUrl };
};
