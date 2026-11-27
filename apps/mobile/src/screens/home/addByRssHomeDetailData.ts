import {
  addByRSSFeedListArtworkCandidates,
  articleStrippedTitle,
  ARTWORK_LIST_SIZE_FIND_TARGET,
  primaryChannelLightboxArtworkUrl,
  primaryListArtworkUrl,
} from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';
import { htmlToPlainTextPreview } from '@podverse/helpers/html';
import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import type { AboutFundingLink, AboutPerson } from '../../components/content';
import type { ChannelAboutSource } from '../../components/content/channelAboutCells';
import { toAddByRssItemPlaybackResourceData } from '../../lib/addByRss/domain';
import { addByRssDownloadItemIdText } from '../../lib/addByRss/downloadIdText';
import { addByRssDownloadItem } from '../../lib/addByRss/downloadItem';
import { addByRssPlaybackMediaId } from '../../lib/addByRss/resourceData';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import type { AddByRssLibrarySortOption } from '../../prefs/addByRssListPrefs';
import type { AddByRssEpisodeSort, AddByRssTrackSort } from '../../prefs/detailListPrefs';
import type { HomeFeedRowData } from './homeFeedData';

export type AddByRssHomeEpisode = HomeFeedRowData & {
  /** Partial item a download is enqueued with. Null when the item has no enclosure. */
  downloadItem: DTOItem | null;
  /** Download index id. Distinct from `id`, which is the row key. */
  downloadItemIdText: string;
  itemBundle: AddByRSSMappedFeed['items'][number];
  itemIndex: number;
  /** Guid when present, otherwise the item index. The row `id` ends with this value. */
  itemKey: string;
  playbackMediaId: string;
};

