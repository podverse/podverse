import type { MediumFilter } from '@podverse/helpers';
import {
  createAddByRSSIdText,
  isDeviceLocalAddByRSSGuid,
  PAGINATION,
  sleep,
} from '@podverse/helpers';
import { matchesMediumFilter } from '@podverse/helpers';
import { getItemMediumIdFromBundle } from '@podverse/parser-mapping';

import {
  bulkUpsertAddByRSSItemsIndexItems,
  bulkUpsertAddByRSSLivestreamIndexItems,
  clearAddByRSSItemsIndex,
  clearAddByRSSLivestreamIndex,
  getAddByRSSItemsIndexCount,
  getAddByRSSItemsIndexMeta,
  getAddByRSSItemsIndexPage,
  getAllAddByRSSItems,
  getAllAddByRSSLivestreamItems,
  setAddByRSSItemsIndexMeta,
} from './storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSItemIndexItem,
  AddByRSSLivestreamIndexItem,
  AddByRSSMappedFeed,
} from './types';

export type { MediumFilter } from '@podverse/helpers';
export { getItemMediumIdFromBundle } from '@podverse/parser-mapping';
export { isPodcastMediumId, isMusicMediumId, matchesMediumFilter } from '@podverse/helpers';

export const ADD_BY_RSS_ITEMS_PAGE_SIZE = PAGINATION.DEFAULT_LIMIT;
const INDEX_META_KEY = 'itemsIndexInfo';
const BUILD_CHUNK_SIZE = 200;

type ItemIndexMeta = {
  key: string;
  updatedAt: string;
  totalCount: number;
};

const getFeedMedium = (feed: AddByRSSFeedRecord): number | null =>
  feed.mappedFeed?.channel?.channel?.medium_id ?? null;

const getChannelTitle = (feed: AddByRSSFeedRecord): string =>
  feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;

const getChannelImageUrl = (feed: AddByRSSFeedRecord): string | undefined =>
  feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined;

const getLiveItemGuid = (
  feed: AddByRSSFeedRecord,
  liveBundle: AddByRSSMappedFeed['liveItems'][number],
  fallbackId: number
): string => liveBundle.item.guid ?? `${feed.idText}-${fallbackId}`;

export const toAddByRSSItemIndexItem = (
  feed: AddByRSSFeedRecord,
  bundle: AddByRSSMappedFeed['items'][number],
  fallbackId: number,
  existingIdText?: string
): AddByRSSItemIndexItem => {
  const itemGuid = bundle.item.guid ?? `${feed.idText}-${fallbackId}`;
  const pubDateMs = bundle.item.pub_date ? new Date(bundle.item.pub_date).getTime() : 0;
  const idText = existingIdText ?? createAddByRSSIdText();
  const mediumId = getItemMediumIdFromBundle(bundle, getFeedMedium(feed));

  return {
    id: `${feed.idText}-${itemGuid}`,
    idText,
    itemGuid,
    channelIdText: feed.idText,
    feedUrl: feed.feedUrl,
    channelTitle: getChannelTitle(feed),
    channelImageUrl: getChannelImageUrl(feed),
    mediumId,
    bundle,
    pubDateMs,
  };
};

export const toAddByRSSLivestreamIndexItem = (
  feed: AddByRSSFeedRecord,
  liveBundle: AddByRSSMappedFeed['liveItems'][number],
  fallbackId: number,
  existingIdText?: string
): AddByRSSLivestreamIndexItem => {
  const itemGuid = getLiveItemGuid(feed, liveBundle, fallbackId);
  const startTimeMs = liveBundle.liveItem?.start_time
    ? new Date(liveBundle.liveItem.start_time).getTime()
    : 0;
  const idText = existingIdText ?? createAddByRSSIdText();
  const mediumId = getFeedMedium(feed);

  return {
    id: `${feed.idText}-${itemGuid}`,
    idText,
    itemGuid,
    channelIdText: feed.idText,
    feedUrl: feed.feedUrl,
    channelTitle: getChannelTitle(feed),
    channelImageUrl: getChannelImageUrl(feed),
    mediumId,
    liveItem: liveBundle.liveItem,
    item: liveBundle.item,
    startTimeMs,
  };
};

