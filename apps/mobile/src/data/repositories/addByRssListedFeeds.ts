import type { AddByRSSPublisherListedFeed } from '@podverse/helpers';
import type { DTOAddByRSSRemoteItemResolveResult } from '@podverse/helpers/dto';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';

import {
  DEVICE_LISTED_REQUEST_ID_PREFIX,
  isResolvableListedRef,
} from '../../lib/addByRss/deviceListedFeeds';
import type { AddByRssPollResult } from '../../lib/addByRss/domain';
import type { AddByRssAuthFailure } from '../../prefs/addByRSSFeeds';
import type { AddByRssListedFeedInsert, AddByRssListedFeedRow } from '../db/schema';
import { safeJsonParse } from '../db/serialization';

/** Status rounds one album-sync run makes before leaving still-pending albums to the next run. */
export const LISTED_FEED_POLL_ROUNDS = 8;
/** The wait between rounds while any listed album is still pending. */
export const LISTED_FEED_POLL_DELAY_MS = 3000;

/**
 * A feed an Add by RSS artist on this device lists, as stored in `add_by_rss_listed_feed`. Pure
 * decisions over these records live here so they test without a database; the SQLite half is in
 * `addByRssRepository`.
 */
export type AddByRssListedFeedRecord = {
  publisherFeedUrl: string;
  feedGuid: string;
  position: number;
  kind: 'add_by_rss' | 'directory' | 'unresolved';
  feedUrl: string | null;
  title: string | null;
  listedAtChannelLevel: boolean;
  itemGuids: string[];
  channelIdText: string | null;
  channelTitle: string | null;
  mediumId: number | null;
  imageUrl: string | null;
  artworkChecked: boolean;
  pendingRequestId: string | null;
  unresolvedReason: string | null;
};

type ListingRef = Pick<AddByRssListedFeedRecord, 'feedGuid' | 'feedUrl'>;

const toListedFeedKind = (value: string): AddByRssListedFeedRecord['kind'] => {
  switch (value) {
    case 'add_by_rss':
    case 'directory':
      return value;
    default:
      return 'unresolved';
  }
};

const parseItemGuids = (json: string): string[] => {
  const parsed = safeJsonParse<unknown>(json);
  return Array.isArray(parsed)
    ? parsed.filter((value): value is string => typeof value === 'string')
    : [];
};

export const rowToListedFeedRecord = (row: AddByRssListedFeedRow): AddByRssListedFeedRecord => ({
  publisherFeedUrl: row.publisherFeedUrl,
  feedGuid: row.feedGuid,
  position: row.position,
  kind: toListedFeedKind(row.kind),
  feedUrl: row.feedUrl,
  title: row.title,
  listedAtChannelLevel: row.listedAtChannelLevel === 1,
  itemGuids: parseItemGuids(row.itemGuidsJson),
  channelIdText: row.channelIdText,
  channelTitle: row.channelTitle,
  mediumId: row.mediumId,
  imageUrl: row.imageUrl,
  artworkChecked: row.artworkChecked === 1,
  pendingRequestId: row.pendingRequestId,
  unresolvedReason: row.unresolvedReason,
});

