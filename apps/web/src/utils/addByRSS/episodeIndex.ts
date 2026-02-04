import { MediumEnum, PAGINATION, sleep } from '@podverse/helpers';

import type { AddByRSSFeedRecord, AddByRSSMappedFeed, AddByRSSEpisodeIndexItem } from './types';
import {
  bulkUpsertAddByRSSEpisodesIndexItems,
  clearAddByRSSEpisodesIndex,
  getAddByRSSEpisodesIndexCount,
  getAddByRSSEpisodesIndexMeta,
  getAddByRSSEpisodesIndexPage,
  setAddByRSSEpisodesIndexMeta,
} from './storage';

export const ADD_BY_RSS_EPISODES_PAGE_SIZE = PAGINATION.DEFAULT_LIMIT;
const INDEX_META_KEY = 'episodesIndexInfo';
const BUILD_CHUNK_SIZE = 200;

type EpisodeIndexMeta = {
  key: string;
  updatedAt: string;
  totalCount: number;
};

const isPodcastMedium = (mediumId?: number | null) =>
  mediumId === null ||
  typeof mediumId === 'undefined' ||
  mediumId === MediumEnum.Podcast ||
  mediumId === MediumEnum.Video ||
  mediumId === MediumEnum.PodcastL ||
  mediumId === MediumEnum.VideoL ||
  mediumId === MediumEnum.PublisherPodcast ||
  mediumId === MediumEnum.PublisherVideo;

const getFeedMedium = (feed: AddByRSSFeedRecord): number | null | undefined =>
  feed.mappedFeed?.channel?.channel?.medium_id ?? null;

const getFeedTitle = (feed: AddByRSSFeedRecord): string =>
  feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;

const getFeedImageUrl = (feed: AddByRSSFeedRecord): string | undefined =>
  feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined;

const toIndexItem = (
  feed: AddByRSSFeedRecord,
  bundle: AddByRSSMappedFeed['items'][number],
  fallbackId: number
): AddByRSSEpisodeIndexItem => {
  const itemGuid = bundle.item.guid ?? `${feed.idText}-${fallbackId}`;
  const pubDateMs = bundle.item.pub_date ? new Date(bundle.item.pub_date).getTime() : 0;

  return {
    id: `${feed.idText}-${itemGuid}`,
    itemGuid,
    feedIdText: feed.idText,
    feedTitle: getFeedTitle(feed),
    feedImageUrl: getFeedImageUrl(feed),
    bundle,
    pubDateMs,
  };
};

export const getAddByRSSEpisodesIndexInfo = async (): Promise<EpisodeIndexMeta | null> => {
  return getAddByRSSEpisodesIndexMeta<EpisodeIndexMeta>(INDEX_META_KEY);
};

export const getAddByRSSEpisodesIndexPageOrEmpty = async (params: {
  sort: 'recent' | 'oldest';
  page: number;
  pageSize: number;
}) => {
  const count = await getAddByRSSEpisodesIndexCount();
  if (count === 0) {
    return { items: [], totalCount: 0 };
  }

  return getAddByRSSEpisodesIndexPage(params);
};

export const buildAddByRSSEpisodesIndex = async (feeds: AddByRSSFeedRecord[]) => {
  await clearAddByRSSEpisodesIndex();

  const items: AddByRSSEpisodeIndexItem[] = [];
  let processed = 0;

  for (const feed of feeds) {
    const medium = getFeedMedium(feed);
    if (!isPodcastMedium(medium)) {
      continue;
    }
    const feedItems = feed.mappedFeed?.items ?? [];
    feedItems.forEach((bundle, index) => {
      items.push(toIndexItem(feed, bundle, index));
    });
    processed += feedItems.length;
    if (processed >= BUILD_CHUNK_SIZE) {
      processed = 0;
      await sleep(0);
    }
  }

  if (items.length > 0) {
    await bulkUpsertAddByRSSEpisodesIndexItems(items);
  }

  await setAddByRSSEpisodesIndexMeta({
    key: INDEX_META_KEY,
    totalCount: items.length,
    updatedAt: new Date().toISOString(),
  });

  return items.length;
};

export const getFastAddByRSSEpisodesPage = (params: {
  feeds: AddByRSSFeedRecord[];
  sort: 'recent' | 'oldest';
  pageSize: number;
}): AddByRSSEpisodeIndexItem[] => {
  const items: AddByRSSEpisodeIndexItem[] = [];
  let seen = 0;

  for (const feed of params.feeds) {
    const medium = getFeedMedium(feed);
    if (!isPodcastMedium(medium)) {
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

export const findAddByRSSEpisodeByGuid = (
  feeds: AddByRSSFeedRecord[],
  itemGuid: string
): AddByRSSEpisodeIndexItem | null => {
  let fallbackId = 0;
  for (const feed of feeds) {
    const medium = getFeedMedium(feed);
    if (!isPodcastMedium(medium)) {
      continue;
    }
    const feedItems = feed.mappedFeed?.items ?? [];
    for (const bundle of feedItems) {
      const guid = bundle.item.guid ?? null;
      if (guid && guid === itemGuid) {
        return toIndexItem(feed, bundle, fallbackId);
      }
      fallbackId += 1;
    }
  }

  return null;
};