export const getAddByRSSItemsIndexInfo = async (): Promise<ItemIndexMeta | null> => {
  return getAddByRSSItemsIndexMeta<ItemIndexMeta>(INDEX_META_KEY);
};

export const buildItemIdTextMap = async (): Promise<Map<string, string>> => {
  const items = await getAllAddByRSSItems();
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(item.id, item.idText);
  }
  return map;
};

export const buildLivestreamIdTextMap = async (): Promise<Map<string, string>> => {
  const items = await getAllAddByRSSLivestreamItems();
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(item.id, item.idText);
  }
  return map;
};

export const getAddByRSSItemsIndexPageOrEmpty = async (params: {
  sort: 'recent' | 'oldest';
  page: number;
  pageSize: number;
  mediumFilter?: MediumFilter;
}) => {
  const count = await getAddByRSSItemsIndexCount();
  if (count === 0) {
    return { items: [], totalCount: 0 };
  }

  const result = await getAddByRSSItemsIndexPage(params);

  // Apply medium filter if specified
  if (params.mediumFilter && params.mediumFilter !== 'all') {
    const mediumFilter = params.mediumFilter;
    const filtered = result.items.filter((item) =>
      matchesMediumFilter(item.mediumId, mediumFilter)
    );
    return { items: filtered, totalCount: filtered.length };
  }

  return result;
};

/** Newest first. An item with no publish date (`pubDateMs` 0) sorts after dated items. */
const compareNewestPubDate = (a: AddByRSSItemIndexItem, b: AddByRSSItemIndexItem): number => {
  const aUndated = a.pubDateMs === 0;
  const bUndated = b.pubDateMs === 0;
  if (aUndated && bUndated) {
    return 0;
  }
  if (aUndated) {
    return 1;
  }
  if (bUndated) {
    return -1;
  }
  return b.pubDateMs - a.pubDateMs;
};

const mergeIdTextMaps = (
  existing: ReadonlyMap<string, string>,
  seed: ReadonlyMap<string, string> | undefined
): Map<string, string> => {
  const merged = new Map(existing);
  if (seed === undefined) {
    return merged;
  }
  for (const [id, idText] of seed) {
    if (!merged.has(id)) {
      merged.set(id, idText);
    }
  }
  return merged;
};

/**
 * Newest parsed items across these feeds, capped at `limit`.
 *
 * Every feed is read before the cap is applied, so a newer item on a later feed is kept.
 * `existingIdTextByCompositeId` reuses an id the items index already stored for that episode.
 */
export const selectNewestAddByRSSItemsFromFeeds = (params: {
  feeds: readonly AddByRSSFeedRecord[];
  limit: number;
  existingIdTextByCompositeId?: ReadonlyMap<string, string>;
}): AddByRSSItemIndexItem[] => {
  const items: AddByRSSItemIndexItem[] = [];
  for (const feed of params.feeds) {
    const feedItems = feed.mappedFeed?.items ?? [];
    feedItems.forEach((bundle, index) => {
      const itemGuid = bundle.item.guid ?? `${feed.idText}-${index}`;
      const compositeId = `${feed.idText}-${itemGuid}`;
      const existingIdText = params.existingIdTextByCompositeId?.get(compositeId);
      items.push(toAddByRSSItemIndexItem(feed, bundle, index, existingIdText));
    });
  }
  items.sort(compareNewestPubDate);
  if (items.length <= params.limit) {
    return items;
  }
  return items.slice(0, params.limit);
};

/**
 * Livestream index rows from these feeds' parsed live items.
 *
 * `existingIdTextByCompositeId` reuses an id the livestream index already stored.
 */
