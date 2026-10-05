import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import { addByRssRepository, subscriptionsRepository } from '../../data/repositories';
import type { AddByRssNeedsCredentialsFeed } from '../../lib/addByRss/credentials';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import type {
  AddByRssLibraryMediaType,
  AddByRssLibrarySortOption,
} from '../../prefs/addByRssListPrefs';
import type { AddByRssHomeEpisode } from '../home/addByRssHomeDetailData';
import {
  buildAddByRssHomeDetailData,
  sortAddByRssHomeEpisodes,
} from '../home/addByRssHomeDetailData';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { attachSubscriptionMetadataOrBare } from '../home/homeFeedData';

export type AddByRssLibraryItemRow = AddByRssHomeEpisode & {
  feed: MobileAddByRSSFeedRecord;
  mappedFeed: AddByRSSMappedFeed;
};

export type AddByRssLibraryFeedResult = {
  needsCredentials: AddByRssNeedsCredentialsFeed<MobileAddByRSSFeedRecord>[];
  rows: HomeFeedRowData[];
  /** Present when the chip is episodes or tracks, keyed by row id for play. */
  itemRowsById: ReadonlyMap<string, AddByRssLibraryItemRow>;
};

const channelKindForMediaType = (
  mediaType: Extract<AddByRssLibraryMediaType, 'podcasts' | 'artists' | 'albums'>
): 'podcasts' | 'artists' | 'albums' => {
  return mediaType;
};

const itemResourceKinds = (
  mediaType: 'episodes' | 'tracks'
): ReadonlyArray<MobileAddByRSSFeedRecord['resourceType']> => {
  if (mediaType === 'episodes') {
    return ['podcasts', 'episodes', 'livestreams'];
  }
  return ['artists', 'albums', 'tracks'];
};

/**
 * Add by RSS library rows for one media-type chip. Channel chips read ready follows only; feeds
 * waiting on a username and password are returned separately for the footer section.
 */
export const fetchAddByRssLibraryFeed = async (
  mediaType: AddByRssLibraryMediaType,
  sort: AddByRssLibrarySortOption
): Promise<AddByRssLibraryFeedResult> => {
  const { needsCredentials, ready } = await addByRssRepository.listFeedsByCredentials();

  if (mediaType === 'podcasts' || mediaType === 'artists' || mediaType === 'albums') {
    const kind = channelKindForMediaType(mediaType);
    const subscribed = await subscriptionsRepository.list({
      credentials: 'ready',
      filter: 'addByRss',
      kind,
      sort,
    });
    const rows = await attachSubscriptionMetadataOrBare(subscribed, mediaType);
    const filteredNeeds = needsCredentials.filter((item) => {
      const resourceKind =
        item.feed.resourceType === 'artists'
          ? 'artists'
          : item.feed.resourceType === 'albums' || item.feed.resourceType === 'tracks'
            ? 'albums'
            : 'podcasts';
      return resourceKind === kind;
    });
    return { itemRowsById: new Map(), needsCredentials: filteredNeeds, rows };
  }

  const allowed = new Set(itemResourceKinds(mediaType));
  const feeds = ready.filter((feed) => allowed.has(feed.resourceType));
  const itemRows: AddByRssLibraryItemRow[] = [];

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

  const sorted = sortAddByRssHomeEpisodes(itemRows, sort);
  const itemRowsById = new Map<string, AddByRssLibraryItemRow>();
  const rows: HomeFeedRowData[] = sorted.map((row) => {
    itemRowsById.set(row.id, row);
    return {
      description: row.description,
      duration: row.duration,
      id: row.id,
      imageUrl: row.imageUrl,
      source: 'addByRss',
      sourceId: row.feed.idText,
      subtitle: row.subtitle,
      title: row.title,
      updatedAt: row.updatedAt,
    };
  });

  return { itemRowsById, needsCredentials: [], rows };
};
