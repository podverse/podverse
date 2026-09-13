import type { DTOChannel } from '@podverse/helpers';
import {
  articleStrippedTitle,
  isAlbumMediumId,
  isArtistMediumId,
  primaryChannelListArtworkUrl,
} from '@podverse/helpers';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';

/**
 * Pure merge/map/filter/sort helpers for the unified subscriptions list (directory follows +
 * add-by-RSS). Kept free of `expo-sqlite` / Expo imports so the mobile node-only Vitest suite can
 * cover them (see subscriptionsRepository.ts for the SQLite cache + API hydration that consume
 * these).
 */

export type SubscriptionSource = 'directory' | 'addByRss';

export type SubscriptionMedium = 'podcasts' | 'music';

/**
 * Which Home chip a follow belongs on. Distinct from `SubscriptionKind` (directory vs add-by-RSS
 * key space) and from `SubscriptionMedium` (podcasts vs music for API medium params).
 */
export type SubscriptionChannelKind = 'podcasts' | 'artists' | 'albums';

export const SUBSCRIPTION_CHANNEL_KINDS = ['podcasts', 'artists', 'albums'] as const;

export const isSubscriptionChannelKind = (value: string): value is SubscriptionChannelKind => {
  return SUBSCRIPTION_CHANNEL_KINDS.some((kind) => kind === value);
};

/** Map a directory channel's medium_id to the Home chip kind. */
export const subscriptionChannelKindFromMediumId = (
  mediumId: number | null | undefined
): SubscriptionChannelKind => {
  if (isArtistMediumId(mediumId)) {
    return 'artists';
  }
  if (isAlbumMediumId(mediumId)) {
    return 'albums';
  }
  return 'podcasts';
};

/** Map an add-by-RSS resource type to the Home chip kind. */
export const subscriptionChannelKindFromResourceType = (
  resourceType: MobileAddByRSSFeedRecord['resourceType']
): SubscriptionChannelKind => {
  if (resourceType === 'artists') {
    return 'artists';
  }
  if (resourceType === 'albums' || resourceType === 'tracks') {
    return 'albums';
  }
  return 'podcasts';
};

export const mediumFromSubscriptionChannelKind = (
  kind: SubscriptionChannelKind
): SubscriptionMedium => {
  return kind === 'podcasts' ? 'podcasts' : 'music';
};

export type SubscribedChannel = {
  /** Channel `id_text` (directory) or `feed_url` (add-by-RSS) — stable, dedupe key. */
  idText: string;
  /** Local identity used to open the source-specific detail screen. */
  sourceIdText?: string;
  /** Always a non-empty display title (directory entries without one are dropped). */
  title: string;
  imageUrl: string | null;
  source: SubscriptionSource;
  medium: SubscriptionMedium;
  /** Home chip this follow belongs on. */
  kind: SubscriptionChannelKind;
  /**
   * When this subscription last published, from local storage. Null when nothing is stored for it
   * yet, which orders as unknown rather than as long ago.
   */
  latestItemPubDateMs: number | null;
  /**
   * Directory listen-count rank for this device's follows. Lower is more popular. Null when this
   * device has not stored a rank yet, which orders as unknown rather than as last.
   */
  popularityRank: number | null;
};

export type SubscriptionFilter = 'all' | 'addByRss' | 'directory';

export type SubscriptionSort = 'alphabetical' | 'popularity' | 'recent';

const trimToNull = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** First usable channel image URL for list/compact chrome, or null. */
export const firstChannelImageUrl = (channel: DTOChannel): string | null => {
  const fromHelpers = primaryChannelListArtworkUrl(channel.channel_images);
  if (fromHelpers !== null) {
    return fromHelpers;
  }
  for (const image of channel.channel_images ?? []) {
    const url = trimToNull(image.url);
    if (url !== null) {
      return url;
    }
  }
  return null;
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

  const kind = subscriptionChannelKindFromMediumId(channel.medium_id);

  return {
    idText,
    sourceIdText: idText,
    title,
    imageUrl: firstChannelImageUrl(channel),
    source: 'directory',
    medium: mediumFromSubscriptionChannelKind(kind),
    kind,
    // A directory channel's recency comes from the items stored for it, which this mapping does not
    // see. The repository fills it in from `channelItemsRepository`.
    latestItemPubDateMs: null,
    popularityRank: null,
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

  const kind = subscriptionChannelKindFromResourceType(record.resourceType);

  return {
    idText,
    sourceIdText: trimToNull(record.idText) ?? idText,
    title: trimToNull(record.title) ?? idText,
    imageUrl: trimToNull(record.imageUrl),
    source: 'addByRss',
    medium: mediumFromSubscriptionChannelKind(kind),
    kind,
    latestItemPubDateMs: record.latestItemPubDateMs,
    popularityRank: null,
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

/** Keep only follows that belong on a given Home chip. */
export const applySubscriptionChannelKind = (
  list: SubscribedChannel[],
  kind: SubscriptionChannelKind | null
): SubscribedChannel[] => {
  if (kind === null) {
    return list;
  }
  return list.filter((entry) => entry.kind === kind);
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

/**
 * Most-listened first, with subscriptions whose rank is unknown after those whose rank is known.
 *
 * An unknown rank is a follow this device has not ranked yet — usually a signed-out subscription,
 * or a signed-in one whose popularity walk has not landed. Sorting those to the bottom keeps a
 * brand new follow from claiming the top of the list on the strength of having no information at
 * all. Equal ranks fall back to title so the order is total.
 */
export const compareSubscribedByPopularity = (
  a: SubscribedChannel,
  b: SubscribedChannel
): number => {
  const aRank = a.popularityRank;
  const bRank = b.popularityRank;

  if (aRank === null && bRank === null) {
    return compareSubscribedByTitle(a, b);
  }
  if (aRank === null) {
    return 1;
  }
  if (bRank === null) {
    return -1;
  }
  if (aRank === bRank) {
    return compareSubscribedByTitle(a, b);
  }
  return aRank - bRank;
};

const comparatorForSort = (sort: SubscriptionSort) => {
  if (sort === 'recent') {
    return compareSubscribedByRecency;
  }
  if (sort === 'popularity') {
    return compareSubscribedByPopularity;
  }
  return compareSubscribedByTitle;
};

/** Order the merged list. `alphabetical` is the default. */
export const sortSubscriptions = (
  list: SubscribedChannel[],
  sort: SubscriptionSort = 'alphabetical'
): SubscribedChannel[] => {
  return [...list].sort(comparatorForSort(sort));
};
