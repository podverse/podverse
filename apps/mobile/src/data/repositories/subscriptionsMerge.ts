import type { DTOChannel } from '@podverse/helpers';
import { articleStrippedTitle } from '@podverse/helpers';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';

/**
 * Pure merge/map/filter/sort helpers for the unified subscriptions list (directory follows +
 * add-by-RSS). Kept free of `expo-sqlite` / Expo imports so the mobile node-only Vitest suite can
 * cover them (see subscriptionsRepository.ts for the SQLite cache + API hydration that consume
 * these).
 */

export type SubscriptionSource = 'directory' | 'addByRss';

export type SubscriptionMedium = 'podcasts' | 'music';

export type SubscribedChannel = {
  /** Channel `id_text` (directory) or `feed_url` (add-by-RSS) — stable, dedupe key. */
  idText: string;
  /** Always a non-empty display title (directory entries without one are dropped). */
  title: string;
  imageUrl: string | null;
  source: SubscriptionSource;
  medium: SubscriptionMedium;
  /**
   * When this subscription last published, from local storage. Null when nothing is stored for it
   * yet, which orders as unknown rather than as long ago.
   */
  latestItemPubDateMs: number | null;
};

export type SubscriptionFilter = 'all' | 'addByRss' | 'directory';

export type SubscriptionSort = 'alphabetical' | 'recent';

const trimToNull = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** First usable channel image URL, or null. */
export const firstChannelImageUrl = (channel: DTOChannel): string | null => {
  for (const image of channel.channel_images ?? []) {
    const url = trimToNull(image.url);
    if (url !== null) {
      return url;
    }
  }
  return null;
};

const mediumIsMusicResourceType = (
  resourceType: MobileAddByRSSFeedRecord['resourceType']
): boolean => {
  return resourceType === 'artists' || resourceType === 'albums' || resourceType === 'tracks';
};

/**
 * Map a hydrated directory channel to a subscribed entry. Returns `null` when the channel has no
 * usable title so callers can drop it (a titleless car/list row is not useful).
 */
export const mapDirectoryChannelToSubscribed = (channel: DTOChannel): SubscribedChannel | null => {
  const idText = trimToNull(channel.id_text);
  const title = trimToNull(channel.title);
  if (idText === null || title === null) {
    return null;
  }

  return {
    idText,
    title,
    imageUrl: firstChannelImageUrl(channel),
    source: 'directory',
    medium: 'podcasts',
    // A directory channel's recency comes from the items stored for it, which this mapping does not
    // see. The repository fills it in from `channelItemsRepository`.
    latestItemPubDateMs: null,
  };
};

/**
 * Map a followed add-by-RSS feed to a subscribed entry. Add-by-RSS feeds are user-added, so a
 * missing title falls back to the feed URL (never dropped).
 */
export const mapAddByRssToSubscribed = (
  record: MobileAddByRSSFeedRecord
): SubscribedChannel | null => {
  const idText = trimToNull(record.feedUrl);
  if (idText === null) {
    return null;
  }

  return {
    idText,
    title: trimToNull(record.title) ?? idText,
    imageUrl: trimToNull(record.imageUrl),
    source: 'addByRss',
    medium: mediumIsMusicResourceType(record.resourceType) ? 'music' : 'podcasts',
    latestItemPubDateMs: record.latestItemPubDateMs,
  };
};

/** Union directory + add-by-RSS, deduped by `idText` (first occurrence wins). */
export const mergeSubscriptions = (
  directory: SubscribedChannel[],
  addByRss: SubscribedChannel[]
): SubscribedChannel[] => {
  const byIdText = new Map<string, SubscribedChannel>();
  for (const entry of [...directory, ...addByRss]) {
    if (!byIdText.has(entry.idText)) {
      byIdText.set(entry.idText, entry);
    }
  }
  return [...byIdText.values()];
};

export const applySubscriptionFilter = (
  list: SubscribedChannel[],
  filter: SubscriptionFilter
): SubscribedChannel[] => {
  if (filter === 'addByRss') {
    return list.filter((entry) => entry.source === 'addByRss');
  }
  if (filter === 'directory') {
    return list.filter((entry) => entry.source === 'directory');
  }
  return list;
};

export const compareSubscribedByTitle = (a: SubscribedChannel, b: SubscribedChannel): number => {
  return articleStrippedTitle(a.title).localeCompare(articleStrippedTitle(b.title));
};

/**
 * Newest first, with subscriptions whose date is unknown after those whose date is known.
 *
 * An unknown date is a subscription nothing has been stored for yet, usually a follow the item sync
 * has not reached. Sorting those to the bottom keeps a brand new follow from claiming the top of the
 * list on the strength of having no information at all, and they settle into place once their items
 * arrive. Equal dates fall back to title so the order is total and a re-sort cannot shuffle rows.
 */
export const compareSubscribedByRecency = (a: SubscribedChannel, b: SubscribedChannel): number => {
  const aMs = a.latestItemPubDateMs;
  const bMs = b.latestItemPubDateMs;

  if (aMs === null && bMs === null) {
    return compareSubscribedByTitle(a, b);
  }
  if (aMs === null) {
    return 1;
  }
  if (bMs === null) {
    return -1;
  }
  if (aMs === bMs) {
    return compareSubscribedByTitle(a, b);
  }
  return bMs - aMs;
};

/** Order the merged list. `alphabetical` is the default. */
export const sortSubscriptions = (
  list: SubscribedChannel[],
  sort: SubscriptionSort = 'alphabetical'
): SubscribedChannel[] => {
  const comparator = sort === 'recent' ? compareSubscribedByRecency : compareSubscribedByTitle;
  return [...list].sort(comparator);
};
