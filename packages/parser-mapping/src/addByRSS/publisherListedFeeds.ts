/**
 * Pure planning for the feeds a publisher feed lists. No network or database.
 * Callers decide whether the publisher feed's resource type lists feeds.
 */

import type { AddByRSSPublisherListedFeed } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation';

import { compatChannelRemoteItemDtos } from '../compat/partytime/channel.js';
import type { FeedObject } from '../types/partytime.js';
import type { AddByRSSMappedFeed } from './types.js';

/** Distinct feeds kept from one publisher feed, in feed order. The rest are dropped. */
export const ADD_BY_RSS_PUBLISHER_LISTED_FEEDS_MAX = 100;

const PUBLISHER_MEDIUM_IDS = new Set<number>([
  MediumEnum.Publisher,
  MediumEnum.PublisherL,
  MediumEnum.PublisherPodcast,
  MediumEnum.PublisherMusic,
  MediumEnum.PublisherVideo,
  MediumEnum.PublisherFilm,
  MediumEnum.PublisherAudiobook,
  MediumEnum.PublisherNewsletter,
  MediumEnum.PublisherBlog,
  MediumEnum.PublisherCourse,
  MediumEnum.PublisherAV,
]);

export type AddByRSSPublisherListedFeedRef = {
  feedGuid: string;
  feedUrl: string | null;
  title: string | null;
  listedAtChannelLevel: boolean;
  itemGuids: string[];
};

export type CollectAddByRSSPublisherListedFeedRefsResult = {
  refs: AddByRSSPublisherListedFeedRef[];
  /** Distinct feeds left out because the list reached the cap. */
  droppedCount: number;
};

type ListedFeedGroup = {
  feedGuid: string;
  channelLevelFeedUrl: string | null;
  anyFeedUrl: string | null;
  channelLevelTitle: string | null;
  anyTitle: string | null;
  listedAtChannelLevel: boolean;
  itemGuids: string[];
};

const trimmedOrNull = (value: string | null): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

type ChannelRemoteItemDto = ReturnType<typeof compatChannelRemoteItemDtos>[number];

const collectListedFeedRefs = (
  ownGuidRaw: string | null | undefined,
  remoteItems: readonly ChannelRemoteItemDto[],
  publisherFeedUrl: string
): CollectAddByRSSPublisherListedFeedRefsResult => {
  const ownGuid = ownGuidRaw?.trim().toLowerCase();
  const ownUrl = canonicalAddByRSSFeedUrl(publisherFeedUrl);
  const groups = new Map<string, ListedFeedGroup>();

  for (const dto of remoteItems) {
    const guid = dto.feed_guid.trim();
    if (guid === '') {
      continue;
    }
    if (dto.medium_id !== null && PUBLISHER_MEDIUM_IDS.has(dto.medium_id)) {
      continue;
    }

    const url = dto.feed_url === null ? null : canonicalAddByRSSFeedUrl(dto.feed_url);
    const matchesOwnGuid = ownGuid !== undefined && guid.toLowerCase() === ownGuid;
    const matchesOwnUrl = url !== null && url === ownUrl;
    if (matchesOwnGuid || matchesOwnUrl) {
      continue;
    }

    const itemGuid = dto.item_guid?.trim() ?? '';
    const title = trimmedOrNull(dto.title);
    const key = guid.toLowerCase();
    const existing = groups.get(key);
    const group: ListedFeedGroup = existing ?? {
      feedGuid: guid,
      channelLevelFeedUrl: null,
      anyFeedUrl: null,
      channelLevelTitle: null,
      anyTitle: null,
      listedAtChannelLevel: false,
      itemGuids: [],
    };
    if (existing === undefined) {
      groups.set(key, group);
    }

    if (itemGuid === '') {
      group.listedAtChannelLevel = true;
      if (url !== null && group.channelLevelFeedUrl === null) {
        group.channelLevelFeedUrl = url;
      }
      if (title !== null && group.channelLevelTitle === null) {
        group.channelLevelTitle = title;
      }
    } else if (!group.itemGuids.includes(itemGuid)) {
      group.itemGuids.push(itemGuid);
    }

    if (url !== null && group.anyFeedUrl === null) {
      group.anyFeedUrl = url;
    }
    if (title !== null && group.anyTitle === null) {
      group.anyTitle = title;
    }
  }

  const ordered = [...groups.values()];
  const kept = ordered.slice(0, ADD_BY_RSS_PUBLISHER_LISTED_FEEDS_MAX);
  return {
    refs: kept.map((group) => ({
      feedGuid: group.feedGuid,
      feedUrl: group.channelLevelFeedUrl ?? group.anyFeedUrl,
      title: group.channelLevelTitle ?? group.anyTitle,
      listedAtChannelLevel: group.listedAtChannelLevel,
      itemGuids: group.itemGuids,
    })),
    droppedCount: ordered.length - kept.length,
  };
};

