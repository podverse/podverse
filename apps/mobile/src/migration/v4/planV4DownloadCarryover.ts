/**
 * What each staged file from the previous app can become, in order: a directory
 * episode, a kept episode on that same directory show, an Add by RSS episode, or
 * a delete. A delete always names a definite reason. A failed request or an
 * offline phone leaves the row for a later pass and leaves the file on disk. A
 * thrown read of the download lists never produces a row, so it never reaches
 * this module.
 *
 * `retry` bumps `attempts`, sets the row to `waiting`, and keeps the file.
 */
import type {
  DTOAddByRSSMatchFeed,
  DTOItem,
  DTOLegacyEpisodeLookupAnswer,
  DTOLegacyEpisodeLookupRef,
} from '@podverse/helpers/dto';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';

import type { SyncEventLogDetails } from '../../data/repositories/syncEventLog';
import type {
  V4DownloadCarryoverRow,
  V4DownloadCarryoverStatus,
} from '../../data/repositories/v4DownloadCarryoverRepository';
import type { DownloadSourceSelection } from '../../downloads/downloadEligibility';
import { buildDownloadFileName, hashEnclosureUri } from '../../downloads/downloadStorage';
import type { AddByRssMatchFeedInput } from '../../lib/addByRss/directoryMatch';
import type { AddByRssCarriedEpisode } from '../../lib/addByRss/localEpisode';
import { v5FileExtensionForV4 } from './v4DownloadNames';

/** A row's retryable failures before the pass gives up on it. */
export const V4_DOWNLOAD_CARRYOVER_MAX_ATTEMPTS = 5;

/** Matches the episode lookup's request validation. */
const LEGACY_ID_MAX_LENGTH = 14;
const LOOKUP_TEXT_MAX_LENGTH = 2048;

/** Why a carried file is deleted. Counted only; never logged per file. */
export type V4DownloadDeleteReason =
  | 'blocked'
  | 'gave_up'
  | 'no_identity'
  | 'no_media_url'
  | 'not_in_directory'
  | 'orphan'
  | 'partial';

export type V4DownloadDirectoryTarget = {
  itemIdText: string;
  channelIdText: string;
  channelTitle: string | null;
  /** Used only when the fetched item carries no artwork. */
  fallbackArtworkUrl: string | null;
};

/**
 * The show is a directory channel and this episode is not a directory item.
 * The caller stores `item` on that show and records a complete download for
 * `item.id_text`. This does not follow an Add by RSS feed.
 */
export type V4DownloadDirectoryKept = {
  channelIdText: string;
  channelTitle: string | null;
  fallbackArtworkUrl: string | null;
  /** Always set, so a missing media URL cannot come back as an ineligible delete. */
  fallbackSource: DownloadSourceSelection;
  item: DTOItem;
};

export type V4DownloadDecision =
  | { kind: 'delete'; reason: V4DownloadDeleteReason }
  | { kind: 'directory'; target: V4DownloadDirectoryTarget }
  | { kind: 'directory_kept'; kept: V4DownloadDirectoryKept }
  | {
      episode: AddByRssCarriedEpisode;
      feedTitle: string | null;
      feedUrl: string;
      kind: 'add_by_rss';
    }
  | { kind: 'lookup'; ref: DTOLegacyEpisodeLookupRef }
  | { kind: 'match'; feedUrl: string }
  | { kind: 'retry' };

export type V4DownloadFailure = 'adopt_failed' | 'delete_failed' | 'no_feed' | 'unreachable';

export type V4DownloadFailureOutcome =
  | { kind: 'retry' }
  | { kind: 'delete'; reason: 'gave_up' }
  | { kind: 'final'; status: 'delete_failed' | 'unreachable' };

/** Statuses a pass moves a row to and never revisits. */
export const V4_DOWNLOAD_SETTLED_STATUSES: readonly V4DownloadCarryoverStatus[] = [
  'directory',
  'add_by_rss',
  'duplicate',
  'deleted',
  'missing',
  'unreachable',
  'delete_failed',
];

