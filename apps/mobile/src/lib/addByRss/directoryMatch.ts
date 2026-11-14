import { isDeviceLocalAddByRSSGuid } from '@podverse/helpers';
import type { DTOAddByRSSMatchFeedRef } from '@podverse/helpers/dto';
import {
  ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS,
  ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS,
} from '@podverse/helpers/dto';
import { addByRSSDirectoryMatchUrlVariants } from '@podverse/helpers-validation/client';
import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import { toAddByRssItemPlaybackResourceData } from './domain';
import { addByRssDownloadItemIdText } from './downloadIdText';
import { addByRssPlaybackMediaId } from './resourceData';

const DIRECTORY_MATCH_INTERVAL_MS = 60 * 60 * 1000;

/**
 * One feed the directory-match request may ask about.
 *
 * `channelIdText` is this device's id for the feed, used only to drop guids the device made up.
 * `requiresCredentials` keeps a password-protected feed off the request.
 */
export type AddByRssMatchFeedInput = {
  channelIdText?: string | null;
  feedUrl: string;
  items: { enclosureUrl: string | null; guid: string | null }[];
  podcastGuid: string | null;
  requiresCredentials?: boolean;
};

/** An episode this device already stores something for, plus the ids those rows use. */
export type LocalAddByRssItemRef = {
  downloadIdText: string;
  enclosureUrl: string | null;
  guid: string | null;
  hashId: string;
};

/**
 * True when this refresh should ask which feeds are already in the directory.
 * A pull-to-refresh passes `force`. Otherwise at most once an hour.
 */
export const shouldRunDirectoryMatch = (
  lastRunAtMs: number | null,
  nowMs: number,
  force: boolean
): boolean => {
  if (force) {
    return true;
  }
  if (lastRunAtMs === null) {
    return true;
  }
  return nowMs - lastRunAtMs >= DIRECTORY_MATCH_INTERVAL_MS;
};

const matchableFeedUrl = (feedUrl: string): boolean => {
  return addByRSSDirectoryMatchUrlVariants(feedUrl).length > 0;
};

const matchItem = (
  item: AddByRssMatchFeedInput['items'][number],
  channelIdText: string | null | undefined
): DTOAddByRSSMatchFeedRef['items'][number] => {
  const guid =
    item.guid !== null && isDeviceLocalAddByRSSGuid(item.guid, channelIdText) ? null : item.guid;
  return {
    enclosure_url: item.enclosureUrl,
    guid,
  };
};

/**
 * Chunks for `POST /channel/add-by-rss-match`.
 *
 * Password-protected feeds and URLs that carry a username are left out. A guid this device
 * invented is sent as null so the enclosure can still match. A chunk stays within the feed and
 * item caps, and a feed is never split across chunks. A feed with more items than the cap sends
 * its first items only.
 */
export const buildAddByRssMatchRefs = (
  feeds: readonly AddByRssMatchFeedInput[]
): DTOAddByRSSMatchFeedRef[][] => {
  const chunks: DTOAddByRSSMatchFeedRef[][] = [];
  let current: DTOAddByRSSMatchFeedRef[] = [];
  let itemCount = 0;

  const flush = (): void => {
    if (current.length === 0) {
      return;
    }
    chunks.push(current);
    current = [];
    itemCount = 0;
  };

  for (const feed of feeds) {
    if (feed.requiresCredentials === true || !matchableFeedUrl(feed.feedUrl)) {
      continue;
    }
    const items = feed.items
      .slice(0, ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS)
      .map((item) => matchItem(item, feed.channelIdText));
    const overflows =
      current.length > 0 &&
      (current.length >= ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS ||
        itemCount + items.length > ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS);
    if (overflows) {
      flush();
    }
    current.push({
      feed_guid: feed.podcastGuid,
      feed_url: feed.feedUrl,
      items,
    });
    itemCount += items.length;
    if (current.length >= ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS) {
      flush();
    }
  }
  flush();
  return chunks;
};

const enclosureUrlOf = (bundle: AddByRSSMappedFeed['items'][number]): string | null => {
  const uri = bundle.enclosures[0]?.item_enclosure_sources[0]?.uri;
  return typeof uri === 'string' && uri.length > 0 ? uri : null;
};

/**
 * Episodes the device already stores a download, playback row, outbox row, or auto-download row
 * for. `referencedKeys` holds those ids: the playback hash and the download id.
 *
 * The hash is the one playback builds for the same item. The enclosure is the first source on the
 * stored bundle.
 */
export const localItemRefsForFeed = (
  feed: MobileAddByRSSFeedRecord,
  mappedFeed: AddByRSSMappedFeed,
  referencedKeys: ReadonlySet<string>
): LocalAddByRssItemRef[] => {
  const refs: LocalAddByRssItemRef[] = [];
  for (const [itemIndex, bundle] of mappedFeed.items.entries()) {
    const resourceData = toAddByRssItemPlaybackResourceData(feed, mappedFeed, bundle, itemIndex);
    const hashId = addByRssPlaybackMediaId(resourceData);
    const downloadIdText = addByRssDownloadItemIdText(feed.feedUrl, bundle.item, itemIndex);
    if (!referencedKeys.has(hashId) && !referencedKeys.has(downloadIdText)) {
      continue;
    }
    refs.push({
      downloadIdText,
      enclosureUrl: enclosureUrlOf(bundle),
      guid: bundle.item.guid ?? null,
      hashId,
    });
  }
  return refs;
};