/** Rows for one artist's new list, carrying over artwork and pending ids of unchanged entries. */
export const toListedFeedInserts = (
  publisherFeedUrl: string,
  listed: readonly AddByRSSPublisherListedFeed[],
  existing: readonly AddByRssListedFeedRecord[]
): AddByRssListedFeedInsert[] => {
  const existingByGuid = new Map(existing.map((record) => [record.feedGuid, record]));
  const inserts: AddByRssListedFeedInsert[] = [];
  const seenGuids = new Set<string>();
  for (const [position, entry] of listed.entries()) {
    const feedGuid = entry.feedGuid.trim().toLowerCase();
    if (feedGuid.length === 0 || seenGuids.has(feedGuid)) {
      continue;
    }
    seenGuids.add(feedGuid);
    const base: AddByRssListedFeedInsert = {
      publisherFeedUrl,
      feedGuid,
      position,
      kind: entry.kind,
      feedUrl: entry.feedUrl,
      title: entry.title,
      listedAtChannelLevel: entry.listedAtChannelLevel ? 1 : 0,
      itemGuidsJson: JSON.stringify(entry.itemGuids),
      channelIdText: null,
      channelTitle: null,
      mediumId: null,
      imageUrl: null,
      artworkChecked: 0,
      pendingRequestId: null,
      unresolvedReason: null,
    };
    switch (entry.kind) {
      case 'directory': {
        const previous = existingByGuid.get(feedGuid);
        const keepArtwork =
          previous !== undefined && previous.channelIdText === entry.channelIdText;
        inserts.push({
          ...base,
          channelIdText: entry.channelIdText,
          channelTitle: entry.channelTitle,
          mediumId: entry.mediumId,
          imageUrl: keepArtwork ? previous.imageUrl : null,
          artworkChecked: keepArtwork && previous.artworkChecked ? 1 : 0,
        });
        break;
      }
      case 'add_by_rss':
        inserts.push({ ...base, pendingRequestId: entry.requestId });
        break;
      case 'unresolved':
        inserts.push({ ...base, unresolvedReason: entry.reason });
        break;
    }
  }
  return inserts;
};

const comparableFeedUrl = (feedUrl: string): string =>
  canonicalAddByRSSFeedUrl(feedUrl) ?? feedUrl.trim();

/** Whether any listing names this feed, by canonical URL or by its guid. */
export const isFeedListed = (
  feed: { feedUrl: string; podcastGuid: string | null },
  listings: readonly ListingRef[]
): boolean => {
  const feedUrl = comparableFeedUrl(feed.feedUrl);
  const podcastGuid = feed.podcastGuid?.trim().toLowerCase() ?? '';
  return listings.some(
    (listing) =>
      (podcastGuid.length > 0 && listing.feedGuid.toLowerCase() === podcastGuid) ||
      (listing.feedUrl !== null && comparableFeedUrl(listing.feedUrl) === feedUrl)
  );
};

/** URLs of listed-only rows (`followed` false) that no listing names any more. */
export const listedOnlyFeedUrlsToRemove = (
  feeds: readonly { feedUrl: string; followed: boolean; podcastGuid: string | null }[],
  listings: readonly ListingRef[]
): string[] =>
  feeds
    .filter((feed) => !feed.followed && !isFeedListed(feed, listings))
    .map((feed) => feed.feedUrl);

/** A listing the album sync still has to finish: a parse to fetch, or directory artwork to read. */
export const listedFeedNeedsWork = (listing: AddByRssListedFeedRecord): boolean =>
  (listing.kind === 'add_by_rss' &&
    listing.feedUrl !== null &&
    listing.pendingRequestId !== null) ||
  (listing.kind === 'directory' && listing.channelIdText !== null && !listing.artworkChecked);

/** One listing row waiting on an album parse, with the request id it was given. */
export type PendingListingRef = {
  publisherFeedUrl: string;
  feedGuid: string;
  pendingRequestId: string;
};

/** One album to fetch, however many artists on the device list it. */
export type PendingListedAlbum = {
  feedUrl: string;
  requestId: string;
  title: string | null;
  listings: PendingListingRef[];
};

/** Pending Add by RSS listings, one entry per canonical album URL, in listing order. */
export const groupPendingListedAlbums = (
  listings: readonly AddByRssListedFeedRecord[]
): PendingListedAlbum[] => {
  const byUrl = new Map<string, PendingListedAlbum>();
  for (const listing of listings) {
    if (
      listing.kind !== 'add_by_rss' ||
      listing.feedUrl === null ||
      listing.pendingRequestId === null
    ) {
      continue;
    }
    const ref: PendingListingRef = {
      publisherFeedUrl: listing.publisherFeedUrl,
      feedGuid: listing.feedGuid,
      pendingRequestId: listing.pendingRequestId,
    };
    const key = comparableFeedUrl(listing.feedUrl);
    const album = byUrl.get(key);
    if (album === undefined) {
      byUrl.set(key, {
        feedUrl: listing.feedUrl,
        requestId: listing.pendingRequestId,
        title: listing.title,
        listings: [ref],
      });
    } else {
      byUrl.set(key, {
        ...album,
        title: album.title ?? listing.title,
        listings: [...album.listings, ref],
      });
    }
  }
  return [...byUrl.values()];
};

