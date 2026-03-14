import type { MediumFilter } from '@podverse/helpers';
import { createAddByRSSIdText, matchesMediumFilter } from '@podverse/helpers';

import type { AddByRSSFeedRecordWithMapped } from './boost.js';
import { getItemMediumIdFromBundle } from './itemIndexPure.js';
import type {
  AddByRSSItemIndexItem,
  AddByRSSLivestreamIndexItem,
  AddByRSSMappedFeed,
} from './types.js';

export { getItemMediumIdFromBundle } from './itemIndexPure.js';
export type { MediumFilter } from '@podverse/helpers';
export { matchesMediumFilter } from '@podverse/helpers';

/** Feed record with mapped feed for index building (idText, title, etc. + mappedFeed). */
type FeedForIndex = AddByRSSFeedRecordWithMapped;

const getFeedMedium = (feed: FeedForIndex): number | null =>
  feed.mappedFeed?.channel?.channel?.medium_id ?? null;

const getChannelTitle = (feed: FeedForIndex): string =>
  feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;

const getChannelImageUrl = (feed: FeedForIndex): string | undefined =>
  feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined;

const getLiveItemGuid = (
  feed: FeedForIndex,
  liveBundle: AddByRSSMappedFeed['liveItems'][number],
  fallbackId: number
): string => liveBundle.item.guid ?? `${feed.idText}-${fallbackId}`;

export const toIndexItem = (
  feed: FeedForIndex,
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

export const toLiveIndexItem = (
  feed: FeedForIndex,
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

export const getFastAddByRSSItemsPage = (params: {
  feeds: FeedForIndex[];
  sort: 'recent' | 'oldest';
  pageSize: number;
  mediumFilter?: MediumFilter;
}): AddByRSSItemIndexItem[] => {
  const items: AddByRSSItemIndexItem[] = [];
  let seen = 0;
  const filter = params.mediumFilter ?? 'all';

  for (const feed of params.feeds) {
    const medium = getFeedMedium(feed);
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
  feeds: FeedForIndex[],
  itemGuid: string,
  existingIdTextMap?: Map<string, string>,
  mediumFilter?: MediumFilter
): AddByRSSItemIndexItem | null => {
  let fallbackId = 0;
  const filter = mediumFilter ?? 'all';

  for (const feed of feeds) {
    const medium = getFeedMedium(feed);
    if (!matchesMediumFilter(medium, filter)) {
      continue;
    }
    const feedItems = feed.mappedFeed?.items ?? [];
    for (const bundle of feedItems) {
      const guid = bundle.item.guid ?? null;
      if (guid !== null && guid === itemGuid) {
        const compositeId = `${feed.idText}-${itemGuid}`;
        const existingIdText = existingIdTextMap?.get(compositeId);
        return toIndexItem(feed, bundle, fallbackId, existingIdText);
      }
      fallbackId += 1;
    }
  }

  return null;
};