const isLastAttempt = (row: V4DownloadCarryoverRow): boolean =>
  row.attempts + 1 >= V4_DOWNLOAD_CARRYOVER_MAX_ATTEMPTS;

const trimmedOrNull = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const legacyIdOrNull = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > LEGACY_ID_MAX_LENGTH) {
    return null;
  }
  return trimmed;
};

const lookupTextOrNull = (value: string | null): string | null => {
  if (value === null || value.length > LOOKUP_TEXT_MAX_LENGTH) {
    return null;
  }
  return value;
};

const isoFromPubDateMs = (pubDateMs: number | null): string | null => {
  if (pubDateMs === null) {
    return null;
  }
  return new Date(pubDateMs).toISOString();
};

const mediaTypeForMime = (mime: string | null): DownloadSourceSelection['mediaType'] => {
  if (mime !== null && mime.toLowerCase().startsWith('video/')) {
    return 'video';
  }
  return 'audio';
};

const canonicalFeedUrl = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  return canonicalAddByRSSFeedUrl(value);
};

const hasUsableFeedUrl = (value: string | null): boolean => canonicalFeedUrl(value) !== null;

const deleteDecision = (reason: V4DownloadDeleteReason): V4DownloadDecision => ({
  kind: 'delete',
  reason,
});

const retryDecision = (): V4DownloadDecision => ({ kind: 'retry' });

const directoryDecision = (
  itemIdText: string,
  channelIdText: string,
  channelTitle: string | null,
  fallbackArtworkUrl: string | null
): V4DownloadDecision => ({
  kind: 'directory',
  target: {
    channelIdText,
    channelTitle,
    fallbackArtworkUrl,
    itemIdText,
  },
});

export const carriedEpisodeFromV4Row = (
  row: V4DownloadCarryoverRow
): AddByRssCarriedEpisode | null => {
  if (row.mediaUrl === null) {
    return null;
  }
  return {
    description: null,
    durationSeconds: row.episodeDurationSeconds,
    guid: row.episodeGuid,
    imageUrl: row.episodeImageUrl ?? row.podcastImageUrl,
    mediaUrl: row.mediaUrl,
    mimeType: row.episodeMediaType,
    pubDate: isoFromPubDateMs(row.episodePubDateMs),
    title: row.episodeTitle,
  };
};

export const v4EpisodeLookupRef = (
  row: V4DownloadCarryoverRow
): DTOLegacyEpisodeLookupRef | null => {
  if (row.isAddByRss) {
    return null;
  }
  const episodeId = legacyIdOrNull(row.legacyEpisodeId);
  const podcastId = legacyIdOrNull(row.legacyPodcastId);
  if (episodeId === null || podcastId === null) {
    return null;
  }
  return {
    episode_id: episodeId,
    guid: lookupTextOrNull(row.episodeGuid),
    media_url: lookupTextOrNull(row.mediaUrl),
    podcast_id: podcastId,
  };
};

const adoptedStem = (fileKey: string, legacyExtension: string): string => {
  const withoutExtension =
    legacyExtension.length > 0 && fileKey.endsWith(legacyExtension)
      ? fileKey.slice(0, fileKey.length - legacyExtension.length)
      : fileKey;
  return withoutExtension.slice(0, 100);
};

export const v4AdoptedFileExtension = (row: V4DownloadCarryoverRow): string | null =>
  v5FileExtensionForV4(row.legacyExtension);

/**
 * On-disk name for a carried file. The `v4-` prefix and a hash of the whole key
 * keep it apart from a name this app writes for the same episode, so adoption
 * and a listener's own download do not share one file. The stem is the episode
 * id (the key without its legacy extension), cut to 100 characters.
 */
export const v4AdoptedFileName = (
  row: { fileKey: string; legacyExtension: string },
  fileExtension: string | null
): string =>
  buildDownloadFileName(
    `v4-${adoptedStem(row.fileKey, row.legacyExtension)}-${hashEnclosureUri(row.fileKey)}`,
    fileExtension
  );

