import { articleStrippedTitle } from '@podverse/helpers';
import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import type { HomeFeedRowData } from './homeFeedData';

export type AddByRssHomeEpisode = HomeFeedRowData & {
  itemBundle: AddByRSSMappedFeed['items'][number];
  itemIndex: number;
};

export type AddByRssHomeDetailData = {
  episodeRows: AddByRssHomeEpisode[];
  feed: MobileAddByRSSFeedRecord;
  mappedFeed: AddByRSSMappedFeed | null;
};

export const buildAddByRssHomeDetailData = (
  feed: MobileAddByRSSFeedRecord,
  mappedFeed: AddByRSSMappedFeed
): AddByRssHomeDetailData => {
  const channelTitle = mappedFeed.channel.channel.title ?? feed.title ?? feed.feedUrl;
  const channelImageUrl = mappedFeed.channel.images[0]?.url ?? feed.imageUrl;

  const episodeRows = mappedFeed.items.map((itemBundle, itemIndex) => {
    const guid = itemBundle.item.guid ?? String(itemIndex);
    const title = itemBundle.item.title ?? guid;
    const imageUrl = itemBundle.images[0]?.url ?? channelImageUrl;

    return {
      id: `${feed.idText}-${guid}`,
      imageUrl,
      itemBundle,
      itemIndex,
      subtitle: channelTitle,
      title,
    };
  });

  return { episodeRows, feed, mappedFeed };
};

export const sortAddByRssHomeEpisodes = (
  rows: AddByRssHomeEpisode[],
  sort: 'alphabetical' | 'recent'
): AddByRssHomeEpisode[] => {
  return [...rows].sort((a, b) => {
    if (sort === 'alphabetical') {
      return articleStrippedTitle(a.title).localeCompare(articleStrippedTitle(b.title));
    }

    const aDateMs = a.itemBundle.item.pub_date?.getTime() ?? null;
    const bDateMs = b.itemBundle.item.pub_date?.getTime() ?? null;
    if (aDateMs === null && bDateMs === null) {
      return articleStrippedTitle(a.title).localeCompare(articleStrippedTitle(b.title));
    }
    if (aDateMs === null) {
      return 1;
    }
    if (bDateMs === null) {
      return -1;
    }
    if (aDateMs === bDateMs) {
      return articleStrippedTitle(a.title).localeCompare(articleStrippedTitle(b.title));
    }
    return bDateMs - aDateMs;
  });
};