type ListedAlbumResult = Pick<
  AddByRssPollResult,
  'authChallenge' | 'failureReason' | 'httpStatus' | 'mappedFeed' | 'status'
>;

/**
 * The credential failure an album parse ended on, or null for any other outcome. An album outside
 * the artist feed's credential scope is fetched without them, and the worker reports every failure
 * there as withheld; a host 401 asking for credentials still means the album is private.
 */
export const listedAlbumAuthFailure = (result: ListedAlbumResult): AddByRssAuthFailure | null => {
  if (result.status !== 'failed') {
    return null;
  }
  switch (result.failureReason) {
    case 'credentials_required':
    case 'credentials_rejected':
      return result.failureReason;
    case 'credentials_withheld_other_domain':
      return result.httpStatus === 401 && result.authChallenge !== 'other'
        ? 'credentials_required'
        : null;
    default:
      return null;
  }
};

export type ListedAlbumStoreAction =
  | { kind: 'keep-pending' }
  | { kind: 'unchanged' }
  | { kind: 'update-existing' }
  | { kind: 'skip-duplicate' }
  | { kind: 'insert-parsed' }
  | { kind: 'insert-needs-credentials' }
  | { kind: 'log-failure' };

/** What to store for one listed album's finished (or still pending) parse. */
export const decideListedAlbumStore = (params: {
  result: ListedAlbumResult;
  /** A stored row with this album's URL (canonical match). */
  hasRowForUrl: boolean;
  /** A stored row whose `podcast_guid` equals the parsed album's guid, under another URL. */
  hasRowForGuid: boolean;
}): ListedAlbumStoreAction => {
  const { hasRowForGuid, hasRowForUrl, result } = params;
  if (result.status === 'pending') {
    return { kind: 'keep-pending' };
  }
  // A device fetch sent its stored validators and the host answered 304.
  if (result.status === 'not_modified' && result.mappedFeed === null) {
    return { kind: 'unchanged' };
  }
  if (result.mappedFeed !== null) {
    if (hasRowForUrl) {
      return { kind: 'update-existing' };
    }
    return hasRowForGuid ? { kind: 'skip-duplicate' } : { kind: 'insert-parsed' };
  }
  if (listedAlbumAuthFailure(result) !== null) {
    return hasRowForUrl ? { kind: 'update-existing' } : { kind: 'insert-needs-credentials' };
  }
  return { kind: 'log-failure' };
};

/**
 * A mobile-only `unresolvedReason`: the directory resolve was asked and does not know the guid
 * (`not_found`, a 400, or a provider feed with no usable URL). The column is free text; the shared
 * reasons come from `AddByRSSPublisherListedFeedUnresolvedReason`. The artist's next plan replaces
 * the row, so the guid is asked again only after the artist feed changes. A directory channel
 * that is not ready yet never gets this reason.
 */
export const LISTED_FEED_RESOLVE_NO_MATCH_REASON = 'resolve_no_match';

/** A guid-only listing the paced directory resolve still has to ask about. */
export const listedFeedNeedsResolve = (listing: AddByRssListedFeedRecord): boolean =>
  listing.kind === 'unresolved' &&
  listing.unresolvedReason === 'no_feed_url' &&
  isResolvableListedRef(listing);

/** A listing row, by its primary key. */
export type ListedFeedKey = { publisherFeedUrl: string; feedGuid: string };

/** One resolve call, and every listing that names its guid. */
export type ListedFeedResolveGroup = {
  feedGuid: string;
  keys: ListedFeedKey[];
};

