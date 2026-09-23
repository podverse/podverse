import {
  addByRSSFeedListArtworkCandidates,
  articleStrippedTitle,
  ARTWORK_LIST_SIZE_FIND_TARGET,
  primaryListArtworkUrl,
} from '@podverse/helpers';
import { htmlToPlainTextPreview } from '@podverse/helpers/html';
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

/**
 * Publication instant from a mapped-item `pub_date`.
 *
 * SQLite round-trips store Dates as ISO strings, so callers must not call `.getTime()` on the
 * field directly.
 */
const pubDateMs = (value: Date | string | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

export const buildAddByRssHomeDetailData = (
  feed: MobileAddByRSSFeedRecord,
  mappedFeed: AddByRSSMappedFeed
): AddByRssHomeDetailData => {
  const channelTitle = mappedFeed.channel.channel.title ?? feed.title ?? feed.feedUrl;
  const channelImageUrl =
    addByRSSFeedListArtworkCandidates({
      channelImages: mappedFeed.channel.images,
      comparison: 'lesser',
      feedImageUrl: feed.imageUrl,
      sizeFindTarget: ARTWORK_LIST_SIZE_FIND_TARGET,
    })[0] ?? null;

  const episodeRows = mappedFeed.items.map((itemBundle, itemIndex) => {
    const guid = itemBundle.item.guid ?? String(itemIndex);
    const title = itemBundle.item.title ?? guid;
    const imageUrl =
      primaryListArtworkUrl(itemBundle.images, mappedFeed.channel.images) ?? channelImageUrl;
    const plainDescription = htmlToPlainTextPreview(itemBundle.description?.value);
    const duration = itemBundle.about?.duration?.trim() ?? '';

    return {
      description: plainDescription.length > 0 ? plainDescription : null,
      duration: duration.length > 0 ? duration : null,
      id: `${feed.idText}-${guid}`,
      imageUrl,
      itemBundle,
      itemIndex,
      subtitle: channelTitle,
      title,
      updatedAt: pubDateMs(itemBundle.item.pub_date),
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

    const aDateMs = pubDateMs(a.itemBundle.item.pub_date);
    const bDateMs = pubDateMs(b.itemBundle.item.pub_date);
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
