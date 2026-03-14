/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FeedObject } from 'podverse-partytime';

import { getMd5Hash } from '@podverse/helpers';

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