export const livestreamIndexItemsFromFeeds = (
  feeds: readonly AddByRSSFeedRecord[],
  existingIdTextByCompositeId?: ReadonlyMap<string, string>
): AddByRSSLivestreamIndexItem[] => {
  const items: AddByRSSLivestreamIndexItem[] = [];
  for (const feed of feeds) {
    const liveItems = feed.mappedFeed?.liveItems ?? [];
    liveItems.forEach((bundle, index) => {
      const itemGuid = getLiveItemGuid(feed, bundle, index);
      const compositeId = `${feed.idText}-${itemGuid}`;
      const existingIdText = existingIdTextByCompositeId?.get(compositeId);
      items.push(toAddByRSSLivestreamIndexItem(feed, bundle, index, existingIdText));
    });
  }
  return items;
};

export const buildAddByRSSItemsIndex = async (
  feeds: AddByRSSFeedRecord[],
  seedIdTextByCompositeId?: ReadonlyMap<string, string>
) => {
  const existingItems = await getAllAddByRSSItems();
  const storedIdTextMap = new Map<string, string>();
  for (const item of existingItems) {
    storedIdTextMap.set(item.id, item.idText);
  }
  const existingIdTextMap = mergeIdTextMaps(storedIdTextMap, seedIdTextByCompositeId);

  await clearAddByRSSItemsIndex();

  const items: AddByRSSItemIndexItem[] = [];
  let processed = 0;

  // Index ALL items regardless of medium (filtering happens at query time)
  for (const feed of feeds) {
    const feedItems = feed.mappedFeed?.items ?? [];
    feedItems.forEach((bundle, index) => {
      const itemGuid = bundle.item.guid ?? `${feed.idText}-${index}`;
      const compositeId = `${feed.idText}-${itemGuid}`;
      const existingIdText = existingIdTextMap.get(compositeId);
      items.push(toAddByRSSItemIndexItem(feed, bundle, index, existingIdText));
    });
    processed += feedItems.length;
    if (processed >= BUILD_CHUNK_SIZE) {
      processed = 0;
      await sleep(0);
    }
  }

  if (items.length > 0) {
    await bulkUpsertAddByRSSItemsIndexItems(items);
  }

  await setAddByRSSItemsIndexMeta({
    key: INDEX_META_KEY,
    totalCount: items.length,
    updatedAt: new Date().toISOString(),
  });

  return items.length;
};

export const buildAddByRSSLivestreamIndex = async (
  feeds: AddByRSSFeedRecord[],
  seedIdTextByCompositeId?: ReadonlyMap<string, string>
): Promise<AddByRSSLivestreamIndexItem[]> => {
  const existingItems = await getAllAddByRSSLivestreamItems();
  const storedIdTextMap = new Map<string, string>();
  for (const item of existingItems) {
    storedIdTextMap.set(item.id, item.idText);
  }
  const existingIdTextMap = mergeIdTextMaps(storedIdTextMap, seedIdTextByCompositeId);

  await clearAddByRSSLivestreamIndex();

  const items: AddByRSSLivestreamIndexItem[] = [];
  let processed = 0;

  for (const feed of feeds) {
    const liveItems = feed.mappedFeed?.liveItems ?? [];
    liveItems.forEach((bundle, index) => {
      const itemGuid = getLiveItemGuid(feed, bundle, index);
      const compositeId = `${feed.idText}-${itemGuid}`;
      const existingIdText = existingIdTextMap.get(compositeId);
      items.push(toAddByRSSLivestreamIndexItem(feed, bundle, index, existingIdText));
    });
    processed += liveItems.length;
    if (processed >= BUILD_CHUNK_SIZE) {
      processed = 0;
      await sleep(0);
    }
  }

  if (items.length > 0) {
    await bulkUpsertAddByRSSLivestreamIndexItems(items);
  }

  return items;
};

