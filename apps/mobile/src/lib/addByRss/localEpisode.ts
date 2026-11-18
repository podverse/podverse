/**
 * Item bundles for Add by RSS episodes that exist only on this phone.
 *
 * A local episode is backed by a complete download and is not an item in the stored feed bundle.
 * The bundle is the same compat item shape a parsed episode uses, so list, play, and download
 * share that path.
 */
import {
  DATABASE_CONSTANTS,
  DEFAULT_DESCRIPTION_LENGTH_TIER,
  formatGuidEnclosureUrl,
} from '@podverse/helpers';
import type { AddByRSSMappedFeed, Episode } from '@podverse/parser-mapping';
import {
  compatItemAboutDto,
  compatItemChaptersFeedDto,
  compatItemChatDto,
  compatItemDescriptionDto,
  compatItemLicenseDto,
  compatItemLocationDto,
  compatItemPersonDtos,
  compatItemSeasonDto,
  compatItemSeasonEpisodeDto,
  compatItemSocialInteractDtos,
  compatItemSoundbiteDtos,
  compatItemTranscriptDtos,
  compatItemTxtDtos,
  compatItemValueDtos,
  convertParsedRSSFeedToCompat,
} from '@podverse/parser-mapping';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import { addByRssDownloadItemIdText } from './downloadIdText';

export type AddByRssCarriedEpisode = {
  description: string | null;
  durationSeconds: number | null;
  guid: string | null;
  imageUrl: string | null;
  mediaUrl: string;
  mimeType: string | null;
  pubDate: string | null;
  title: string | null;
};

type LocalItemBundle = AddByRSSMappedFeed['items'][number];
type LocalItemEnclosure = LocalItemBundle['enclosures'][number];

export type AddByRssDownloadAdoptionPlan =
  | {
      downloadIdText: string;
      itemBundle: LocalItemBundle;
      itemIndex: number;
      kind: 'feed_episode';
    }
  | { downloadIdText: string; itemBundle: LocalItemBundle; kind: 'local_episode' }
  | { downloadIdText: string; kind: 'already_downloaded' };

export type AddByRssLocalEpisodeAbsorbAction =
  | { downloadIdText: string; kind: 'drop_local_row' }
  | {
      fromDownloadIdText: string;
      itemBundle: LocalItemBundle;
      itemIndex: number;
      kind: 'move_download';
      toDownloadIdText: string;
    }
  | { downloadIdText: string; kind: 'drop_duplicate' };

const slicedOrNull = (value: string | null, max: number): string | null => {
  if (value === null) {
    return null;
  }
  const sliced = value.slice(0, max);
  return sliced.length === 0 ? null : sliced;
};

const nonBlank = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const slicedMime = (mime: string | null): string | null => {
  const trimmed = nonBlank(mime);
  return trimmed === null ? null : trimmed.slice(0, DATABASE_CONSTANTS.varchar_short);
};

