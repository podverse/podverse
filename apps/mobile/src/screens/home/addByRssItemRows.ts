import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import { addByRssRepository } from '../../data/repositories';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import type { AddByRssHomeEpisode } from './addByRssHomeDetailData';
import { buildAddByRssHomeDetailData } from './addByRssHomeDetailData';
import type { HomeFeedRowData } from './homeFeedData';

export type AddByRssItemRow = AddByRssHomeEpisode & {
  feed: MobileAddByRSSFeedRecord;
  mappedFeed: AddByRSSMappedFeed;
};

/**
 * Resource types whose items belong on an Episodes or Tracks list.
 *
 * Livestreams are a flag on a feed, not a resource type, so a feed is included by its medium.
 */
const itemResourceKinds = (
  mediaType: 'episodes' | 'tracks'
): ReadonlyArray<MobileAddByRSSFeedRecord['resourceType']> => {
  if (mediaType === 'episodes') {
    return ['podcasts', 'episodes'];
  }
  return ['artists', 'albums', 'tracks'];
};

/** Every item of the given ready feeds that belongs on an Episodes or Tracks list, unsorted. */
export const listAddByRssItemRows = async (
  mediaType: 'episodes' | 'tracks',
  readyFeeds: readonly MobileAddByRSSFeedRecord[]
): Promise<AddByRssItemRow[]> => {
  const allowed = new Set(itemResourceKinds(mediaType));
  const feeds = readyFeeds.filter((feed) => allowed.has(feed.resourceType));
  const itemRows: AddByRssItemRow[] = [];

  for (const feed of feeds) {
    const mappedFeed = await addByRssRepository.getMappedFeedByUrl(feed.feedUrl);
    if (mappedFeed === null) {
      continue;
    }
    const { episodeRows } = buildAddByRssHomeDetailData(feed, mappedFeed);
    for (const episode of episodeRows) {
      itemRows.push({ ...episode, feed, mappedFeed });
    }
  }

  return itemRows;
};

/** The list row for an Add by RSS item; `compact` matches Home's track rows. */
export const toAddByRssItemHomeRow = (
  item: AddByRssItemRow,
  options: { compact?: boolean } = {}
): HomeFeedRowData => {
  if (options.compact === true) {
    return {
      id: item.id,
      imageUrl: item.imageUrl,
      source: 'addByRss',
      sourceId: item.feed.idText,
      subtitle: item.subtitle,
      title: item.title,
    };
  }

  return {
    ...(item.playbackMediaId.length > 0
      ? {
          completion: {
            idText: item.playbackMediaId,
            kind: 'add_by_rss' as const,
            numericId: null,
          },
        }
      : {}),
    description: item.description,
    duration: item.duration,
    id: item.id,
    imageUrl: item.imageUrl,
    playbackMediaId: item.playbackMediaId,
    source: 'addByRss',
    sourceId: item.feed.idText,
    subtitle: item.subtitle,
    title: item.title,
    updatedAt: item.updatedAt,
  };
};
