/* eslint-disable @typescript-eslint/no-unused-vars */
import { getMd5Hash } from '@podverse/helpers';
import { FeedObject } from 'podverse-partytime';

export const getParsedFeedMd5Hash = (parsedFeed: FeedObject): string => {
  const {
    lastUpdate,
    lastBuildDate,
    pubDate,
    newestItemPubDate,
    oldestItemPubDate,
    lastPubDate,
    ...parsedFeedPruned
  } = parsedFeed;
  const currentFeedFileHash = getMd5Hash(parsedFeedPruned);
  return currentFeedFileHash;
};