export const v4DownloadFallbackSource = (
  row: V4DownloadCarryoverRow,
  fileExtension: string | null
): DownloadSourceSelection | null => {
  if (row.mediaUrl === null) {
    return null;
  }
  return {
    fileExtension,
    mediaType: mediaTypeForMime(row.episodeMediaType),
    mime: row.episodeMediaType,
    uri: row.mediaUrl,
  };
};

/**
 * Id for a kept episode. Longer than a server id, and stable for one file key,
 * so a stored row cannot be loaded as a different directory item.
 */
export const v4KeptItemIdText = (fileKey: string): string => {
  const stem = fileKey.replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
  return `v4-download-${stem}${hashEnclosureUri(fileKey)}`;
};

export const v4KeptDirectoryItem = (row: V4DownloadCarryoverRow, itemIdText: string): DTOItem => {
  const imageUrl = row.episodeImageUrl ?? row.podcastImageUrl;
  const itemImages: DTOItem['item_images'] =
    imageUrl === null
      ? []
      : [{ id: 0, image_width_size: null, is_resized: false, item_id: 0, url: imageUrl }];
  const itemEnclosures: DTOItem['item_enclosures'] =
    row.mediaUrl === null
      ? []
      : [
          {
            id: 0,
            item_enclosure_default: true,
            item_enclosure_integrity: null,
            item_enclosure_sources: [{ id: 0, item_enclosure_id: 0, uri: row.mediaUrl }],
            item_id: 0,
            type: row.episodeMediaType ?? 'audio/mpeg',
          },
        ];

  return {
    channel_id: 0,
    guid: row.episodeGuid,
    guid_enclosure_url: row.mediaUrl,
    id: 0,
    id_text: itemIdText,
    item_about: {
      duration: row.episodeDurationSeconds === null ? null : String(row.episodeDurationSeconds),
      id: 0,
      item_id: 0,
    },
    item_chat: { id: 0, item_id: 0, server: '' },
    item_content_links: [],
    item_enclosures: itemEnclosures,
    item_flag_status_id: 0,
    item_fundings: [],
    item_images: itemImages,
    item_license: { id: 0, identifier: '', item_id: 0, url: null },
    item_location: { id: 0, item_id: 0, name: null },
    item_persons: [],
    item_season: { channel_season_id: 0, id: 0, item_id: 0, title: null },
    item_social_interacts: [],
    item_soundbites: [],
    item_transcripts: [],
    item_txts: [],
    item_values: [],
    live_item: null,
    pub_date: isoFromPubDateMs(row.episodePubDateMs),
    title: row.episodeTitle,
  };
};

export const v4KeptFallbackSource = (
  row: V4DownloadCarryoverRow,
  itemIdText: string
): DownloadSourceSelection => {
  const fileExtension = v4AdoptedFileExtension(row);
  const fromMedia = v4DownloadFallbackSource(row, fileExtension);
  if (fromMedia !== null) {
    return fromMedia;
  }
  return {
    fileExtension,
    mediaType: mediaTypeForMime(row.episodeMediaType),
    mime: row.episodeMediaType,
    uri: `file://${itemIdText}`,
  };
};

const addByRssDecision = (
  row: V4DownloadCarryoverRow,
  feedUrl: string | null
): V4DownloadDecision => {
  const canonical = canonicalFeedUrl(feedUrl);
  if (canonical === null) {
    return deleteDecision('no_identity');
  }
  const episode = carriedEpisodeFromV4Row(row);
  if (episode === null) {
    return deleteDecision('no_media_url');
  }
  return {
    episode,
    feedTitle: trimmedOrNull(row.podcastTitle),
    feedUrl: canonical,
    kind: 'add_by_rss',
  };
};

const keptOnDirectoryShow = (
  row: V4DownloadCarryoverRow,
  channelIdText: string,
  channelTitle: string | null,
  fallbackArtworkUrl: string | null
): V4DownloadDecision => {
  const trimmedChannelId = channelIdText.trim();
  if (trimmedChannelId.length === 0) {
    return deleteDecision('no_identity');
  }
  const itemIdText = v4KeptItemIdText(row.fileKey);
  return {
    kept: {
      channelIdText: trimmedChannelId,
      channelTitle: trimmedOrNull(channelTitle),
      fallbackArtworkUrl,
      fallbackSource: v4KeptFallbackSource(row, itemIdText),
      item: v4KeptDirectoryItem(row, itemIdText),
    },
    kind: 'directory_kept',
  };
};