const pubDateFromIso = (value: string | null): Date | null => {
  const trimmed = nonBlank(value);
  if (trimmed === null) {
    return null;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const textKey = (value: string | null | undefined): string | null => nonBlank(value);

const enclosureKey = (value: string | null | undefined): string | null => {
  const text = textKey(value);
  return text === null ? null : formatGuidEnclosureUrl(text);
};

const enclosureForLocalEpisode = (uri: string, mime: string | null): LocalItemEnclosure => {
  const itemEnclosure = {
    bitrate: null,
    codecs: null,
    height: null,
    item_enclosure_default: true,
    language: null,
    length: null,
    rel: null,
    title: null,
  };
  if (mime === null) {
    return {
      item_enclosure: { ...itemEnclosure, type: '' },
      item_enclosure_integrity: null,
      item_enclosure_sources: [{ content_type: null, uri }],
    };
  }
  return {
    item_enclosure: { ...itemEnclosure, type: mime },
    item_enclosure_integrity: null,
    item_enclosure_sources: [{ content_type: mime, uri }],
  };
};

const parsedEpisodeForLists = (episode: AddByRssCarriedEpisode, pubDate: Date | null): Episode => ({
  duration: episode.durationSeconds ?? 0,
  enclosure: {
    length: 0,
    type: nonBlank(episode.mimeType) ?? 'application/octet-stream',
    url: episode.mediaUrl.trim() || 'https://example.invalid/episode',
  },
  explicit: false,
  guid: episode.guid ?? '',
  ...(episode.description !== null ? { description: episode.description } : {}),
  ...(episode.imageUrl !== null ? { itunesImage: episode.imageUrl } : {}),
  ...(pubDate !== null ? { pubDate } : {}),
  ...(episode.title !== null ? { title: episode.title } : {}),
});

/** One compat item whose enclosure is the carried file's media URL. */
export const buildAddByRssLocalItemBundle = (episode: AddByRssCarriedEpisode): LocalItemBundle => {
  const pubDate = pubDateFromIso(episode.pubDate);
  const parsedItem = parsedEpisodeForLists(episode, pubDate);
  const mime = slicedMime(episode.mimeType);
  const imageUrl = nonBlank(episode.imageUrl);
  const images: LocalItemBundle['images'] =
    imageUrl === null
      ? []
      : [{ image_width_size: null, url: imageUrl.slice(0, DATABASE_CONSTANTS.varchar_url) }];

  return {
    about: {
      ...compatItemAboutDto(parsedItem),
      duration:
        episode.durationSeconds === null
          ? null
          : DATABASE_CONSTANTS.mediaPlayerTimeOrNull(episode.durationSeconds),
    },
    chaptersFeed: compatItemChaptersFeedDto(parsedItem),
    chat: compatItemChatDto(parsedItem),
    description: compatItemDescriptionDto(parsedItem, DEFAULT_DESCRIPTION_LENGTH_TIER),
    enclosures: [
      enclosureForLocalEpisode(episode.mediaUrl.slice(0, DATABASE_CONSTANTS.varchar_uri), mime),
    ],
    images,
    item: {
      guid: slicedOrNull(episode.guid, DATABASE_CONSTANTS.varchar_url),
      guid_enclosure_url: formatGuidEnclosureUrl(episode.mediaUrl),
      pub_date: pubDate,
      title: slicedOrNull(episode.title, DATABASE_CONSTANTS.varchar_normal),
    },
    license: compatItemLicenseDto(parsedItem),
    location: compatItemLocationDto(parsedItem),
    people: compatItemPersonDtos(parsedItem),
    season: compatItemSeasonDto(parsedItem),
    seasonEpisode: compatItemSeasonEpisodeDto(parsedItem),
    socialInteract: compatItemSocialInteractDtos(parsedItem),
    soundbites: compatItemSoundbiteDtos(parsedItem),
    transcripts: compatItemTranscriptDtos(parsedItem),
    txt: compatItemTxtDtos(parsedItem),
    value: compatItemValueDtos(parsedItem),
  };
};

/**
 * A mapped feed with no parsed items. Title and image come from the feed row, for a stub whose
 * host has not returned a bundle.
 */
export const buildAddByRssLocalOnlyMappedFeed = (
  feed: MobileAddByRSSFeedRecord
): AddByRSSMappedFeed => {
  const imageUrl = nonBlank(feed.imageUrl);
  const images: AddByRSSMappedFeed['channel']['images'] =
    imageUrl === null
      ? []
      : [{ image_width_size: null, url: imageUrl.slice(0, DATABASE_CONSTANTS.varchar_url) }];
  const shell = convertParsedRSSFeedToCompat({
    explicit: false,
    items: [],
    link: feed.feedUrl,
    title: feed.title ?? '',
    ...(imageUrl !== null ? { itunesImage: imageUrl } : {}),
  });
  const items: AddByRSSMappedFeed['items'] = [];
  const liveItems: AddByRSSMappedFeed['liveItems'] = [];
  return {
    ...shell,
    channel: {
      ...shell.channel,
      images,
    },
    items,
    liveItems,
  };
};

const localDownloadId = (feedUrl: string, item: LocalItemBundle, index: number): string =>
  addByRssDownloadItemIdText(feedUrl, item.item, index);

/**
 * Stored items first, then local items whose download id is not already in the stored list.
 * Null when there is neither a stored bundle nor a local item.
 */
export const mergeAddByRssLocalEpisodes = (params: {
  feed: MobileAddByRSSFeedRecord;
  localItems: readonly LocalItemBundle[];
  stored: AddByRSSMappedFeed | null;
}): AddByRSSMappedFeed | null => {
  if (params.stored === null && params.localItems.length === 0) {
    return null;
  }
  const base = params.stored ?? buildAddByRssLocalOnlyMappedFeed(params.feed);
  const storedIds = new Set(
    base.items.map((item, index) => localDownloadId(params.feed.feedUrl, item, index))
  );
  const appended = params.localItems.filter(
    (item) => !storedIds.has(localDownloadId(params.feed.feedUrl, item, base.items.length))
  );
  return {
    ...base,
    items: [...base.items, ...appended],
  };
};

/**
 * Index of the stored item that is the same episode, or null.
 * A shared guid wins over a shared enclosure URL.
 */
export const findParsedItemForLocalEpisode = (
  items: readonly LocalItemBundle[],
  localItem: LocalItemBundle
): number | null => {
  const guid = textKey(localItem.item.guid);
  if (guid !== null) {
    const guidIndex = items.findIndex((item) => textKey(item.item.guid) === guid);
    if (guidIndex >= 0) {
      return guidIndex;
    }
  }
  const enclosure = enclosureKey(localItem.item.guid_enclosure_url);
  if (enclosure === null) {
    return null;
  }
  const enclosureIndex = items.findIndex(
    (item) => enclosureKey(item.item.guid_enclosure_url) === enclosure
  );
  return enclosureIndex >= 0 ? enclosureIndex : null;
};

/** A stored item wins over a new local episode. An id that already has a download is left alone. */
export const planAddByRssDownloadAdoption = (params: {
  episode: AddByRssCarriedEpisode;
  existingDownloadIds: ReadonlySet<string>;
  feedUrl: string;
  stored: AddByRSSMappedFeed | null;
}): AddByRssDownloadAdoptionPlan => {
  const localBundle = buildAddByRssLocalItemBundle(params.episode);
  const storedItems = params.stored?.items ?? [];
  const matchedIndex = findParsedItemForLocalEpisode(storedItems, localBundle);
  const storedItem = matchedIndex === null ? undefined : storedItems[matchedIndex];
  if (storedItem !== undefined && matchedIndex !== null) {
    const downloadIdText = localDownloadId(params.feedUrl, storedItem, matchedIndex);
    if (params.existingDownloadIds.has(downloadIdText)) {
      return { downloadIdText, kind: 'already_downloaded' };
    }
    return {
      downloadIdText,
      itemBundle: storedItem,
      itemIndex: matchedIndex,
      kind: 'feed_episode',
    };
  }
  const downloadIdText = localDownloadId(params.feedUrl, localBundle, storedItems.length);
  if (params.existingDownloadIds.has(downloadIdText)) {
    return { downloadIdText, kind: 'already_downloaded' };
  }
  return { downloadIdText, itemBundle: localBundle, kind: 'local_episode' };
};

/**
 * What to do with local episodes the bundle lists.
 * An episode the bundle does not list is left out, so the file stays.
 */
export const planLocalEpisodeAbsorb = (params: {
  existingDownloadIds: ReadonlySet<string>;
  feedUrl: string;
  items: readonly LocalItemBundle[];
  local: readonly { downloadIdText: string; itemBundle: LocalItemBundle }[];
}): AddByRssLocalEpisodeAbsorbAction[] => {
  const claimed = new Set<string>();
  const actions: AddByRssLocalEpisodeAbsorbAction[] = [];
  for (const entry of params.local) {
    const matchedIndex = findParsedItemForLocalEpisode(params.items, entry.itemBundle);
    const storedItem = matchedIndex === null ? undefined : params.items[matchedIndex];
    if (storedItem === undefined || matchedIndex === null) {
      continue;
    }
    const toDownloadIdText = localDownloadId(params.feedUrl, storedItem, matchedIndex);
    if (toDownloadIdText === entry.downloadIdText) {
      actions.push({ downloadIdText: entry.downloadIdText, kind: 'drop_local_row' });
      continue;
    }
    if (params.existingDownloadIds.has(toDownloadIdText) || claimed.has(toDownloadIdText)) {
      actions.push({ downloadIdText: entry.downloadIdText, kind: 'drop_duplicate' });
      continue;
    }
    claimed.add(toDownloadIdText);
    actions.push({
      fromDownloadIdText: entry.downloadIdText,
      itemBundle: storedItem,
      itemIndex: matchedIndex,
      kind: 'move_download',
      toDownloadIdText,
    });
  }
  return actions;
};

const hasStableDownloadIdentity = (item: LocalItemBundle['item']): boolean => {
  const guid = item.guid;
  const enclosureUrl = item.guid_enclosure_url;
  const guidIsSet = guid !== null && guid !== undefined;
  const enclosureIsSet = enclosureUrl !== null && enclosureUrl !== undefined;
  return guidIsSet || enclosureIsSet;
};

/**
 * Previous episodes a finished download still names, which the next bundle no longer lists.
 *
 * The previous item bundle is returned unchanged, so the download id stays the same. An id that
 * is only the list index is omitted, because that id changes when the list shifts. An episode
 * that is already a local episode is omitted.
 */
export const planKeptLocalEpisodes = (params: {
  completeDownloadIds: ReadonlySet<string>;
  existingLocalIds: ReadonlySet<string>;
  feedUrl: string;
  next: AddByRSSMappedFeed;
  previous: AddByRSSMappedFeed;
}): { downloadIdText: string; itemBundle: LocalItemBundle }[] => {
  const nextIds = new Set(
    params.next.items.map((itemBundle, index) => localDownloadId(params.feedUrl, itemBundle, index))
  );
  const kept: { downloadIdText: string; itemBundle: LocalItemBundle }[] = [];
  for (const [index, itemBundle] of params.previous.items.entries()) {
    const downloadIdText = localDownloadId(params.feedUrl, itemBundle, index);
    if (!params.completeDownloadIds.has(downloadIdText)) {
      continue;
    }
    if (nextIds.has(downloadIdText)) {
      continue;
    }
    if (params.existingLocalIds.has(downloadIdText)) {
      continue;
    }
    if (!hasStableDownloadIdentity(itemBundle.item)) {
      continue;
    }
    kept.push({ downloadIdText, itemBundle });
  }
  return kept;
};