export const getFastAddByRSSItemsPage = (params: {
  feeds: AddByRSSFeedRecord[];
  sort: 'recent' | 'oldest';
  pageSize: number;
  mediumFilter?: MediumFilter;
}): AddByRSSItemIndexItem[] => {
  const items: AddByRSSItemIndexItem[] = [];
  let seen = 0;
  const filter = params.mediumFilter ?? 'all';

  for (const feed of params.feeds) {
    const medium = getFeedMedium(feed);
    // Apply medium filter
    if (!matchesMediumFilter(medium, filter)) {
      continue;
    }
    const feedItems = feed.mappedFeed?.items ?? [];
    for (const bundle of feedItems) {
      items.push(toAddByRSSItemIndexItem(feed, bundle, seen));
      seen += 1;
      if (items.length >= params.pageSize) {
        break;
      }
    }
    if (items.length >= params.pageSize) {
      break;
    }
  }

  items.sort((a, b) =>
    params.sort === 'recent' ? b.pubDateMs - a.pubDateMs : a.pubDateMs - b.pubDateMs
  );

  return items;
};

export const findAddByRSSItemByGuid = (
  feeds: AddByRSSFeedRecord[],
  itemGuid: string,
  existingIdTextMap?: Map<string, string>,
  mediumFilter?: MediumFilter
): AddByRSSItemIndexItem | null => {
  let fallbackId = 0;
  const filter = mediumFilter ?? 'all';

  for (const feed of feeds) {
    const medium = getFeedMedium(feed);
    // Apply medium filter if specified
    if (!matchesMediumFilter(medium, filter)) {
      continue;
    }
    const feedItems = feed.mappedFeed?.items ?? [];
    for (const bundle of feedItems) {
      const guid = bundle.item.guid ?? null;
      if (guid && guid === itemGuid) {
        const compositeId = `${feed.idText}-${itemGuid}`;
        const existingIdText = existingIdTextMap?.get(compositeId);
        return toAddByRSSItemIndexItem(feed, bundle, fallbackId, existingIdText);
      }
      fallbackId += 1;
    }
  }

  return null;
};

const bundleHasEnclosureUrl = (
  bundle: AddByRSSMappedFeed['items'][number],
  enclosureUrl: string
): boolean =>
  bundle.enclosures.some((enclosure) =>
    enclosure.item_enclosure_sources.some((source) => source.uri.trim() === enclosureUrl)
  );

/**
 * The parsed episode in `feed` that a queue or playlist row refers to. A row guid that is set and
 * not device-local (`isDeviceLocalAddByRSSGuid` against the row's `channel_id_text`) must match;
 * otherwise the row's `enclosure_url` must match one of the episode's sources.
 */
export const findAddByRSSItemInFeed = (
  feed: AddByRSSFeedRecord,
  match: { guid: string | null; channelIdText: string | null; enclosureUrl: string | null },
  existingIdTextMap?: Map<string, string>
): AddByRSSItemIndexItem | null => {
  const guid = match.guid?.trim() ?? '';
  const enclosureUrl = match.enclosureUrl?.trim() ?? '';
  const matchByGuid = guid !== '' && !isDeviceLocalAddByRSSGuid(guid, match.channelIdText);
  if (!matchByGuid && enclosureUrl === '') {
    return null;
  }

  const feedItems = feed.mappedFeed?.items ?? [];
  for (const [index, bundle] of feedItems.entries()) {
    const isMatch = matchByGuid
      ? bundle.item.guid === guid
      : bundleHasEnclosureUrl(bundle, enclosureUrl);
    if (!isMatch) {
      continue;
    }
    const itemGuid = bundle.item.guid ?? `${feed.idText}-${index}`;
    const existingIdText = existingIdTextMap?.get(`${feed.idText}-${itemGuid}`);
    return toAddByRSSItemIndexItem(feed, bundle, index, existingIdText);
  }

  return null;
};