export type AddByRssHomeDetailData = {
  about: ChannelAboutSource & { id: string };
  episodeRows: AddByRssHomeEpisode[];
  feed: MobileAddByRSSFeedRecord;
  fundings: AboutFundingLink[];
  /** True when the stored bundle was readable. An omitted option follows `mappedFeed`. */
  hasParsedBundle: boolean;
  mappedFeed: AddByRSSMappedFeed | null;
  people: AboutPerson[];
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

const buildAddByRssAbout = (
  feed: MobileAddByRSSFeedRecord,
  mappedFeed: AddByRSSMappedFeed | null
): ChannelAboutSource & { id: string } => ({
  channel_about: {
    website_link_url: mappedFeed?.channel.about?.website_link_url ?? null,
  },
  channel_description: mappedFeed?.channel.description ?? null,
  feed: { url: feed.feedUrl },
  id: feed.idText,
});

const buildAddByRssFundings = (mappedFeed: AddByRSSMappedFeed | null): AboutFundingLink[] => {
  const fundings: AboutFundingLink[] = [];
  for (const funding of mappedFeed?.channel.funding ?? []) {
    if (typeof funding.url !== 'string' || funding.url.length === 0) {
      continue;
    }
    fundings.push({
      id: fundings.length + 1,
      title: funding.title ?? null,
      url: funding.url,
    });
  }
  return fundings;
};

type AddByRssParsedPerson = {
  href: string | null;
  img: string | null;
  name: string;
  role: string | null;
};

/** Parsed feed or item people as About people, numbered from 1, empty names dropped. */
export const toAddByRssAboutPeople = (people: readonly AddByRssParsedPerson[]): AboutPerson[] => {
  const aboutPeople: AboutPerson[] = [];
  for (const person of people) {
    if (person.name.length === 0) {
      continue;
    }
    aboutPeople.push({
      href: person.href ?? null,
      id: aboutPeople.length + 1,
      img: person.img ?? null,
      name: person.name,
      personIdText: null,
      role: person.role ?? null,
    });
  }
  return aboutPeople;
};

/** Add by RSS page header artwork: a list-size image, and the largest one for the viewer. */
export const addByRssFeedHeaderArtwork = (
  feed: MobileAddByRSSFeedRecord,
  mappedFeed: AddByRSSMappedFeed | null
): { listUrl: string | null; viewerUrl: string | null } => {
  const listUrl =
    addByRSSFeedListArtworkCandidates({
      channelImages: mappedFeed?.channel.images,
      comparison: 'lesser',
      feedImageUrl: feed.imageUrl,
      sizeFindTarget: ARTWORK_LIST_SIZE_FIND_TARGET,
    })[0] ?? null;

  return {
    listUrl,
    viewerUrl: primaryChannelLightboxArtworkUrl(mappedFeed?.channel.images) ?? listUrl,
  };
};

export const buildAddByRssHomeDetailData = (
  feed: MobileAddByRSSFeedRecord,
  mappedFeed: AddByRSSMappedFeed | null,
  options?: { hasParsedBundle?: boolean }
): AddByRssHomeDetailData => {
  const hasParsedBundle = options?.hasParsedBundle ?? mappedFeed !== null;
  const channelTitle = mappedFeed?.channel.channel.title ?? feed.title ?? feed.feedUrl;
  const channelImageUrl =
    mappedFeed === null
      ? null
      : (addByRSSFeedListArtworkCandidates({
          channelImages: mappedFeed.channel.images,
          comparison: 'lesser',
          feedImageUrl: feed.imageUrl,
          sizeFindTarget: ARTWORK_LIST_SIZE_FIND_TARGET,
        })[0] ?? null);

  const episodeRows: AddByRssHomeEpisode[] =
    mappedFeed === null
      ? []
      : mappedFeed.items.map((itemBundle, itemIndex) => {
          const itemKey = itemBundle.item.guid ?? String(itemIndex);
          const title = itemBundle.item.title ?? itemKey;
          const imageUrl =
            primaryListArtworkUrl(itemBundle.images, mappedFeed.channel.images) ?? channelImageUrl;
          const plainDescription = htmlToPlainTextPreview(itemBundle.description?.value);
          const duration = itemBundle.about?.duration?.trim() ?? '';
          const playbackMediaId = addByRssPlaybackMediaId(
            toAddByRssItemPlaybackResourceData(feed, mappedFeed, itemBundle, itemIndex)
          );

          return {
            description: plainDescription.length > 0 ? plainDescription : null,
            downloadItem: addByRssDownloadItem(feed.feedUrl, itemBundle, itemIndex),
            downloadItemIdText: addByRssDownloadItemIdText(
              feed.feedUrl,
              itemBundle.item,
              itemIndex
            ),
            duration: duration.length > 0 ? duration : null,
            id: `${feed.idText}-${itemKey}`,
            imageUrl,
            itemBundle,
            itemIndex,
            itemKey,
            playbackMediaId,
            subtitle: channelTitle,
            title,
            updatedAt: pubDateMs(itemBundle.item.pub_date),
          };
        });

  return {
    about: buildAddByRssAbout(feed, mappedFeed),
    episodeRows,
    feed,
    fundings: buildAddByRssFundings(mappedFeed),
    hasParsedBundle,
    mappedFeed,
    people: toAddByRssAboutPeople(mappedFeed?.channel.people ?? []),
  };
};

/**
 * Orders add-by-RSS items on the device.
 *
 * `alphabetical` is title order for the library. `recent` and `oldest` use publication time,
 * with a missing date after every dated row and title as the tie break. `forward` and
 * `backward` follow the feed's item order.
 */
export const sortAddByRssHomeEpisodes = <T extends AddByRssHomeEpisode>(
  rows: readonly T[],
  sort: AddByRssEpisodeSort | AddByRssTrackSort | AddByRssLibrarySortOption
): T[] => {
  const copy = [...rows];
  if (sort === 'alphabetical') {
    return copy.sort((a, b) =>
      articleStrippedTitle(a.title).localeCompare(articleStrippedTitle(b.title))
    );
  }
  if (sort === 'forward' || sort === 'backward') {
    return copy.sort((a, b) =>
      sort === 'forward' ? a.itemIndex - b.itemIndex : b.itemIndex - a.itemIndex
    );
  }

  return copy.sort((a, b) => {
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
    return sort === 'oldest' ? aDateMs - bDateMs : bDateMs - aDateMs;
  });
};