const afterUnansweredLookup = (row: V4DownloadCarryoverRow): V4DownloadDecision => {
  if (isLastAttempt(row) && hasUsableFeedUrl(row.podcastFeedUrl)) {
    return addByRssDecision(row, row.podcastFeedUrl);
  }
  return retryDecision();
};

/**
 * Decide a staged file before any request.
 *
 * An orphan row is a file in the app's own folders that a finished download-list
 * read did not name. A thrown read stages no row. An unfinished transfer is
 * deleted: nothing stored says how large the file should be, and it is not resumed.
 */
export const decideV4DownloadBeforeNetwork = (row: V4DownloadCarryoverRow): V4DownloadDecision => {
  if (row.source === 'orphan') {
    return deleteDecision('orphan');
  }
  if (row.source === 'downloading') {
    return deleteDecision('partial');
  }
  if (row.isAddByRss) {
    const feedUrl = canonicalFeedUrl(row.addByRssFeedUrl);
    if (feedUrl === null) {
      return deleteDecision('no_identity');
    }
    return { feedUrl, kind: 'match' };
  }
  const ref = v4EpisodeLookupRef(row);
  if (ref !== null) {
    return { kind: 'lookup', ref };
  }
  return addByRssDecision(row, row.podcastFeedUrl);
};

export const decideV4DownloadAfterLookup = (
  row: V4DownloadCarryoverRow,
  answer: DTOLegacyEpisodeLookupAnswer | undefined
): V4DownloadDecision => {
  if (answer === undefined) {
    return afterUnansweredLookup(row);
  }

  switch (answer.kind) {
    case 'item': {
      const itemIdText = answer.item_id_text.trim();
      const channelIdText = answer.channel.id_text.trim();
      if (itemIdText.length === 0 || channelIdText.length === 0) {
        return afterUnansweredLookup(row);
      }
      return directoryDecision(
        itemIdText,
        channelIdText,
        trimmedOrNull(answer.channel.title),
        answer.channel.image_url ?? row.episodeImageUrl ?? row.podcastImageUrl
      );
    }
    case 'channel':
      return keptOnDirectoryShow(
        row,
        answer.channel.id_text,
        answer.channel.title,
        answer.channel.image_url ?? row.episodeImageUrl ?? row.podcastImageUrl
      );
    case 'feed_url':
      return addByRssDecision(
        row,
        hasUsableFeedUrl(answer.feed_url) ? answer.feed_url : row.podcastFeedUrl
      );
    case 'blocked':
      // A dropped show does not become an Add by RSS feed.
      return deleteDecision('blocked');
    case 'not_here':
      if (hasUsableFeedUrl(row.podcastFeedUrl)) {
        return addByRssDecision(row, row.podcastFeedUrl);
      }
      if (isLastAttempt(row)) {
        return deleteDecision('not_in_directory');
      }
      return retryDecision();
    default: {
      const unreachable: never = answer;
      return unreachable;
    }
  }
};

export const planV4AddByRssMatch = (
  rows: readonly V4DownloadCarryoverRow[]
): {
  feeds: AddByRssMatchFeedInput[];
  /** fileKey → the feed asked and the row's item position inside it. */
  positions: ReadonlyMap<string, { feedUrl: string; itemIndex: number }>;
} => {
  const feeds: AddByRssMatchFeedInput[] = [];
  const positions = new Map<string, { feedUrl: string; itemIndex: number }>();
  const indexByUrl = new Map<string, number>();

  for (const row of rows) {
    const feedUrl = canonicalFeedUrl(row.addByRssFeedUrl);
    if (feedUrl === null) {
      continue;
    }
    let feedIndex = indexByUrl.get(feedUrl);
    if (feedIndex === undefined) {
      feedIndex = feeds.length;
      indexByUrl.set(feedUrl, feedIndex);
      feeds.push({
        feedUrl,
        items: [],
        podcastGuid: null,
      });
    }
    const feed = feeds[feedIndex];
    if (feed === undefined) {
      continue;
    }
    if (feed.podcastGuid === null && row.podcastGuid !== null) {
      feed.podcastGuid = row.podcastGuid;
    }
    const itemIndex = feed.items.length;
    feed.items.push({ enclosureUrl: row.mediaUrl, guid: row.episodeGuid });
    positions.set(row.fileKey, { feedUrl, itemIndex });
  }

  return { feeds, positions };
};