/** One group per lowercased guid, in first-seen order: two artists listing one album cost one call. */
export const groupListedFeedResolveWork = (
  listings: readonly AddByRssListedFeedRecord[]
): ListedFeedResolveGroup[] => {
  const byGuid = new Map<string, ListedFeedResolveGroup>();
  for (const listing of listings) {
    const guid = listing.feedGuid.toLowerCase();
    const key: ListedFeedKey = {
      publisherFeedUrl: listing.publisherFeedUrl,
      feedGuid: listing.feedGuid,
    };
    const group = byGuid.get(guid);
    if (group === undefined) {
      byGuid.set(guid, { feedGuid: guid, keys: [key] });
    } else {
      group.keys.push(key);
    }
  }
  return [...byGuid.values()];
};

export type ListedFeedResolveAction =
  | {
      kind: 'directory';
      channelIdText: string;
      channelTitle: string | null;
      mediumId: number | null;
    }
  | { kind: 'add_by_rss'; feedUrl: string; requestId: string }
  | { kind: 'no_match' }
  | { kind: 'retry_later' };

/** What one resolve answer does to the listings of its guid. */
export const decideListedFeedResolve = (
  result: DTOAddByRSSRemoteItemResolveResult,
  newUuid: () => string
): ListedFeedResolveAction => {
  switch (result.kind) {
    case 'channel':
      return {
        kind: 'directory',
        channelIdText: result.channel.id_text,
        channelTitle: result.channel.title,
        mediumId: result.channel.medium_id,
      };
    case 'provider_feed': {
      const feedUrl = canonicalAddByRSSFeedUrl(result.provider_feed.feed_url);
      return feedUrl === null
        ? { kind: 'no_match' }
        : { kind: 'add_by_rss', feedUrl, requestId: DEVICE_LISTED_REQUEST_ID_PREFIX + newUuid() };
    }
    case 'not_found':
      return { kind: 'no_match' };
    case 'directory_unavailable':
      return { kind: 'retry_later' };
    default: {
      const unhandled: never = result;
      return unhandled;
    }
  }
};

/**
 * Retry timing for a guid whose directory channel is not ready yet. The entry lives in memory for
 * the app session; nothing sleeps toward it. A later sync trigger picks the guid up once it is due,
 * so the k-th answer delays the next ask by `BASE × 2^(k−1)`, capped at `MAX`, for at most
 * `MAX_RETRIES` retries per session.
 */
export const LISTED_FEED_RESOLVE_RETRY_BASE_MS = 60000;
export const LISTED_FEED_RESOLVE_RETRY_MAX_MS = 1800000;
export const LISTED_FEED_RESOLVE_RETRY_MAX_RETRIES = 6;

/**
 * `attempts` counts `directory_unavailable` answers this session; `nextAttemptAtMs: null` means
 * no more attempts this session.
 */
export type ListedFeedResolveRetry = { attempts: number; nextAttemptAtMs: number | null };

export const nextListedFeedResolveRetry = (
  previous: ListedFeedResolveRetry | undefined,
  nowMs: number
): ListedFeedResolveRetry => {
  const attempts = (previous?.attempts ?? 0) + 1;
  if (attempts > LISTED_FEED_RESOLVE_RETRY_MAX_RETRIES) {
    return { attempts, nextAttemptAtMs: null };
  }
  const delayMs = Math.min(
    LISTED_FEED_RESOLVE_RETRY_BASE_MS * 2 ** (attempts - 1),
    LISTED_FEED_RESOLVE_RETRY_MAX_MS
  );
  return { attempts, nextAttemptAtMs: nowMs + delayMs };
};

export const isListedFeedResolveDue = (
  retry: ListedFeedResolveRetry | undefined,
  nowMs: number
): boolean => {
  if (retry === undefined) {
    return true;
  }
  if (retry.nextAttemptAtMs === null) {
    return false;
  }
  return nowMs >= retry.nextAttemptAtMs;
};

/** True when a pointer lookup is due: never looked up, or the stored guids differ. */
export const directoryLookupDue = (
  stored: { publisherGuids: readonly string[]; directoryMatches: readonly unknown[] | null } | null,
  pointerGuids: readonly string[]
): boolean => {
  if (stored === null || stored.directoryMatches === null) {
    return true;
  }
  return (
    stored.publisherGuids.length !== pointerGuids.length ||
    stored.publisherGuids.some((guid, index) => guid !== pointerGuids[index])
  );
};
