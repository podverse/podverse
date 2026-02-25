import { MediumEnum, PAGINATION, sleep } from '@podverse/helpers';

import type {
  AddByRSSFeedRecord,
  AddByRSSMappedFeed,
  AddByRSSItemIndexItem,
  AddByRSSLivestreamIndexItem,
} from './types';
import { createAddByRSSIdText } from './ids';
import {
  bulkUpsertAddByRSSItemsIndexItems,
  bulkUpsertAddByRSSLivestreamIndexItems,
  clearAddByRSSItemsIndex,
  clearAddByRSSLivestreamIndex,
  getAddByRSSItemsIndexCount,
  getAddByRSSItemsIndexMeta,
  getAddByRSSItemsIndexPage,
  setAddByRSSItemsIndexMeta,
  getAllAddByRSSItems,
  getAllAddByRSSLivestreamItems,
} from './storage';
import { type MediumFilter, matchesMediumFilter } from './mediumHelpers';

// Re-export medium helpers for consumers
export {
  type MediumFilter,
  isPodcastMediumId,
  isMusicMediumId,
  matchesMediumFilter,
} from './mediumHelpers';

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

/**
 * Derive per-item medium from the first enclosure MIME type.
 * If it starts with "video/", return Video; otherwise return feedMediumFallback.
 */
export const getItemMediumIdFromBundle = (
  bundle: AddByRSSMappedFeed['items'][number],
  feedMediumFallback: number | null
): number | null => {
  const type = bundle.enclosures?.[0]?.item_enclosure?.type;
  if (typeof type === 'string' && type.toLowerCase().startsWith('video/')) {
    return MediumEnum.Video;
  }
  return feedMediumFallback;
};

const getChannelTitle = (feed: AddByRSSFeedRecord): string =>
  feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;

const getChannelImageUrl = (feed: AddByRSSFeedRecord): string | undefined =>
  feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined;

const getLiveItemGuid = (
  feed: AddByRSSFeedRecord,
  liveBundle: AddByRSSMappedFeed['liveItems'][number],
  fallbackId: number
): string => liveBundle.item.guid ?? `${feed.idText}-${fallbackId}`;

const toIndexItem = (
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
    channelTitle: getChannelTitle(feed),
    channelImageUrl: getChannelImageUrl(feed),
    mediumId,
    bundle,
    pubDateMs,
  };
};

const toLiveIndexItem = (
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

export const buildAddByRSSItemsIndex = async (feeds: AddByRSSFeedRecord[]) => {
  const existingItems = await getAllAddByRSSItems();
  const existingIdTextMap = new Map<string, string>();
  for (const item of existingItems) {
    existingIdTextMap.set(item.id, item.idText);
  }

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
      items.push(toIndexItem(feed, bundle, index, existingIdText));
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
  feeds: AddByRSSFeedRecord[]
): Promise<AddByRSSLivestreamIndexItem[]> => {
  const existingItems = await getAllAddByRSSLivestreamItems();
  const existingIdTextMap = new Map<string, string>();
  for (const item of existingItems) {
    existingIdTextMap.set(item.id, item.idText);
  }

  await clearAddByRSSLivestreamIndex();

  const items: AddByRSSLivestreamIndexItem[] = [];
  let processed = 0;

  for (const feed of feeds) {
    const liveItems = feed.mappedFeed?.liveItems ?? [];
    liveItems.forEach((bundle, index) => {
      const itemGuid = getLiveItemGuid(feed, bundle, index);
      const compositeId = `${feed.idText}-${itemGuid}`;
      const existingIdText = existingIdTextMap.get(compositeId);
      items.push(toLiveIndexItem(feed, bundle, index, existingIdText));
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
      items.push(toIndexItem(feed, bundle, seen));
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
        return toIndexItem(feed, bundle, fallbackId, existingIdText);
      }
      fallbackId += 1;
    }
  }

  return null;
};
