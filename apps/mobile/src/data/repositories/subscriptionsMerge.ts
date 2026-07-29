import type { DTOChannel } from '@podverse/helpers';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';

/**
 * Pure merge/map/filter/sort helpers for the unified subscriptions list (directory follows +
 * add-by-RSS). Kept free of `expo-sqlite` / Expo imports so the mobile node-only Vitest suite can
 * cover them (see subscriptionsRepository.ts for the SQLite cache + API hydration that consume
 * these). Detail: docs/proposals/mobile/_master-plan_/details/600-unified-subscriptions-repository.md
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

const mediumIsMusicResourceType = (resourceType: MobileAddByRSSFeedRecord['resourceType']): boolean => {
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

const LEADING_ARTICLE = /^(the|a|an)\s+/;

/** Sort key: lowercase, trimmed, leading article stripped (mirrors legacy alphabetical sort). */
const sortableTitle = (title: string): string => {
  return title.trim().toLowerCase().replace(LEADING_ARTICLE, '');
};

export const compareSubscribedByTitle = (a: SubscribedChannel, b: SubscribedChannel): number => {
  return sortableTitle(a.title).localeCompare(sortableTitle(b.title));
};

/**
 * Sort the merged list. `alphabetical` (default) mirrors legacy podverse-rn. `recent` is accepted
 * for API stability but currently falls back to alphabetical (per-source recency is a follow-on).
 */
export const sortSubscriptions = (
  list: SubscribedChannel[],
  _sort: SubscriptionSort = 'alphabetical'
): SubscribedChannel[] => {
  return [...list].sort(compareSubscribedByTitle);
};