/** Group a publisher feed's remote-item references into distinct listed feeds. */
export const collectAddByRSSPublisherListedFeedRefs = (
  parsedFeed: FeedObject,
  publisherFeedUrl: string
): CollectAddByRSSPublisherListedFeedRefsResult =>
  collectListedFeedRefs(parsedFeed.guid, compatChannelRemoteItemDtos(parsedFeed), publisherFeedUrl);

/**
 * The same refs from a mapped bundle, for a client that holds the bundle and not the parsed feed.
 * The bundle's `remoteItems` are the same DTOs the parsed-feed entry point reads.
 */
export const collectAddByRSSPublisherListedFeedRefsFromMappedFeed = (
  mappedFeed: AddByRSSMappedFeed,
  publisherFeedUrl: string
): CollectAddByRSSPublisherListedFeedRefsResult =>
  collectListedFeedRefs(
    mappedFeed.channel?.channel?.podcast_guid,
    mappedFeed.channel?.remoteItems ?? [],
    publisherFeedUrl
  );

export type AddByRSSDirectoryChannelMatch = {
  channelIdText: string;
  title: string | null;
  mediumId: number | null;
};

export type AddByRSSPublisherFeedToParse = {
  requestId: string;
  feedUrl: string;
  feedGuid: string;
};

export type PlanAddByRSSPublisherListedFeedsResult = {
  listedFeeds: AddByRSSPublisherListedFeed[];
  feedsToParse: AddByRSSPublisherFeedToParse[];
};

/** Resolve each ref to a directory link, a parse, or an unresolved reason. */
export const planAddByRSSPublisherListedFeeds = (input: {
  refs: readonly AddByRSSPublisherListedFeedRef[];
  /** Keyed by lowercased feed guid. */
  directoryByFeedGuid: ReadonlyMap<string, AddByRSSDirectoryChannelMatch>;
  /** Feed URLs found elsewhere (Podcast Index) for refs with none, keyed by lowercased guid. */
  lookedUpFeedUrlByFeedGuid: ReadonlyMap<string, string>;
  newRequestId: () => string;
}): PlanAddByRSSPublisherListedFeedsResult => {
  const listedFeeds: AddByRSSPublisherListedFeed[] = [];
  const feedsToParse: AddByRSSPublisherFeedToParse[] = [];
  const requestIdByFeedUrl = new Map<string, string>();

  for (const ref of input.refs) {
    const base = {
      feedGuid: ref.feedGuid,
      feedUrl: ref.feedUrl,
      title: ref.title,
      listedAtChannelLevel: ref.listedAtChannelLevel,
      itemGuids: ref.itemGuids,
    };

    const directoryMatch = input.directoryByFeedGuid.get(ref.feedGuid.toLowerCase());
    if (directoryMatch !== undefined) {
      listedFeeds.push({
        ...base,
        kind: 'directory',
        channelIdText: directoryMatch.channelIdText,
        channelTitle: directoryMatch.title,
        mediumId: directoryMatch.mediumId,
      });
      continue;
    }

    if (!ref.listedAtChannelLevel) {
      listedFeeds.push({ ...base, kind: 'unresolved', reason: 'item_references_only' });
      continue;
    }

    const lookedUpRaw = input.lookedUpFeedUrlByFeedGuid.get(ref.feedGuid.toLowerCase());
    const lookedUpUrl = lookedUpRaw === undefined ? null : canonicalAddByRSSFeedUrl(lookedUpRaw);
    const url = ref.feedUrl ?? lookedUpUrl;
    if (url === null) {
      listedFeeds.push({ ...base, kind: 'unresolved', reason: 'no_feed_url' });
      continue;
    }

    const existingRequestId = requestIdByFeedUrl.get(url);
    const requestId = existingRequestId ?? input.newRequestId();
    if (existingRequestId === undefined) {
      requestIdByFeedUrl.set(url, requestId);
      feedsToParse.push({ requestId, feedUrl: url, feedGuid: ref.feedGuid });
    }

    listedFeeds.push({ ...base, feedUrl: url, kind: 'add_by_rss', requestId });
  }

  return { listedFeeds, feedsToParse };
};
