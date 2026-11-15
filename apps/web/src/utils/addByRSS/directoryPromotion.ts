import type { DTOAddByRSSMatchFeed, DTOAddByRSSMatchFeedRef } from '@podverse/helpers';
import { ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS, splitFeedUrlUserinfo } from '@podverse/helpers';

import { emitQueueDataChangedEvent } from '../../lib/queue/queueDataChanged';
import { convertAddByRSSFeed, matchAddByRSSFeeds } from './api';
import { emitAddByRSSFeedChanged } from './feedChangedEvent';
import { removeAddByRSSFeed } from './storage';
import type { AddByRSSFeedRecord } from './types';

/**
 * How long a background refresh waits before asking the directory again.
 * A forced refresh does not wait.
 */
const DIRECTORY_PROMOTION_INTERVAL_MS = 60 * 60 * 1000;

let lastRunAtMs: number | null = null;

const warnDirectoryPromotion = (error: unknown): void => {
  console.warn('Add by RSS directory promotion failed', error);
};

const shouldPromote = (force: boolean, nowMs: number): boolean => {
  if (force || lastRunAtMs === null) {
    return true;
  }
  return nowMs - lastRunAtMs >= DIRECTORY_PROMOTION_INTERVAL_MS;
};

const feedHasUserinfo = (feedUrl: string): boolean => {
  const split = splitFeedUrlUserinfo(feedUrl);
  return split.username !== null || split.password !== null;
};

const podcastGuidOf = (feed: AddByRSSFeedRecord): string | null => {
  const guid = feed.mappedFeed?.channel?.channel?.podcast_guid;
  if (typeof guid !== 'string') {
    return null;
  }
  const trimmed = guid.trim();
  return trimmed === '' ? null : trimmed;
};

const eligibleFeeds = (feeds: AddByRSSFeedRecord[]): AddByRSSFeedRecord[] =>
  feeds.filter((feed) => feed.requiresCredentials !== true && !feedHasUserinfo(feed.feedUrl));

const chunkFeeds = (feeds: readonly AddByRSSFeedRecord[]): AddByRSSFeedRecord[][] => {
  const chunks: AddByRSSFeedRecord[][] = [];
  for (let index = 0; index < feeds.length; index += ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS) {
    chunks.push(feeds.slice(index, index + ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS));
  }
  return chunks;
};

const matchRef = (feed: AddByRSSFeedRecord): DTOAddByRSSMatchFeedRef => ({
  feed_url: feed.feedUrl,
  feed_guid: podcastGuidOf(feed),
  items: [],
});

const dropLocalFeed = async (feed: AddByRSSFeedRecord): Promise<void> => {
  await removeAddByRSSFeed(feed.idText);
  emitAddByRSSFeedChanged(feed.feedUrl);
};

/**
 * Converts Add by RSS feeds the directory already has and drops their local records.
 * Password-protected feeds and URLs that carry a username stay Add by RSS.
 * Runs at most once an hour unless `force` is set. A failed request is logged and skipped.
 */
export const promoteMatchingAddByRSSFeeds = async (params: {
  feeds: AddByRSSFeedRecord[];
  force: boolean;
}): Promise<{ convertedFeedUrls: string[] }> => {
  const nowMs = Date.now();
  if (!shouldPromote(params.force, nowMs)) {
    return { convertedFeedUrls: [] };
  }
  lastRunAtMs = nowMs;

  const convertedFeedUrls: string[] = [];
  const byUrl = new Map(params.feeds.map((feed) => [feed.feedUrl, feed]));

  for (const chunk of chunkFeeds(eligibleFeeds(params.feeds))) {
    let matches: DTOAddByRSSMatchFeed[];
    try {
      matches = (await matchAddByRSSFeeds(chunk.map(matchRef))).matches;
    } catch (error) {
      warnDirectoryPromotion(error);
      continue;
    }

    for (const match of matches) {
      if (match.channel === null) {
        continue;
      }
      const feed = byUrl.get(match.feed_url);
      if (feed === undefined) {
        continue;
      }
      try {
        const result = await convertAddByRSSFeed({
          feed_url: feed.feedUrl,
          feed_guid: podcastGuidOf(feed),
        });
        const dropLocal =
          result.converted === true ||
          (result.converted === false && result.reason === 'not_followed');
        if (!dropLocal) {
          continue;
        }
        await dropLocalFeed(feed);
        convertedFeedUrls.push(feed.feedUrl);
      } catch (error) {
        warnDirectoryPromotion(error);
      }
    }
  }

  if (convertedFeedUrls.length > 0) {
    emitQueueDataChangedEvent();
  }
  return { convertedFeedUrls };
};