const matchedItemId = (match: DTOAddByRSSMatchFeed, itemIndex: number): string => {
  const item = match.items[itemIndex];
  if (item === undefined || item.item_id_text === null) {
    return '';
  }
  return item.item_id_text.trim();
};

export const decideV4DownloadAfterMatch = (
  row: V4DownloadCarryoverRow,
  result:
    { kind: 'failed' } | { itemIndex: number; kind: 'answered'; match: DTOAddByRSSMatchFeed | null }
): V4DownloadDecision => {
  if (result.kind === 'failed') {
    return isLastAttempt(row) ? addByRssDecision(row, row.addByRssFeedUrl) : retryDecision();
  }

  const match = result.match;
  if (match !== null && match.channel !== null) {
    const itemIdText = matchedItemId(match, result.itemIndex);
    const artworkUrl = row.episodeImageUrl ?? row.podcastImageUrl;
    if (itemIdText.length > 0) {
      return directoryDecision(itemIdText, match.channel.id_text, match.channel.title, artworkUrl);
    }
    return keptOnDirectoryShow(row, match.channel.id_text, match.channel.title, artworkUrl);
  }

  return addByRssDecision(row, row.addByRssFeedUrl);
};

export const decideV4DownloadAfterItemFetch = (
  row: V4DownloadCarryoverRow,
  target: V4DownloadDirectoryTarget,
  result: 'failed' | 'gone'
): V4DownloadDecision => {
  if (result === 'gone') {
    return keptOnDirectoryShow(
      row,
      target.channelIdText,
      target.channelTitle,
      target.fallbackArtworkUrl
    );
  }
  // The lookup already named a directory item. Keep retrying so a later success
  // adopts that item instead of creating a second local episode.
  return retryDecision();
};

/**
 * A copy that still fails on the last try is deleted. A file in an unreadable
 * folder, or a file whose delete keeps failing, is only counted: the pass
 * cannot remove it.
 */
export const settleV4DownloadFailure = (
  row: V4DownloadCarryoverRow,
  failure: V4DownloadFailure
): V4DownloadFailureOutcome => {
  const last = isLastAttempt(row);
  switch (failure) {
    case 'adopt_failed':
    case 'no_feed':
      return last ? { kind: 'delete', reason: 'gave_up' } : { kind: 'retry' };
    case 'unreachable':
      return last ? { kind: 'final', status: 'unreachable' } : { kind: 'retry' };
    case 'delete_failed':
      return last ? { kind: 'final', status: 'delete_failed' } : { kind: 'retry' };
    default: {
      const unreachable: never = failure;
      return unreachable;
    }
  }
};

/**
 * Counts for the pass log. A kept episode is settled as `directory`, so it is
 * included in `directory_episodes`. `waiting_files` is rows still pending plus
 * rows waiting on a retry.
 */
export const v4DownloadCarryoverLogDetails = (
  byStatus: Record<V4DownloadCarryoverStatus, number>
): SyncEventLogDetails => ({
  add_by_rss_episodes: String(byStatus.add_by_rss),
  already_downloaded: String(byStatus.duplicate),
  deleted_files: String(byStatus.deleted),
  directory_episodes: String(byStatus.directory),
  missing_files: String(byStatus.missing),
  undeletable_files: String(byStatus.delete_failed),
  unreadable_files: String(byStatus.unreachable),
  waiting_files: String(byStatus.pending + byStatus.waiting),
});
