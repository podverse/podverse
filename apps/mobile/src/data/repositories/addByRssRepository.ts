import type { SQL } from 'drizzle-orm';
import { and, asc, desc, eq, inArray, isNotNull, ne, or, sql } from 'drizzle-orm';

import type {
  AddByRSSParseCacheEntry,
  AddByRSSPublisherListedFeed,
  DTOAccountFollowingAddByRSSChannel,
} from '@podverse/helpers';
import { primaryChannelListArtworkUrl, resolveCredentialScope } from '@podverse/helpers';
import type { DTOAddByRSSRemoteItemLookupResult } from '@podverse/helpers/dto';
import { ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS } from '@podverse/helpers/dto';
import { getErrorMessage, getErrorResponseStatus } from '@podverse/helpers/error';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';
import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';
import {
  addByRSSFeedMayHaveLivestreams,
  addByRSSResourceTypeListsFeeds,
  collectAddByRSSPublisherListedFeedRefsFromMappedFeed,
  getAddByRSSResourceTypeFromMappedFeed,
  toAddByRSSResourceType,
} from '@podverse/parser-mapping';

// Import directly from the request module (not the auth barrel) to avoid a cycle, mirroring
// accountRepository (AuthProvider → accountRepository → auth barrel → AuthProvider).
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { isAddByRssInsecureCredentialsAllowedFromEnv } from '../../config/env';
import { buildAddByRssParseFailureLog } from '../../lib/addByRss/addByRssErrorLog';
import type {
  AddByRssCredentials,
  AddByRssCredentialStatus,
  AddByRssNeedsCredentialsFeed,
} from '../../lib/addByRss/credentials';
import {
  isAddByRssAuthFailure,
  partitionAddByRssFeedsByCredentials,
  resolveAddByRssCredentialStatus,
  splitAddByRssPastedUrl,
  toAddByRssCredentialFeedUrl,
} from '../../lib/addByRss/credentials';
import type { DeviceListedFeedMatches } from '../../lib/addByRss/deviceListedFeeds';
import {
  deviceListedFeedLookupRefs,
  deviceListedFeedMatches,
  isDeviceListedRequestId,
  planDeviceListedFeeds,
} from '../../lib/addByRss/deviceListedFeeds';
import { parseAddByRssFeedOnDevice } from '../../lib/addByRss/deviceParse';
import type { AddByRssDeviceParseResult } from '../../lib/addByRss/deviceParseEngine';
import type { AddByRssPollResult } from '../../lib/addByRss/domain';
import {
  buildAddByRssFeedRecord,
  localFeedForServerFollow,
  pollAddByRssParseStatus,
} from '../../lib/addByRss/domain';
import type { AddByRssParsePath } from '../../lib/addByRss/parsePath';
import type { AddByRssDirectoryPublisherMatch } from '../../lib/addByRss/publisherRefs';
import {
  addByRssPublisherRefsFromMappedFeed,
  parseStoredPublisherDirectoryMatches,
  parseStoredPublisherGuids,
  publisherRefColumnsFromMappedFeed,
} from '../../lib/addByRss/publisherRefs';
import { createUuid } from '../../lib/createUuid';
import { getRateLimitRetryAfterMs } from '../../lib/rateLimit/handleRateLimitMessage';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import { requestAddByRssListedFeedsSync } from '../../sync/requestAddByRssRefresh';
import { classifySyncError } from '../../sync/syncErrorClassification';
import type { SyncJobKind } from '../../sync/syncJobKinds';
import type { SyncJobPriority } from '../../sync/syncQueue';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
import { reloadAddByRssArtistIndex } from '../db/readAddByRssArtistIndex';
import type { AddByRssFeedRow, AddByRssListedFeedInsert } from '../db/schema';
import { addByRssCredentialStore } from './addByRssCredentialStore';
import type { AddByRssDeviceCache, AddByRssDeviceRefreshEntry } from './addByRssDevicePath';
import {
  addByRssFollowOwnershipValues,
  deviceCacheForFetch,
  deviceCacheToStore,
  isAddByRssFeedHiddenInSession,
  selectDeviceRefreshFeedUrls,
} from './addByRssDevicePath';
import type {
  AddByRssListedFeedRecord,
  ListedFeedKey,
  ListedFeedResolveAction,
  ListedFeedResolveRetry,
  PendingListedAlbum,
  PendingListingRef,
} from './addByRssListedFeeds';
import {
  decideListedAlbumStore,
  decideListedFeedResolve,
  directoryLookupDue,
  groupListedFeedResolveWork,
  groupPendingListedAlbums,
  isFeedListed,
  isListedFeedResolveDue,
  LISTED_FEED_POLL_DELAY_MS,
  LISTED_FEED_POLL_ROUNDS,
  LISTED_FEED_RESOLVE_NO_MATCH_REASON,
  listedAlbumAuthFailure,
  listedFeedNeedsResolve,
  listedFeedNeedsWork,
  listedOnlyFeedUrlsToRemove,
  nextListedFeedResolveRetry,
  rowToListedFeedRecord,
  toListedFeedInserts,
} from './addByRssListedFeeds';
import { autoDownloadRepository } from './autoDownloadRepository';
import { channelLiveStatusRepository } from './channelLiveStatusRepository';
import { channelSeenRepository } from './channelSeenRepository';
import { playbackContentRepository } from './playbackContentRepository';
import { syncEventLogRepository } from './syncEventLogRepository';
import type { MobileAuthRequestContext } from './types';

const rowToRecord = (row: Omit<AddByRssFeedRow, 'mappedFeedJson'>): MobileAddByRSSFeedRecord => {
  return {
    id: row.id,
    idText: row.idText,
    resourceType: toAddByRSSResourceType(row.resourceType),
    feedUrl: row.feedUrl,
    title: row.title,
    imageUrl: row.imageUrl,
    updatedAt: row.updatedAt,
    enclosureUrl: row.enclosureUrl,
    latestItemPubDateMs: row.latestItemPubDateMs,
    playbackPosition: row.playbackPosition,
    requiresCredentials: row.requiresCredentials === 1,
    lastAuthFailure: isAddByRssAuthFailure(row.lastAuthFailure) ? row.lastAuthFailure : null,
    mayHaveLivestreams: row.mayHaveLivestreams === 1,
    followed: row.followed === 1,
  };
};

/** Every `add_by_rss_feed` column except the mapped bundle, for reads that list many feeds. */
const feedColumnsWithoutBundle = () => ({
  feedUrl: schema.addByRssFeed.feedUrl,
  id: schema.addByRssFeed.id,
  idText: schema.addByRssFeed.idText,
  resourceType: schema.addByRssFeed.resourceType,
  title: schema.addByRssFeed.title,
  imageUrl: schema.addByRssFeed.imageUrl,
  enclosureUrl: schema.addByRssFeed.enclosureUrl,
  playbackPosition: schema.addByRssFeed.playbackPosition,
  latestItemPubDateMs: schema.addByRssFeed.latestItemPubDateMs,
  updatedAt: schema.addByRssFeed.updatedAt,
  requiresCredentials: schema.addByRssFeed.requiresCredentials,
  lastAuthFailure: schema.addByRssFeed.lastAuthFailure,
  mayHaveLivestreams: schema.addByRssFeed.mayHaveLivestreams,
  followed: schema.addByRssFeed.followed,
  podcastGuid: schema.addByRssFeed.podcastGuid,
  publisherGuidsJson: schema.addByRssFeed.publisherGuidsJson,
  publisherDirectoryJson: schema.addByRssFeed.publisherDirectoryJson,
  deviceEtag: schema.addByRssFeed.deviceEtag,
  deviceLastModified: schema.addByRssFeed.deviceLastModified,
  deviceFeedHash: schema.addByRssFeed.deviceFeedHash,
  deviceCheckedAt: schema.addByRssFeed.deviceCheckedAt,
  signedOutOwned: schema.addByRssFeed.signedOutOwned,
  followedAt: schema.addByRssFeed.followedAt,
});

/** A stored feed with the guid columns that tie artists and albums together. */
export type AddByRssFeedWithRefs = {
  feed: MobileAddByRSSFeedRecord;
  podcastGuid: string | null;
  publisherGuids: string[];
};

/** SQLite binds one parameter per column, so a bulk insert has to arrive in pieces. */
const LISTED_FEED_INSERT_CHUNK_SIZE = 50;

/**
 * Runs after every write that changes `followed`, a feed's guid columns, or a listing, so the
 * in-memory artist index that player lines read synchronously never lags SQLite.
 */
const afterArtistRelationsChanged = async (): Promise<void> => {
  await reloadAddByRssArtistIndex();
};

const isSignedInSession = async (): Promise<boolean> =>
  (await addByRssCredentialStore.currentAccountIdText()) !== null;

/**
 * Rows the current session may list. While someone is signed in, a followed row the signed-out
 * user kept is left out; signed out, every row is listed. The SQL form of
 * `isAddByRssFeedHiddenInSession`; the two are the same rule.
 */
const sessionVisibleFeedsCondition = async (): Promise<SQL | undefined> =>
  (await isSignedInSession())
    ? or(eq(schema.addByRssFeed.followed, 0), eq(schema.addByRssFeed.signedOutOwned, 0))
    : undefined;

const seedAutoDownloadRule = (feedUrl: string): void => {
  void autoDownloadRepository
    .seedFromGlobalDefaults({
      channelIdText: feedUrl,
      source: 'add_by_rss',
    })
    .catch(() => undefined);
};

/** The feed row and everything keyed by its URL: credentials, live status, seen state, rule. */
const deleteStoredFeed = async (feedUrl: string): Promise<void> => {
  await getDb().delete(schema.addByRssFeed).where(eq(schema.addByRssFeed.feedUrl, feedUrl));
  await addByRssCredentialStore.deleteForCurrentAccount(feedUrl);
  await channelLiveStatusRepository.remove(feedUrl);
  await channelSeenRepository.remove(feedUrl);
  await autoDownloadRepository.removeChannel(feedUrl);
};

const readAllListedFeeds = async (): Promise<AddByRssListedFeedRecord[]> => {
  const rows = await getDb().select().from(schema.addByRssListedFeed);
  return rows.map(rowToListedFeedRecord);
};

/**
 * Removes listed-only feeds that no listing names. Removing an artist removes the albums it
 * brought, while an album two artists list stays until neither does.
 */
const pruneListedOnlyFeeds = async (): Promise<void> => {
  const [feeds, listings] = await Promise.all([
    getDb()
      .select({
        feedUrl: schema.addByRssFeed.feedUrl,
        followed: schema.addByRssFeed.followed,
        podcastGuid: schema.addByRssFeed.podcastGuid,
      })
      .from(schema.addByRssFeed),
    readAllListedFeeds(),
  ]);
  const feedUrls = listedOnlyFeedUrlsToRemove(
    feeds.map((feed) => ({ ...feed, followed: feed.followed === 1 })),
    listings
  );
  for (const feedUrl of feedUrls) {
    await deleteStoredFeed(feedUrl);
  }
};

/** Only the credential fields a record actually sets, so an omitted one keeps its stored value. */
const credentialColumnValues = (
  record: Pick<MobileAddByRSSFeedRecord, 'lastAuthFailure' | 'requiresCredentials'>
): { lastAuthFailure?: string | null; requiresCredentials?: number } => ({
  ...(record.requiresCredentials !== undefined
    ? { requiresCredentials: record.requiresCredentials ? 1 : 0 }
    : {}),
  ...(record.lastAuthFailure !== undefined ? { lastAuthFailure: record.lastAuthFailure } : {}),
});

/**
 * A credential failure the user already sees in the needs-credentials section. The server answers
 * a flagged feed that arrived without credentials this way on every refresh, so logging it would
 * fill the error log with rows that explain nothing new.
 */
const isExpectedMissingCredentials = (result: AddByRssPollResult): boolean =>
  result.failureReason === 'credentials_required' && result.credentialsState === 'not_provided';

/**
 * Refresh failures already logged this session, keyed by feed, code, and server reason. Every
 * foreground re-parses every feed, so a feed whose host stays down would otherwise add a row per
 * foreground and push everything else out of the capped log.
 */
const loggedRefreshFailures = new Set<string>();

/** `requestId` is null for a parse this device ran. */
const recordRefreshFailure = (
  parse: { feedUrl: string; requestId: string | null },
  result: AddByRssPollResult,
  jobKind: SyncJobKind
): void => {
  const entry = buildAddByRssParseFailureLog({
    feedUrl: parse.feedUrl,
    jobKind,
    occurredAt: Date.now(),
    requestId: parse.requestId,
    result,
  });
  if (entry === null) {
    return;
  }
  const key = `${parse.feedUrl}\u0000${entry.errorCode ?? ''}\u0000${entry.message ?? ''}`;
  if (loggedRefreshFailures.has(key)) {
    return;
  }
  loggedRefreshFailures.add(key);
  void syncEventLogRepository.append(entry);
};

/** What a refresh request returns per feed: the ticket to poll for that feed's parse result. */
export type AddByRssRefreshTicket = {
  feedUrl: string;
  requestId: string;
};

type ParseAllResponse = {
  request_ids: { feed_url: string; request_id: string }[];
};

type CredentialPair = { password: string; username: string };

const toCredentialsByUrl = (
  credentials: ReadonlyMap<string, AddByRssCredentials>
): Record<string, CredentialPair> => {
  const byUrl: Record<string, CredentialPair> = {};
  for (const [feedUrl, value] of credentials) {
    byUrl[feedUrl] = { password: value.password, username: value.username };
  }
  return byUrl;
};

const LISTED_FEEDS_JOB_KIND: SyncJobKind = 'add-by-rss-listed-feeds';

/** An album's publisher pointers resolved per parse; the first ones name the artist line. */
const PUBLISHER_DIRECTORY_LOOKUP_MAX = 5;

/**
 * How long one album-sync run keeps starting directory artwork reads. Whatever is left waits for
 * the next run, so a large artist cannot hold the serial queue until the job times out.
 */
const LISTED_FEED_WORK_BUDGET_MS = 45000;

/**
 * Album parses this device asked for itself, with credentials it holds. A run that finds one still
 * pending polls it again rather than sending the credentials a second time.
 */
const ownAlbumParseRequestIds = new Set<string>();

type StoredPublisherState = {
  publisherGuids: string[];
  directoryMatches: AddByRssDirectoryPublisherMatch[] | null;
} | null;

const readParseStatus = async (
  context: MobileAuthRequestContext,
  requestId: string
): Promise<AddByRSSParseCacheEntry<unknown>> =>
  requestWithMobileAuthRefresh(context, async (apiRequestService) =>
    apiRequestService.apiRequest<AddByRSSParseCacheEntry<unknown>>({
      path: `/account/add-by-rss/parse/status/${requestId}`,
      method: 'GET',
      config: {
        withCredentials: true,
      },
    })
  );

/** Start one parse and return its request id. Credentials go only in this body. */
const enqueueParseRequest = async (
  context: MobileAuthRequestContext,
  feedUrl: string,
  credentials: AddByRssCredentials | null
): Promise<string> => {
  const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
    apiRequestService.apiRequest<{ request_id: string }>({
      path: '/account/add-by-rss/parse',
      method: 'POST',
      config: {
        withCredentials: true,
      },
      data: {
        feed_url: feedUrl,
        ...(credentials !== null
          ? {
              basic_auth_password: credentials.password,
              basic_auth_username: credentials.username,
            }
          : {}),
      },
    })
  );
  return response.request_id;
};

/** A request for a listed album that threw: once per feed and error this session. */
const recordListedAlbumRequestFailure = (album: PendingListedAlbum, error: unknown): void => {
  const { code, isOffline } = classifySyncError(error);
  const message = getErrorMessage(error, code);
  const key = `${album.feedUrl}\u0000${code}\u0000${message}`;
  if (loggedRefreshFailures.has(key)) {
    return;
  }
  loggedRefreshFailures.add(key);
  void syncEventLogRepository.append({
    details: { feed_url: album.feedUrl, request_id: album.requestId },
    errorCode: code,
    jobKind: LISTED_FEEDS_JOB_KIND,
    message: message === code ? null : message,
    occurredAt: Date.now(),
    outcome: isOffline ? 'skipped' : 'failure',
  });
};

const warnArtistRelationsFailure = (step: string, error: unknown): void => {
  if (__DEV__) {
    // The code only: a request error can carry the feed URL in its query string.
    console.warn(`[add-by-rss] ${step} failed`, classifySyncError(error).code);
  }
};

const hasFeedWithPodcastGuid = async (
  podcastGuid: string,
  exceptFeedUrl: string
): Promise<boolean> => {
  const rows = await getDb()
    .select({ feedUrl: schema.addByRssFeed.feedUrl })
    .from(schema.addByRssFeed)
    .where(
      and(
        eq(schema.addByRssFeed.podcastGuid, podcastGuid),
        ne(schema.addByRssFeed.feedUrl, exceptFeedUrl)
      )
    )
    .limit(1);
  return rows.length > 0;
};

/**
 * Point listing rows at another parse request, or clear them with null. A row changes only while
 * it still waits on the id it was read with, so a newer artist parse is never overwritten.
 */
const moveListingsPending = async (
  listings: readonly PendingListingRef[],
  requestId: string | null
): Promise<void> => {
  for (const listing of listings) {
    await getDb()
      .update(schema.addByRssListedFeed)
      .set({ pendingRequestId: requestId })
      .where(
        and(
          eq(schema.addByRssListedFeed.publisherFeedUrl, listing.publisherFeedUrl),
          eq(schema.addByRssListedFeed.feedGuid, listing.feedGuid),
          eq(schema.addByRssListedFeed.pendingRequestId, listing.pendingRequestId)
        )
      );
  }
  await afterArtistRelationsChanged();
};

const clearPublisherDirectoryMatches = async (feedUrl: string): Promise<void> => {
  await getDb()
    .update(schema.addByRssFeed)
    .set({ publisherDirectoryJson: null })
    .where(eq(schema.addByRssFeed.feedUrl, feedUrl));
  await afterArtistRelationsChanged();
};

/**
 * Store what a parsed feed says about artists and albums: an artist's listings, and an album's
 * publisher pointers resolved to directory channels. `previous` is the feed's publisher state read
 * before its bundle was stored. Nothing here may fail the add or refresh that called it.
 */
const storeArtistRelations = async (
  context: MobileAuthRequestContext,
  feedUrl: string,
  result: AddByRssPollResult,
  previous: StoredPublisherState
): Promise<void> => {
  const { mappedFeed } = result;
  if (mappedFeed === null) {
    return;
  }

  if (result.status === 'parsed' && result.publisherListedFeeds !== undefined) {
    try {
      await addByRssRepository.replaceListedFeeds(feedUrl, result.publisherListedFeeds);
      const listings = await addByRssRepository.listListedFeeds(feedUrl);
      if (
        listings.some((listing) => listedFeedNeedsWork(listing) || listedFeedNeedsResolve(listing))
      ) {
        requestAddByRssListedFeedsSync();
      }
    } catch (error) {
      warnArtistRelationsFailure('storing listed feeds', error);
    }
  }

  if (getAddByRSSResourceTypeFromMappedFeed(mappedFeed) !== 'albums') {
    return;
  }
  const pointers = addByRssPublisherRefsFromMappedFeed(mappedFeed).publisherPointers;
  if (
    !directoryLookupDue(
      previous,
      pointers.map((pointer) => pointer.feedGuid)
    )
  ) {
    return;
  }
  try {
    const matches: AddByRssDirectoryPublisherMatch[] = [];
    for (const pointer of pointers.slice(0, PUBLISHER_DIRECTORY_LOOKUP_MAX)) {
      const match = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
        apiRequestService.reqChannelGetDirectoryMatch({
          feed_guid: pointer.feedGuid,
          feed_url: pointer.feedUrl,
        })
      );
      if (match !== null) {
        matches.push({
          feedGuid: pointer.feedGuid,
          channelIdText: match.id_text,
          channelTitle: match.title,
          mediumId: match.medium_id,
        });
      }
    }
    await addByRssRepository.setPublisherDirectoryMatches(feedUrl, matches);
  } catch (error) {
    warnArtistRelationsFailure('directory match lookup', error);
    // Matches for guids the feed no longer names are dropped, so the next parse looks again.
    if (previous !== null && previous.directoryMatches !== null) {
      await clearPublisherDirectoryMatches(feedUrl).catch(() => undefined);
    }
  }
};

/**
 * An artist parsed on this device, with its listings planned by the shared planner. Directory
 * matches come from the public remote-item lookup. A private artist (credentials were sent) plans
 * with none, so its references never leave the phone. `listingsResolved` is false when the lookup
 * failed: the stored listings stay, and the caller clears the conditional cache so the next fetch
 * plans again instead of answering not modified.
 */
const withDeviceListedFeeds = async (
  context: MobileAuthRequestContext,
  feedUrl: string,
  result: AddByRssDeviceParseResult
): Promise<{ result: AddByRssDeviceParseResult; listingsResolved: boolean }> => {
  const { mappedFeed } = result;
  if (
    result.status !== 'parsed' ||
    mappedFeed === null ||
    !addByRSSResourceTypeListsFeeds(getAddByRSSResourceTypeFromMappedFeed(mappedFeed))
  ) {
    return { result, listingsResolved: true };
  }
  const { refs } = collectAddByRSSPublisherListedFeedRefsFromMappedFeed(mappedFeed, feedUrl);
  let matches: DeviceListedFeedMatches | null = null;
  if (result.credentialsState !== 'sent') {
    try {
      const lookupRefs = deviceListedFeedLookupRefs(refs);
      const results: DTOAddByRSSRemoteItemLookupResult[] = [];
      for (
        let offset = 0;
        offset < lookupRefs.length;
        offset += ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS
      ) {
        const chunk = lookupRefs.slice(offset, offset + ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS);
        const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
          apiRequestService.reqAccountAddByRSSRemoteItemLookup(chunk)
        );
        results.push(...response.results);
      }
      matches = deviceListedFeedMatches(refs, results);
    } catch (error) {
      warnArtistRelationsFailure('listed feed lookup', error);
      return { result: { ...result, publisherListedFeeds: undefined }, listingsResolved: false };
    }
  }
  return {
    result: {
      ...result,
      publisherListedFeeds: planDeviceListedFeeds({ refs, matches, newUuid: createUuid }),
    },
    listingsResolved: true,
  };
};

/**
 * Listings the listed-feed and resolve jobs work on: every listing except those of artists this
 * session hides, whose rows wait for sign-out. The server path also leaves out albums this device
 * planned; the server has no record of their ids, and the artist's next server parse replaces them.
 */
const readWorkListings = async (
  parsePath: AddByRssParsePath
): Promise<AddByRssListedFeedRecord[]> => {
  const [listings, hiddenFeedUrls] = await Promise.all([
    addByRssRepository.listAllListedFeeds(),
    addByRssRepository.listHiddenFeedUrls(),
  ]);
  return listings.filter(
    (listing) =>
      !hiddenFeedUrls.has(listing.publisherFeedUrl) &&
      !(
        parsePath === 'server' &&
        listing.pendingRequestId !== null &&
        isDeviceListedRequestId(listing.pendingRequestId)
      )
  );
};

/**
 * Credentials for a listed album parsed on this device: its own, else those of the first listing
 * artist whose credentials may go to the album's host. Only its own count as `own`, which is what
 * the stored credential state records, as on the server path.
 */
const listedAlbumDeviceCredentials = async (
  album: PendingListedAlbum
): Promise<{ credentials: AddByRssCredentials | null; own: boolean }> => {
  const ownCredentials = await addByRssCredentialStore.getForCurrentAccount(album.feedUrl);
  if (ownCredentials !== null) {
    return { credentials: ownCredentials, own: true };
  }
  const allowInsecure = isAddByRssInsecureCredentialsAllowedFromEnv();
  for (const listing of album.listings) {
    if (
      resolveCredentialScope(listing.publisherFeedUrl, album.feedUrl, { allowInsecure }) !== 'send'
    ) {
      continue;
    }
    const artistCredentials = await addByRssCredentialStore.getForCurrentAccount(
      listing.publisherFeedUrl
    );
    if (artistCredentials !== null) {
      return { credentials: artistCredentials, own: false };
    }
  }
  return { credentials: null, own: false };
};

/** Send this device's own parse request for an album it holds credentials for. */
const withOwnAlbumParseRequest = async (
  context: MobileAuthRequestContext,
  album: PendingListedAlbum
): Promise<PendingListedAlbum> => {
  if (ownAlbumParseRequestIds.has(album.requestId)) {
    return album;
  }
  const credentials = await addByRssCredentialStore.getForCurrentAccount(album.feedUrl);
  if (credentials === null) {
    return album;
  }
  let requestId: string;
  try {
    requestId = await enqueueParseRequest(context, album.feedUrl, credentials);
  } catch (error) {
    recordListedAlbumRequestFailure(album, error);
    return album;
  }
  ownAlbumParseRequestIds.add(requestId);
  await moveListingsPending(album.listings, requestId);
  return {
    ...album,
    requestId,
    listings: album.listings.map((listing) => ({ ...listing, pendingRequestId: requestId })),
  };
};

/**
 * Store one listed album's finished parse the way `decideListedAlbumStore` says.
 * `sentCredentials` is true when the album's own stored credentials went with the parse;
 * `requestId` is the logged parse request, null for a parse this device ran.
 */
const storeListedAlbumResult = async (
  context: MobileAuthRequestContext,
  album: PendingListedAlbum,
  result: AddByRssPollResult,
  parse: { requestId: string | null; sentCredentials: boolean }
): Promise<void> => {
  const canonicalUrl = canonicalAddByRSSFeedUrl(album.feedUrl);
  const existing =
    (await addByRssRepository.getFeedByUrl(album.feedUrl)) ??
    (canonicalUrl !== null && canonicalUrl !== album.feedUrl
      ? await addByRssRepository.getFeedByUrl(canonicalUrl)
      : null);
  const podcastGuid =
    result.mappedFeed === null
      ? null
      : addByRssPublisherRefsFromMappedFeed(result.mappedFeed).podcastGuid;
  const hasRowForGuid =
    existing === null &&
    podcastGuid !== null &&
    (await hasFeedWithPodcastGuid(podcastGuid, album.feedUrl));
  const action = decideListedAlbumStore({ result, hasRowForUrl: existing !== null, hasRowForGuid });
  const { sentCredentials } = parse;

  switch (action.kind) {
    case 'update-existing': {
      if (existing === null) {
        return;
      }
      if (result.mappedFeed === null) {
        await addByRssRepository.setCredentialStatus(existing.feedUrl, {
          lastAuthFailure: listedAlbumAuthFailure(result),
          requiresCredentials: true,
        });
        return;
      }
      const previous = await addByRssRepository.getPublisherState(existing.feedUrl);
      const credentialStatus = resolveAddByRssCredentialStatus({
        credentialsState: result.credentialsState,
        current: sentCredentials || existing.requiresCredentials === true,
        failureReason: result.failureReason,
        status: result.status,
      });
      await addByRssRepository.upsertFeed(
        {
          ...buildAddByRssFeedRecord(existing.feedUrl, existing, result.preview),
          ...credentialStatus,
        },
        result.mappedFeed
      );
      await storeArtistRelations(context, existing.feedUrl, result, previous);
      return;
    }
    case 'insert-parsed': {
      if (result.mappedFeed === null) {
        return;
      }
      const credentialStatus = resolveAddByRssCredentialStatus({
        credentialsState: result.credentialsState,
        current: sentCredentials,
        failureReason: result.failureReason,
        status: result.status,
      });
      await addByRssRepository.upsertFeed(
        {
          ...buildAddByRssFeedRecord(album.feedUrl, undefined, result.preview),
          followed: false,
          resourceType: 'albums',
          title: result.preview.title ?? album.title ?? album.feedUrl,
          ...(sentCredentials ? { requiresCredentials: true } : {}),
          ...credentialStatus,
        },
        result.mappedFeed
      );
      await storeArtistRelations(context, album.feedUrl, result, null);
      return;
    }
    case 'insert-needs-credentials':
      await addByRssRepository.upsertFeed({
        ...buildAddByRssFeedRecord(album.feedUrl, undefined, result.preview),
        followed: false,
        lastAuthFailure: listedAlbumAuthFailure(result),
        requiresCredentials: true,
        resourceType: 'albums',
        title: album.title ?? album.feedUrl,
      });
      return;
    case 'log-failure':
      recordRefreshFailure(
        { feedUrl: album.feedUrl, requestId: parse.requestId },
        result,
        LISTED_FEEDS_JOB_KIND
      );
      return;
    case 'keep-pending':
    case 'unchanged':
    case 'skip-duplicate':
      return;
  }
};

/**
 * Read one listed album's parse status once and store the result. `pending` keeps it for the next
 * round; `unreadable` keeps its id for the next run.
 */
const settleListedAlbum = async (
  context: MobileAuthRequestContext,
  album: PendingListedAlbum
): Promise<'pending' | 'settled' | 'unreadable'> => {
  let result: AddByRssPollResult;
  try {
    result = await pollAddByRssParseStatus(
      album.requestId,
      async (requestId) => readParseStatus(context, requestId),
      { attempts: 1, delayMs: 0 }
    );
  } catch (error) {
    recordListedAlbumRequestFailure(album, error);
    return 'unreadable';
  }
  if (result.status === 'pending') {
    return 'pending';
  }
  try {
    await storeListedAlbumResult(context, album, result, {
      requestId: album.requestId,
      sentCredentials: ownAlbumParseRequestIds.has(album.requestId),
    });
  } catch (error) {
    warnArtistRelationsFailure('storing a listed album', error);
    return 'unreadable';
  }
  await moveListingsPending(album.listings, null);
  return 'settled';
};

/**
 * Fetch and parse pending listed albums on this device, once each in listing order, until
 * `shouldStop` says so. A throw (offline, Offline Mode, abort) ends the pass with that album still
 * pending. `deviceAlbumsLeft` counts the albums still pending afterwards.
 */
const parseListedAlbumsOnDevice = async (
  context: MobileAuthRequestContext,
  albums: readonly PendingListedAlbum[],
  shouldStop: () => boolean,
  signal?: AbortSignal
): Promise<{ deviceAlbumsLeft: number; deviceAlbumsStored: number }> => {
  let deviceAlbumsStored = 0;
  let deviceAlbumsFailed = 0;
  for (const [index, album] of albums.entries()) {
    const notStarted = albums.length - index;
    if (shouldStop()) {
      return { deviceAlbumsLeft: notStarted + deviceAlbumsFailed, deviceAlbumsStored };
    }
    let result: AddByRssDeviceParseResult;
    let ownCredentials: boolean;
    try {
      const { credentials, own } = await listedAlbumDeviceCredentials(album);
      ownCredentials = own;
      const state = await addByRssRepository.getDeviceFetchState(album.feedUrl);
      result = await parseAddByRssFeedOnDevice({
        conditionalCache: state?.cache ?? null,
        credentials,
        feedUrl: album.feedUrl,
        signal,
      });
    } catch {
      return { deviceAlbumsLeft: notStarted + deviceAlbumsFailed, deviceAlbumsStored };
    }
    try {
      await storeListedAlbumResult(context, album, result, {
        requestId: null,
        sentCredentials: ownCredentials,
      });
      if ((await addByRssRepository.getDeviceFetchState(album.feedUrl)) !== null) {
        await addByRssRepository.setDeviceFetchState(album.feedUrl, {
          cache: deviceCacheToStore(result),
          checkedAtMs: Date.now(),
        });
      }
    } catch (error) {
      warnArtistRelationsFailure('storing a listed album', error);
      deviceAlbumsFailed += 1;
      continue;
    }
    await moveListingsPending(album.listings, null);
    deviceAlbumsStored += 1;
  }
  return { deviceAlbumsLeft: deviceAlbumsFailed, deviceAlbumsStored };
};

/**
 * Retry times for guids whose directory channel was not ready yet, keyed by lowercased guid. Held
 * for the app session only, like the sync queue's work. It is device data about public directory
 * guids, so sign-out leaves it.
 */
const listedFeedResolveRetries = new Map<string, ListedFeedResolveRetry>();

/** How long one resolve run keeps calling; longer than a one-minute rate-limit window. */
const LISTED_FEED_RESOLVE_BUDGET_MS = 80000;

/** The gap between resolve calls, which keeps a large artist under the signed-out rate limit. */
const LISTED_FEED_RESOLVE_SPACING_MS = 500;

/**
 * Guid-only listings the resolve job may ask about now. Listings of an artist with stored
 * credentials are left out, so a private artist's guids never leave the phone, and so are guids
 * whose retry time has not come.
 */
const listListedFeedResolveWork = async (): Promise<AddByRssListedFeedRecord[]> => {
  const listings = (await readWorkListings('device')).filter(listedFeedNeedsResolve);
  const nowMs = Date.now();
  const hasCredentialsByPublisher = new Map<string, boolean>();
  const work: AddByRssListedFeedRecord[] = [];
  for (const listing of listings) {
    if (
      !isListedFeedResolveDue(listedFeedResolveRetries.get(listing.feedGuid.toLowerCase()), nowMs)
    ) {
      continue;
    }
    let hasCredentials = hasCredentialsByPublisher.get(listing.publisherFeedUrl);
    if (hasCredentials === undefined) {
      hasCredentials = await addByRssCredentialStore
        .getForCurrentAccount(listing.publisherFeedUrl)
        .then(
          (credentials) => credentials !== null,
          // An unreadable entry may still be a private artist's.
          () => true
        );
      hasCredentialsByPublisher.set(listing.publisherFeedUrl, hasCredentials);
    }
    if (!hasCredentials) {
      work.push(listing);
    }
  }
  return work;
};

type SettledListedFeedResolve = Exclude<ListedFeedResolveAction, { kind: 'retry_later' }>;

const listedFeedResolveColumns = (
  action: SettledListedFeedResolve
): Partial<AddByRssListedFeedInsert> => {
  switch (action.kind) {
    case 'directory':
      return {
        artworkChecked: 0,
        channelIdText: action.channelIdText,
        channelTitle: action.channelTitle,
        kind: 'directory',
        mediumId: action.mediumId,
        unresolvedReason: null,
      };
    case 'add_by_rss':
      return {
        feedUrl: action.feedUrl,
        kind: 'add_by_rss',
        pendingRequestId: action.requestId,
        unresolvedReason: null,
      };
    case 'no_match':
      return { unresolvedReason: LISTED_FEED_RESOLVE_NO_MATCH_REASON };
  }
};

/**
 * Store one settled resolve answer on every listing of its guid. A row changes only while it is
 * still a guid-only unresolved row, so an artist re-plan that replaced it in between wins.
 */
const applyListedFeedResolve = async (
  keys: readonly ListedFeedKey[],
  action: SettledListedFeedResolve
): Promise<void> => {
  const values = listedFeedResolveColumns(action);
  await getDb().transaction(async (transaction) => {
    for (const key of keys) {
      await transaction
        .update(schema.addByRssListedFeed)
        .set(values)
        .where(
          and(
            eq(schema.addByRssListedFeed.publisherFeedUrl, key.publisherFeedUrl),
            eq(schema.addByRssListedFeed.feedGuid, key.feedGuid),
            eq(schema.addByRssListedFeed.kind, 'unresolved'),
            eq(schema.addByRssListedFeed.unresolvedReason, 'no_feed_url')
          )
        );
    }
  });
  await afterArtistRelationsChanged();
};

/**
 * One resolve answer for a guid. A 429 is waited out and asked again while the wait fits the
 * budget; a 400 is a ref the route refuses, so no match. Null stops the run: the budget is spent,
 * or the index provider or the API answered an error. An error with no HTTP status (offline,
 * unreachable) is thrown.
 */
const requestListedFeedResolve = async (
  context: MobileAuthRequestContext,
  feedGuid: string,
  sleep: (ms: number) => Promise<unknown>,
  remainingMs: () => number
): Promise<ListedFeedResolveAction | null> => {
  while (remainingMs() > 0) {
    try {
      const answer = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
        apiRequestService.reqAccountAddByRSSRemoteItemResolve({
          feed_guid: feedGuid,
          feed_url: null,
        })
      );
      return decideListedFeedResolve(answer, createUuid);
    } catch (error) {
      const waitMs = getRateLimitRetryAfterMs(error);
      if (waitMs !== null) {
        if (waitMs >= remainingMs()) {
          return null;
        }
        await sleep(waitMs);
        continue;
      }
      const status = getErrorResponseStatus(error);
      if (status === 400) {
        return { kind: 'no_match' };
      }
      if (status !== undefined) {
        return null;
      }
      throw error;
    }
  }
  return null;
};

/** Fill artwork for directory listings not checked yet, one read per directory channel. */
const fillDirectoryListingArtwork = async (
  context: MobileAuthRequestContext,
  listings: readonly AddByRssListedFeedRecord[],
  shouldStop: () => boolean
): Promise<void> => {
  const channelIdTexts = new Set<string>();
  for (const listing of listings) {
    if (listing.kind === 'directory' && listing.channelIdText !== null && !listing.artworkChecked) {
      channelIdTexts.add(listing.channelIdText);
    }
  }
  const readArtwork = async (channelIdText: string): Promise<string | null | undefined> => {
    try {
      const channel = await playbackContentRepository.getChannelById(context, channelIdText);
      return primaryChannelListArtworkUrl(channel.channel_images) ?? null;
    } catch {
      return undefined;
    }
  };

  let changed = false;
  for (const channelIdText of channelIdTexts) {
    if (shouldStop()) {
      break;
    }
    const imageUrl = await readArtwork(channelIdText);
    if (imageUrl === undefined) {
      continue;
    }
    await getDb()
      .update(schema.addByRssListedFeed)
      .set({ artworkChecked: 1, imageUrl })
      .where(
        and(
          eq(schema.addByRssListedFeed.kind, 'directory'),
          eq(schema.addByRssListedFeed.channelIdText, channelIdText)
        )
      );
    changed = true;
  }
  if (changed) {
    await afterArtistRelationsChanged();
  }
};

/**
 * Store an interactive parse result, wherever the parse ran. A feed already on the device keeps its
 * stored episodes when the parse yields none; a new feed is written either way so the add lands.
 * `followed` is written only when set.
 */
const storeInteractiveParseResult = async (
  context: MobileAuthRequestContext,
  feedUrl: string,
  credentials: AddByRssCredentials | null,
  result: AddByRssPollResult,
  options?: { followed?: boolean }
): Promise<void> => {
  const existingFeed = await addByRssRepository.getFeedByUrl(feedUrl);
  const previousPublisherState =
    result.mappedFeed === null ? null : await addByRssRepository.getPublisherState(feedUrl);
  const credentialStatus = resolveAddByRssCredentialStatus({
    credentialsState: result.credentialsState,
    current: credentials !== null || existingFeed?.requiresCredentials === true,
    failureReason: result.failureReason,
    status: result.status,
  });
  const record = buildAddByRssFeedRecord(feedUrl, existingFeed ?? undefined, result.preview);
  await addByRssRepository.upsertFeed(
    {
      ...record,
      ...(credentials !== null ? { requiresCredentials: true } : {}),
      ...credentialStatus,
      ...(options?.followed !== undefined ? { followed: options.followed } : {}),
    },
    existingFeed === null ? result.mappedFeed : (result.mappedFeed ?? undefined)
  );
  if (result.mappedFeed !== null) {
    await storeArtistRelations(context, feedUrl, result, previousPublisherState);
  }
};

export type AddByRssFeedsByCredentials = {
  needsCredentials: AddByRssNeedsCredentialsFeed<MobileAddByRSSFeedRecord>[];
  ready: MobileAddByRSSFeedRecord[];
};

/**
 * Add-by-RSS feed repository — the source of truth for the mobile RSS list and add-by-RSS playback.
 *
 * Reads SQLite first so the list works offline. Each feed is stored **whole**, as the last
 * successful `@podverse/parser-mapping` compat bundle: the user chose the feed explicitly and there
 * is no server-side pagination behind it, so there is no window to enforce the way there is for
 * directory channels in `channelItemsRepository`.
 *
 * The interactive add/follow/unfollow calls stay in the hooks that orchestrate those flows. Keeping
 * a followed feed current is background reconciliation rather than a user action, so it lives here
 * where the sync queue can reach it (see mobile-data-layer skill).
 */
export const addByRssRepository = {
  /**
   * The followed Add by RSS feeds this session shows, most-recently-updated first
   * (offline-capable list). Feeds held only because an Add by RSS artist lists them are left out,
   * and so, while someone is signed in, are feeds the signed-out user followed.
   */
  listFeeds: async (): Promise<MobileAddByRSSFeedRecord[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.addByRssFeed)
      .where(and(eq(schema.addByRssFeed.followed, 1), await sessionVisibleFeedsCondition()))
      .orderBy(desc(schema.addByRssFeed.updatedAt));

    return rows.map(rowToRecord);
  },

  /** Every stored feed, followed or listed-only, most-recently-updated first. */
  listAllFeeds: async (): Promise<MobileAddByRSSFeedRecord[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.addByRssFeed)
      .orderBy(desc(schema.addByRssFeed.updatedAt));

    return rows.map(rowToRecord);
  },

  /**
   * Every Add by RSS row this session lists (followed or listed-only) with its guid columns. No
   * bundles.
   */
  listFeedsWithRefs: async (): Promise<AddByRssFeedWithRefs[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select(feedColumnsWithoutBundle())
      .from(schema.addByRssFeed)
      .where(await sessionVisibleFeedsCondition())
      .orderBy(desc(schema.addByRssFeed.updatedAt));

    return rows.map((row) => ({
      feed: rowToRecord(row),
      podcastGuid: row.podcastGuid,
      publisherGuids: parseStoredPublisherGuids(row.publisherGuidsJson),
    }));
  },

  /**
   * Feeds split into the normal list and the needs-credentials section. A feed lands in the
   * section when it needs Basic Auth and this device holds no credentials for the signed-in
   * account, or when the last parse rejected the ones it holds.
   */
  listFeedsByCredentials: async (): Promise<AddByRssFeedsByCredentials> => {
    const [feeds, feedUrlsWithCredentials] = await Promise.all([
      addByRssRepository.listFeeds(),
      addByRssCredentialStore.listFeedUrlsForCurrentAccount(),
    ]);
    return partitionAddByRssFeedsByCredentials(feeds, feedUrlsWithCredentials);
  },

  getFeedByUrl: async (feedUrl: string): Promise<MobileAddByRSSFeedRecord | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
      .limit(1);

    const row = rows[0];
    return row === undefined ? null : rowToRecord(row);
  },

  getFeedByIdText: async (idText: string): Promise<MobileAddByRSSFeedRecord | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.idText, idText))
      .limit(1);

    const row = rows[0];
    return row === undefined ? null : rowToRecord(row);
  },

  /** Read the last-parsed compat bundle for a feed (for full-resource-data playback). */
  getMappedFeedByUrl: async (feedUrl: string): Promise<AddByRSSMappedFeed | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ mappedFeedJson: schema.addByRssFeed.mappedFeedJson })
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
      .limit(1);

    const raw = rows[0]?.mappedFeedJson ?? null;
    return raw === null ? null : safeJsonParse<AddByRSSMappedFeed>(raw);
  },

  /**
   * Followed feed URLs this session shows that already have a parsed bundle stored, for
   * parse-status display.
   */
  listParsedFeedUrls: async (): Promise<string[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ feedUrl: schema.addByRssFeed.feedUrl })
      .from(schema.addByRssFeed)
      .where(
        and(
          isNotNull(schema.addByRssFeed.mappedFeedJson),
          eq(schema.addByRssFeed.followed, 1),
          await sessionVisibleFeedsCondition()
        )
      );

    return rows.map((row) => row.feedUrl);
  },

  /**
   * Upsert a feed record. When `mappedFeed` is provided (a fresh successful parse) its bundle is
   * persisted; when omitted (e.g. a followed-list merge), the existing `mapped_feed_json` is left
   * untouched so the parsed bundle is preserved.
   *
   * `latest_item_pub_date_ms` follows the bundle for the same reason: both are derived from a parse,
   * and a followed-list merge that wrote a null over a known date would drop a followed feed to the
   * bottom of a recency-ordered list until the next parse landed. The feed's live status is derived
   * at the same moment and for the same reason — reading it when the list is drawn would mean
   * deserializing a whole feed per row. The livestreams flag is derived at the same moment and is
   * never cleared. The resource type is derived from that same bundle with
   * `getAddByRSSResourceTypeFromMappedFeed`, the helper web uses after a parse. The feed's
   * `podcast:guid` and publisher guids come from the same bundle.
   *
   * `followed` is written only when the record sets it: an update without it keeps the stored
   * value, and an insert without it is a follow. A listed-only feed gets no auto-download rule.
   * A write that follows the feed also records who follows it, the signed-out user or the
   * signed-in account, and when the follow started.
   */
  upsertFeed: async (
    record: MobileAddByRSSFeedRecord,
    mappedFeed?: AddByRSSMappedFeed | null
  ): Promise<void> => {
    await initializeDatabase();

    const existingRows = await getDb()
      .select({
        feedUrl: schema.addByRssFeed.feedUrl,
        followed: schema.addByRssFeed.followed,
        mayHaveLivestreams: schema.addByRssFeed.mayHaveLivestreams,
      })
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, record.feedUrl))
      .limit(1);
    const isNewFeed = existingRows.length === 0;
    const seedsAutoDownload = isNewFeed && record.followed !== false;
    const followsFeed = record.followed === true || (isNewFeed && record.followed === undefined);
    const ownershipValues: { followedAt?: number; signedOutOwned?: 0 | 1 } = followsFeed
      ? addByRssFollowOwnershipValues({
          isNewFeed,
          isSignedIn: await isSignedInSession(),
          nowMs: Date.now(),
          wasFollowed: existingRows[0]?.followed === 1,
        })
      : {};

    const baseValues = {
      feedUrl: record.feedUrl,
      id: record.id,
      idText: record.idText,
      resourceType: record.resourceType,
      title: record.title,
      imageUrl: record.imageUrl,
      enclosureUrl: record.enclosureUrl,
      playbackPosition: record.playbackPosition,
      updatedAt: record.updatedAt,
      ...credentialColumnValues(record),
      ...(record.followed !== undefined ? { followed: record.followed ? 1 : 0 } : {}),
      ...ownershipValues,
    };

    if (mappedFeed !== undefined) {
      const parsedValues = {
        latestItemPubDateMs: record.latestItemPubDateMs,
        mappedFeedJson: mappedFeed === null ? null : JSON.stringify(mappedFeed),
        resourceType:
          mappedFeed === null
            ? record.resourceType
            : getAddByRSSResourceTypeFromMappedFeed(mappedFeed),
        mayHaveLivestreams: addByRSSFeedMayHaveLivestreams(
          existingRows[0]?.mayHaveLivestreams === 1,
          mappedFeed
        )
          ? 1
          : 0,
        ...(mappedFeed !== null ? publisherRefColumnsFromMappedFeed(mappedFeed) : {}),
      };
      await getDb()
        .insert(schema.addByRssFeed)
        .values({ ...baseValues, ...parsedValues })
        .onConflictDoUpdate({
          target: schema.addByRssFeed.feedUrl,
          set: { ...baseValues, ...parsedValues },
        });
      await channelLiveStatusRepository.setFromAddByRssBundle(record.feedUrl, mappedFeed);
      if (seedsAutoDownload) {
        seedAutoDownloadRule(record.feedUrl);
      }
      if (mappedFeed !== null || record.followed !== undefined) {
        await afterArtistRelationsChanged();
      }
      return;
    }

    await getDb()
      .insert(schema.addByRssFeed)
      .values({
        ...baseValues,
        latestItemPubDateMs: record.latestItemPubDateMs,
        mappedFeedJson: null,
      })
      .onConflictDoUpdate({
        target: schema.addByRssFeed.feedUrl,
        set: baseValues,
      });
    if (seedsAutoDownload) {
      seedAutoDownloadRule(record.feedUrl);
    }
    if (record.followed !== undefined) {
      await afterArtistRelationsChanged();
    }
  },

  /**
   * Mark a stored feed as followed or listed-only. Following it seeds its auto-download rule the
   * way a new follow does, and records who follows it, the signed-out user or the signed-in
   * account, and when the follow started.
   */
  setFollowed: async (feedUrl: string, followed: boolean): Promise<void> => {
    await initializeDatabase();
    if (followed) {
      const rows = await getDb()
        .select({ followed: schema.addByRssFeed.followed })
        .from(schema.addByRssFeed)
        .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
        .limit(1);
      await getDb()
        .update(schema.addByRssFeed)
        .set({
          followed: 1,
          ...addByRssFollowOwnershipValues({
            isNewFeed: false,
            isSignedIn: await isSignedInSession(),
            nowMs: Date.now(),
            wasFollowed: rows[0]?.followed === 1,
          }),
        })
        .where(eq(schema.addByRssFeed.feedUrl, feedUrl));
      seedAutoDownloadRule(feedUrl);
    } else {
      await getDb()
        .update(schema.addByRssFeed)
        .set({ followed: 0 })
        .where(eq(schema.addByRssFeed.feedUrl, feedUrl));
    }
    await afterArtistRelationsChanged();
  },

  /** Store the directory channels this feed's publisher guids resolved to. */
  setPublisherDirectoryMatches: async (
    feedUrl: string,
    matches: AddByRssDirectoryPublisherMatch[]
  ): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .update(schema.addByRssFeed)
      .set({ publisherDirectoryJson: JSON.stringify(matches) })
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl));
    await afterArtistRelationsChanged();
  },

  /**
   * The feed's stored publisher guids, and the directory matches last looked up for them (null
   * when never looked up). Null when no row has this URL.
   */
  getPublisherState: async (
    feedUrl: string
  ): Promise<{
    publisherGuids: string[];
    directoryMatches: AddByRssDirectoryPublisherMatch[] | null;
  } | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({
        publisherDirectoryJson: schema.addByRssFeed.publisherDirectoryJson,
        publisherGuidsJson: schema.addByRssFeed.publisherGuidsJson,
      })
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    return {
      publisherGuids: parseStoredPublisherGuids(row.publisherGuidsJson),
      directoryMatches:
        row.publisherDirectoryJson === null
          ? null
          : parseStoredPublisherDirectoryMatches(row.publisherDirectoryJson),
    };
  },

  /** What one Add by RSS artist lists, in its feed order. */
  listListedFeeds: async (publisherFeedUrl: string): Promise<AddByRssListedFeedRecord[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.addByRssListedFeed)
      .where(eq(schema.addByRssListedFeed.publisherFeedUrl, publisherFeedUrl))
      .orderBy(asc(schema.addByRssListedFeed.position));
    return rows.map(rowToListedFeedRecord);
  },

  /** What every Add by RSS artist on this device lists. */
  listAllListedFeeds: async (): Promise<AddByRssListedFeedRecord[]> => {
    await initializeDatabase();
    return readAllListedFeeds();
  },

  /**
   * Replace one artist's listings with the list its latest parse returned. The server sends the
   * whole list on every parse, so nothing is merged; directory artwork for an unchanged entry
   * carries over. Listed-only feeds the new list no longer names are removed.
   */
  replaceListedFeeds: async (
    publisherFeedUrl: string,
    listed: readonly AddByRSSPublisherListedFeed[]
  ): Promise<void> => {
    await initializeDatabase();
    await getDb().transaction(async (transaction) => {
      const existingRows = await transaction
        .select()
        .from(schema.addByRssListedFeed)
        .where(eq(schema.addByRssListedFeed.publisherFeedUrl, publisherFeedUrl));
      await transaction
        .delete(schema.addByRssListedFeed)
        .where(eq(schema.addByRssListedFeed.publisherFeedUrl, publisherFeedUrl));
      const inserts = toListedFeedInserts(
        publisherFeedUrl,
        listed,
        existingRows.map(rowToListedFeedRecord)
      );
      for (let index = 0; index < inserts.length; index += LISTED_FEED_INSERT_CHUNK_SIZE) {
        await transaction
          .insert(schema.addByRssListedFeed)
          .values(inserts.slice(index, index + LISTED_FEED_INSERT_CHUNK_SIZE));
      }
    });
    await pruneListedOnlyFeeds();
    await afterArtistRelationsChanged();
  },

  /** Set or clear the parse request a listed feed waits on. */
  setListedFeedPending: async (
    publisherFeedUrl: string,
    feedGuid: string,
    requestId: string | null
  ): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .update(schema.addByRssListedFeed)
      .set({ pendingRequestId: requestId })
      .where(
        and(
          eq(schema.addByRssListedFeed.publisherFeedUrl, publisherFeedUrl),
          eq(schema.addByRssListedFeed.feedGuid, feedGuid.trim().toLowerCase())
        )
      );
    await afterArtistRelationsChanged();
  },

  /** Store a directory listing's artwork (null when the channel has none) and mark it checked. */
  setListedFeedArtwork: async (
    publisherFeedUrl: string,
    feedGuid: string,
    imageUrl: string | null
  ): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .update(schema.addByRssListedFeed)
      .set({ artworkChecked: 1, imageUrl })
      .where(
        and(
          eq(schema.addByRssListedFeed.publisherFeedUrl, publisherFeedUrl),
          eq(schema.addByRssListedFeed.feedGuid, feedGuid.trim().toLowerCase())
        )
      );
    await afterArtistRelationsChanged();
  },

  /** Record what a parse said about credentials without touching the rest of the row. */
  setCredentialStatus: async (feedUrl: string, status: AddByRssCredentialStatus): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .update(schema.addByRssFeed)
      .set(credentialColumnValues(status))
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl));
  },

  /** Feed URLs this session hides: none signed out; signed in, the signed-out user's follows. */
  listHiddenFeedUrls: async (): Promise<Set<string>> => {
    await initializeDatabase();
    if (!(await isSignedInSession())) {
      return new Set();
    }
    const rows = await getDb()
      .select({ feedUrl: schema.addByRssFeed.feedUrl })
      .from(schema.addByRssFeed)
      .where(and(eq(schema.addByRssFeed.followed, 1), eq(schema.addByRssFeed.signedOutOwned, 1)));
    return new Set(rows.map((row) => row.feedUrl));
  },

  /** Whether this session leaves the stored row for this URL out of its lists. */
  isFeedHiddenInSession: async (feedUrl: string): Promise<boolean> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({
        followed: schema.addByRssFeed.followed,
        signedOutOwned: schema.addByRssFeed.signedOutOwned,
      })
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      return false;
    }
    return isAddByRssFeedHiddenInSession({
      followed: row.followed === 1,
      isSignedIn: await isSignedInSession(),
      signedOutOwned: row.signedOutOwned === 1,
    });
  },

  /**
   * The signed-out user's followed feeds, oldest follow first. Signed out, that is every followed
   * row, because everything a signed-out session lists is the signed-out user's. Signed in, it is
   * the followed rows the signed-out user owns. Rows followed before follow times were recorded
   * sort first, in insert order. No bundles.
   */
  listSignedOutFollowedFeeds: async (): Promise<
    {
      feedUrl: string;
      followedAtMs: number | null;
      requiresCredentials: boolean;
      title: string | null;
    }[]
  > => {
    await initializeDatabase();
    const isSignedIn = await isSignedInSession();
    const rows = await getDb()
      .select({
        feedUrl: schema.addByRssFeed.feedUrl,
        followedAt: schema.addByRssFeed.followedAt,
        requiresCredentials: schema.addByRssFeed.requiresCredentials,
        title: schema.addByRssFeed.title,
      })
      .from(schema.addByRssFeed)
      .where(
        and(
          eq(schema.addByRssFeed.followed, 1),
          isSignedIn ? eq(schema.addByRssFeed.signedOutOwned, 1) : undefined
        )
      )
      .orderBy(asc(schema.addByRssFeed.followedAt), asc(sql`rowid`));
    return rows.map((row) => ({
      feedUrl: row.feedUrl,
      followedAtMs: row.followedAt,
      requiresCredentials: row.requiresCredentials === 1,
      title: row.title,
    }));
  },

  /** Every followed feed on the phone, oldest follow first, with who owns it. */
  listFollowedOwnership: async (): Promise<
    { feedUrl: string; followedAtMs: number | null; signedOutOwned: boolean }[]
  > => {
    await initializeDatabase();
    const rows = await getDb()
      .select({
        feedUrl: schema.addByRssFeed.feedUrl,
        followedAt: schema.addByRssFeed.followedAt,
        signedOutOwned: schema.addByRssFeed.signedOutOwned,
      })
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.followed, 1))
      .orderBy(asc(schema.addByRssFeed.followedAt), asc(sql`rowid`));
    return rows.map((row) => ({
      feedUrl: row.feedUrl,
      followedAtMs: row.followedAt,
      signedOutOwned: row.signedOutOwned === 1,
    }));
  },

  /** Set or clear the signed-out ownership flag on these feeds. */
  setSignedOutOwned: async (
    feedUrls: readonly string[],
    signedOutOwned: boolean
  ): Promise<void> => {
    await initializeDatabase();
    if (feedUrls.length === 0) {
      return;
    }
    for (let index = 0; index < feedUrls.length; index += LISTED_FEED_INSERT_CHUNK_SIZE) {
      await getDb()
        .update(schema.addByRssFeed)
        .set({ signedOutOwned: signedOutOwned ? 1 : 0 })
        .where(
          inArray(
            schema.addByRssFeed.feedUrl,
            feedUrls.slice(index, index + LISTED_FEED_INSERT_CHUNK_SIZE)
          )
        );
    }
    await afterArtistRelationsChanged();
  },

  /** What a device fetch of this feed needs to know. Null when no row has this URL. */
  getDeviceFetchState: async (
    feedUrl: string
  ): Promise<{
    cache: AddByRssDeviceCache | null;
    checkedAtMs: number | null;
    followed: boolean;
    requiresCredentials: boolean;
  } | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({
        deviceCheckedAt: schema.addByRssFeed.deviceCheckedAt,
        deviceEtag: schema.addByRssFeed.deviceEtag,
        deviceFeedHash: schema.addByRssFeed.deviceFeedHash,
        deviceLastModified: schema.addByRssFeed.deviceLastModified,
        followed: schema.addByRssFeed.followed,
        hasBundle: sql<number>`${schema.addByRssFeed.mappedFeedJson} IS NOT NULL`,
        requiresCredentials: schema.addByRssFeed.requiresCredentials,
      })
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    return {
      cache: deviceCacheForFetch({
        deviceEtag: row.deviceEtag,
        deviceFeedHash: row.deviceFeedHash,
        deviceLastModified: row.deviceLastModified,
        hasBundle: row.hasBundle === 1,
      }),
      checkedAtMs: row.deviceCheckedAt,
      followed: row.followed === 1,
      requiresCredentials: row.requiresCredentials === 1,
    };
  },

  /**
   * Record a completed device fetch. `cache` as an object replaces the stored cache, `null`
   * clears it, and leaving it out keeps it.
   */
  setDeviceFetchState: async (
    feedUrl: string,
    state: { cache?: AddByRssDeviceCache | null; checkedAtMs: number }
  ): Promise<void> => {
    await initializeDatabase();
    const cacheValues =
      state.cache === undefined
        ? {}
        : {
            deviceEtag: state.cache?.etag ?? null,
            deviceFeedHash: state.cache?.feedHash ?? null,
            deviceLastModified: state.cache?.lastModified ?? null,
          };
    await getDb()
      .update(schema.addByRssFeed)
      .set({ deviceCheckedAt: state.checkedAtMs, ...cacheValues })
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl));
  },

  /** The followed feeds this session shows, with what a device refresh decides from. */
  listDeviceRefreshEntries: async (): Promise<AddByRssDeviceRefreshEntry[]> => {
    await initializeDatabase();
    const [feeds, checkedRows, feedUrlsWithCredentials] = await Promise.all([
      addByRssRepository.listFeeds(),
      getDb()
        .select({
          deviceCheckedAt: schema.addByRssFeed.deviceCheckedAt,
          feedUrl: schema.addByRssFeed.feedUrl,
        })
        .from(schema.addByRssFeed)
        .where(eq(schema.addByRssFeed.followed, 1)),
      addByRssCredentialStore.listFeedUrlsForCurrentAccount(),
    ]);
    const checkedAtByUrl = new Map(checkedRows.map((row) => [row.feedUrl, row.deviceCheckedAt]));
    return feeds.map((feed) => ({
      checkedAtMs: checkedAtByUrl.get(feed.feedUrl) ?? null,
      feedUrl: feed.feedUrl,
      hasCredentials: feedUrlsWithCredentials.has(toAddByRssCredentialFeedUrl(feed.feedUrl)),
      requiresCredentials: feed.requiresCredentials === true,
    }));
  },

  /** The feeds a device refresh at this priority fetches now. */
  listDeviceRefreshFeedUrls: async (params: {
    nowMs: number;
    priority: SyncJobPriority;
  }): Promise<string[]> =>
    selectDeviceRefreshFeedUrls({
      entries: await addByRssRepository.listDeviceRefreshEntries(),
      ...params,
    }),

  /**
   * Move `user:pass@` out of stored feed URLs and into SecureStore. Rows only carry userinfo when
   * they were added before credentials moved to the device, so once rewritten the scan finds
   * nothing and costs one small read. The account's follow row already uses the clean URL.
   */
  splitStoredUserinfo: async (accountIdText: string): Promise<void> => {
    const feeds = await addByRssRepository.listFeeds();
    for (const feed of feeds) {
      const split = splitAddByRssPastedUrl(feed.feedUrl);
      if (split === null) {
        continue;
      }
      const cleanUrl = toAddByRssCredentialFeedUrl(split.feedUrl);
      if (split.credentials !== null) {
        await addByRssCredentialStore.set(accountIdText, cleanUrl, split.credentials);
      }

      const existingClean = await addByRssRepository.getFeedByUrl(cleanUrl);
      if (existingClean === null) {
        await getDb()
          .update(schema.addByRssFeed)
          .set({ feedUrl: cleanUrl, requiresCredentials: 1 })
          .where(eq(schema.addByRssFeed.feedUrl, feed.feedUrl));
      } else {
        await getDb()
          .delete(schema.addByRssFeed)
          .where(eq(schema.addByRssFeed.feedUrl, feed.feedUrl));
        await addByRssRepository.setCredentialStatus(cleanUrl, {
          lastAuthFailure: existingClean.lastAuthFailure ?? null,
          requiresCredentials: true,
        });
      }
    }
  },

  /**
   * Ask the server to re-parse every feed the account follows, and return a ticket per feed.
   *
   * One request rather than one per feed: the endpoint fans out server-side and dedupes feeds it
   * parsed recently, so a device that foregrounds often does not repeatedly ask for the same work.
   * Feeds the server deduped come back with no ticket and are simply left as they are.
   *
   * Credentials this device holds for the account ride along in `credentials_by_url`; the API seals
   * them for the worker and never stores them. A feed that needs credentials this device lacks
   * gets no ticket back to poll: the server skips it, and the needs-credentials section already
   * says why.
   *
   * The caller is responsible for checking that the account may refresh at all — a lapsed
   * membership keeps its feeds readable and playable, and only stops them updating.
   */
  requestRefreshAll: async (
    context: MobileAuthRequestContext,
    accountIdText: string
  ): Promise<AddByRssRefreshTicket[]> => {
    const [credentials, feeds] = await Promise.all([
      addByRssCredentialStore.readAllForAccount(accountIdText),
      addByRssRepository.listFeeds(),
    ]);
    const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.apiRequest<ParseAllResponse>({
        path: '/account/add-by-rss/parse/all',
        method: 'POST',
        config: {
          withCredentials: true,
        },
        data: credentials.size > 0 ? { credentials_by_url: toCredentialsByUrl(credentials) } : {},
      })
    );

    const feedsByUrl = new Map(feeds.map((feed) => [feed.feedUrl, feed]));
    return response.request_ids
      .filter((entry) => {
        const feed = feedsByUrl.get(entry.feed_url);
        if (feed === undefined || feed.requiresCredentials !== true) {
          return true;
        }
        return credentials.has(toAddByRssCredentialFeedUrl(entry.feed_url));
      })
      .map((entry) => ({
        feedUrl: entry.feed_url,
        requestId: entry.request_id,
      }));
  },

  /**
   * Parse one feed now and store what came back: the interactive add, and save-and-check on the
   * credentials screen. Credentials go only in this request body, which the API seals for the
   * worker; they are never part of the follow.
   *
   * A feed already on the device keeps its stored episodes when this parse yields none, the same
   * rule a background refresh follows. A new feed is written either way so the add lands.
   *
   * `followed` is written only when set: the add flow follows, while a credentials check or feed
   * check leaves a listed-only album listed-only.
   */
  parseNow: async (
    context: MobileAuthRequestContext,
    feedUrl: string,
    credentials: AddByRssCredentials | null,
    options?: { followed?: boolean }
  ): Promise<{ requestId: string; result: AddByRssPollResult }> => {
    const parseRequestId = await enqueueParseRequest(context, feedUrl, credentials);

    const result = await pollAddByRssParseStatus(parseRequestId, async (requestId) =>
      readParseStatus(context, requestId)
    );

    await storeInteractiveParseResult(context, feedUrl, credentials, result, options);

    return { requestId: parseRequestId, result };
  },

  /**
   * The device counterpart of `parseNow`, for a signed-out device: this device fetches and parses
   * the feed and stores the result through the same write. A follow it writes is stamped as the
   * signed-out user's by `upsertFeed`. No Podverse API request is made for the feed itself, and
   * credentials go only to the feed host. `context` is still needed for the public directory
   * lookups: an artist's listed albums, and an album's publisher pointers.
   *
   * Throws while Offline Mode is on and when `signal` aborts; a host that answered with an error,
   * or could not be reached, is a `failed` result.
   */
  parseNowOnDevice: async (
    context: MobileAuthRequestContext,
    feedUrl: string,
    credentials: AddByRssCredentials | null,
    options?: { followed?: boolean; signal?: AbortSignal }
  ): Promise<{ requestId: null; result: AddByRssPollResult }> => {
    const state = await addByRssRepository.getDeviceFetchState(feedUrl);
    const parsed = await parseAddByRssFeedOnDevice({
      conditionalCache: state?.cache ?? null,
      credentials,
      feedUrl,
      signal: options?.signal,
    });
    const { result, listingsResolved } = await withDeviceListedFeeds(context, feedUrl, parsed);

    await storeInteractiveParseResult(
      context,
      feedUrl,
      credentials,
      result,
      options?.followed !== undefined ? { followed: options.followed } : undefined
    );
    // After the write above, so a new feed already has its row.
    await addByRssRepository.setDeviceFetchState(feedUrl, {
      cache: listingsResolved ? deviceCacheToStore(result) : null,
      checkedAtMs: Date.now(),
    });

    return { requestId: null, result };
  },

  /**
   * The one interactive parse every screen calls. The path comes from
   * `resolveAddByRssParsePath`. The server path is never retried on the device.
   */
  parseNowByPath: async (
    context: MobileAuthRequestContext,
    feedUrl: string,
    credentials: AddByRssCredentials | null,
    options: { followed?: boolean; path: AddByRssParsePath }
  ): Promise<{ requestId: string | null; result: AddByRssPollResult }> => {
    const followedOption =
      options.followed !== undefined ? { followed: options.followed } : undefined;
    return options.path === 'device'
      ? addByRssRepository.parseNowOnDevice(context, feedUrl, credentials, followedOption)
      : addByRssRepository.parseNow(context, feedUrl, credentials, followedOption);
  },

  /**
   * Store a server follow this device has no row for, using that follow's title and image.
   * A listed-only row becomes followed, since the follow was made elsewhere; any other existing
   * row is left untouched. A later parse still fills episodes.
   */
  ensureLocalFeedFromFollow: async (
    context: MobileAuthRequestContext,
    feedUrl: string,
    accountIdText: string | null
  ): Promise<void> => {
    if (accountIdText === null || accountIdText.length === 0) {
      return;
    }
    const existing = await addByRssRepository.getFeedByUrl(feedUrl);
    if (existing !== null) {
      if (existing.followed === false) {
        await addByRssRepository.setFollowed(feedUrl, true);
      }
      return;
    }
    let follows: DTOAccountFollowingAddByRSSChannel[];
    try {
      follows = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
        apiRequestService.reqAccountGetFollowedAddByRSSChannels({
          account_id_text: accountIdText,
        })
      );
    } catch {
      return;
    }
    const follow = follows.find((entry) => entry.feed_url === feedUrl);
    if (follow === undefined) {
      return;
    }
    const again = await addByRssRepository.getFeedByUrl(feedUrl);
    const record = localFeedForServerFollow(follow, again);
    if (record === null) {
      return;
    }
    await addByRssRepository.upsertFeed(record);
  },

  /**
   * Poll one re-parse ticket and adopt the result.
   *
   * A parse that has not resolved yet, or resolved without a usable payload, leaves the stored
   * bundle untouched. Overwriting it with nothing would take a feed that reads and plays offline
   * today and leave the user with a title and no episodes, which is strictly worse than stale.
   * The failure is still recorded in the error log so a feed that silently stopped updating has
   * an explanation.
   *
   * Every ticket is a server follow, so the stored row is written as followed.
   */
  applyRefreshResult: async (
    context: MobileAuthRequestContext,
    ticket: AddByRssRefreshTicket,
    accountIdText: string | null
  ): Promise<boolean> => {
    const result = await pollAddByRssParseStatus(ticket.requestId, async (requestId) =>
      readParseStatus(context, requestId)
    );
    const { mappedFeed, preview } = result;
    let existingFeed = await addByRssRepository.getFeedByUrl(ticket.feedUrl);
    if (existingFeed === null) {
      await addByRssRepository.ensureLocalFeedFromFollow(context, ticket.feedUrl, accountIdText);
      existingFeed = await addByRssRepository.getFeedByUrl(ticket.feedUrl);
    }
    const credentialStatus = resolveAddByRssCredentialStatus({
      credentialsState: result.credentialsState,
      current: existingFeed?.requiresCredentials === true,
      failureReason: result.failureReason,
      status: result.status,
    });

    if (mappedFeed === null) {
      if (credentialStatus !== null && existingFeed !== null) {
        await addByRssRepository.setCredentialStatus(ticket.feedUrl, credentialStatus);
      }
      if (!isExpectedMissingCredentials(result)) {
        recordRefreshFailure(ticket, result, 'add-by-rss-parse');
      }
      return false;
    }

    const previousPublisherState = await addByRssRepository.getPublisherState(ticket.feedUrl);
    const record = buildAddByRssFeedRecord(ticket.feedUrl, existingFeed ?? undefined, preview);
    await addByRssRepository.upsertFeed(
      { ...record, ...credentialStatus, followed: true },
      mappedFeed
    );
    await storeArtistRelations(context, ticket.feedUrl, result, previousPublisherState);
    return true;
  },

  /**
   * Fetch and parse one followed feed on this device and adopt the result. Returns true when a new
   * bundle was stored. Only the signed-out device refresh calls it.
   *
   * Same keep-the-stored-bundle rule as `applyRefreshResult`: an unchanged feed, a failure, or a
   * payload that could not be read leaves the stored episodes as they are, and a failure is still
   * recorded in the error log. Listed-only rows are skipped, and so is a feed that needs
   * credentials this device does not hold.
   *
   * `followed` is not written: the row is already followed, and writing it would undo an unfollow
   * that landed while the fetch ran. That also leaves the row's signed-out ownership as it is.
   */
  refreshFeedOnDevice: async (
    context: MobileAuthRequestContext,
    feedUrl: string,
    options?: { signal?: AbortSignal }
  ): Promise<boolean> => {
    const state = await addByRssRepository.getDeviceFetchState(feedUrl);
    if (state === null || !state.followed) {
      return false;
    }
    const credentials = await addByRssCredentialStore.getForCurrentAccount(feedUrl);
    if (state.requiresCredentials && credentials === null) {
      return false;
    }

    const parsed = await parseAddByRssFeedOnDevice({
      conditionalCache: state.cache,
      credentials,
      feedUrl,
      signal: options?.signal,
    });
    const { result, listingsResolved } = await withDeviceListedFeeds(context, feedUrl, parsed);
    await addByRssRepository.setDeviceFetchState(feedUrl, {
      cache: listingsResolved ? deviceCacheToStore(result) : null,
      checkedAtMs: Date.now(),
    });

    const { mappedFeed, preview } = result;
    const existingFeed = await addByRssRepository.getFeedByUrl(feedUrl);
    // Removed while the fetch ran; an insert here would follow the feed again.
    if (existingFeed === null) {
      return false;
    }
    const credentialStatus = resolveAddByRssCredentialStatus({
      credentialsState: result.credentialsState,
      current: existingFeed.requiresCredentials === true,
      failureReason: result.failureReason,
      status: result.status,
    });

    if (mappedFeed === null) {
      if (credentialStatus !== null) {
        await addByRssRepository.setCredentialStatus(feedUrl, credentialStatus);
      }
      // An unchanged feed has no payload by design; its stored episodes are current.
      if (!isExpectedMissingCredentials(result) && result.status !== 'not_modified') {
        recordRefreshFailure({ feedUrl, requestId: null }, result, 'add-by-rss-device-parse');
      }
      return false;
    }

    const previousPublisherState = await addByRssRepository.getPublisherState(feedUrl);
    const record = buildAddByRssFeedRecord(feedUrl, existingFeed, preview);
    await addByRssRepository.upsertFeed({ ...record, ...credentialStatus }, mappedFeed);
    await storeArtistRelations(context, feedUrl, result, previousPublisherState);
    return true;
  },

  /**
   * True when a listed album this parse path handles waits on a parse, or a directory row lacks
   * checked artwork. Listings of artists this session hides are left out.
   */
  hasListedFeedWork: async (parsePath: AddByRssParsePath): Promise<boolean> => {
    const listings = await readWorkListings(parsePath);
    return listings.some(listedFeedNeedsWork);
  },

  /**
   * True when a guid-only listing is due for a directory resolve. Signed out only; a guid waiting
   * on its retry time does not count, so no empty job is queued for it.
   */
  hasListedFeedResolveWork: async (parsePath: AddByRssParsePath): Promise<boolean> =>
    parsePath === 'device' && (await listListedFeedResolveWork()).length > 0,

  /**
   * Fetch every pending album parse, store the results, and fill directory artwork.
   *
   * On the server path, one run reads each pending album's status once per round, for up to
   * `LISTED_FEED_POLL_ROUNDS` rounds, so the serial queue is never held for long by an artist with
   * many albums. An album still pending afterwards keeps its request id for the next run, and the
   * artist's next parse replaces it. An album this device holds credentials for is parsed with
   * them by its own request instead of the server's, which only sends an artist's credentials to
   * its own domain.
   *
   * On the device path, this device fetches and parses each pending album itself, once, within
   * `LISTED_FEED_WORK_BUDGET_MS`; the albums not reached keep their pending ids and are counted in
   * `deviceAlbumsLeft`.
   */
  runListedFeedWork: async (
    context: MobileAuthRequestContext,
    parsePath: AddByRssParsePath,
    sleep: (ms: number) => Promise<unknown>,
    signal?: AbortSignal
  ): Promise<{ deviceAlbumsLeft: number; deviceAlbumsStored: number }> => {
    const startedAt = Date.now();
    const shouldStop = () =>
      signal?.aborted === true || Date.now() - startedAt > LISTED_FEED_WORK_BUDGET_MS;
    const listings = await readWorkListings(parsePath);
    const albums = groupPendingListedAlbums(listings);
    let deviceOutcome = { deviceAlbumsLeft: 0, deviceAlbumsStored: 0 };

    if (parsePath === 'device') {
      deviceOutcome = await parseListedAlbumsOnDevice(context, albums, shouldStop, signal);
    } else {
      let pending: PendingListedAlbum[] = [];
      for (const album of albums) {
        pending.push(await withOwnAlbumParseRequest(context, album));
      }

      for (let round = 0; round < LISTED_FEED_POLL_ROUNDS && pending.length > 0; round += 1) {
        if (round > 0) {
          await sleep(LISTED_FEED_POLL_DELAY_MS);
        }
        const stillPending: PendingListedAlbum[] = [];
        for (const album of pending) {
          if (signal?.aborted === true) {
            return deviceOutcome;
          }
          if ((await settleListedAlbum(context, album)) === 'pending') {
            stillPending.push(album);
          }
        }
        pending = stillPending;
      }
    }

    await fillDirectoryListingArtwork(context, listings, shouldStop);
    return deviceOutcome;
  },

  /**
   * Ask the public directory resolve about each due guid-only listing, one guid at a time,
   * `LISTED_FEED_RESOLVE_SPACING_MS` apart and within `LISTED_FEED_RESOLVE_BUDGET_MS`. Each
   * settled answer is stored at once, so an open artist screen fills in as answers arrive. A guid
   * whose directory channel is not ready yet gets a retry time and counts as `deferred`; `left`
   * counts the guids this run did not reach.
   */
  runListedFeedResolveWork: async (
    context: MobileAuthRequestContext,
    sleep: (ms: number) => Promise<unknown>,
    signal?: AbortSignal
  ): Promise<{ applied: number; deferred: number; left: number }> => {
    const startedAt = Date.now();
    const remainingMs = () => LISTED_FEED_RESOLVE_BUDGET_MS - (Date.now() - startedAt);
    const groups = groupListedFeedResolveWork(await listListedFeedResolveWork());
    let applied = 0;
    let deferred = 0;

    for (const [index, group] of groups.entries()) {
      if (signal?.aborted === true || remainingMs() <= 0) {
        break;
      }
      if (index > 0) {
        await sleep(LISTED_FEED_RESOLVE_SPACING_MS);
      }
      const action = await requestListedFeedResolve(context, group.feedGuid, sleep, remainingMs);
      if (action === null) {
        break;
      }
      if (action.kind === 'retry_later') {
        listedFeedResolveRetries.set(
          group.feedGuid,
          nextListedFeedResolveRetry(listedFeedResolveRetries.get(group.feedGuid), Date.now())
        );
        deferred += 1;
        continue;
      }
      listedFeedResolveRetries.delete(group.feedGuid);
      await applyListedFeedResolve(group.keys, action);
      applied += 1;
    }

    return { applied, deferred, left: groups.length - applied - deferred };
  },

  /**
   * Ends this device's follow of a feed. A feed an Add by RSS artist on the device still lists
   * stays as listed-only; any other feed is removed.
   */
  unfollowFeed: async (feedUrl: string): Promise<'listed' | 'removed'> => {
    await initializeDatabase();
    const [feed, guidRows, listings] = await Promise.all([
      addByRssRepository.getFeedByUrl(feedUrl),
      getDb()
        .select({ podcastGuid: schema.addByRssFeed.podcastGuid })
        .from(schema.addByRssFeed)
        .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
        .limit(1),
      addByRssRepository.listAllListedFeeds(),
    ]);
    const podcastGuid = guidRows[0]?.podcastGuid ?? null;
    if (feed !== null && isFeedListed({ feedUrl, podcastGuid }, listings)) {
      await addByRssRepository.setFollowed(feedUrl, false);
      await autoDownloadRepository.removeChannel(feedUrl);
      return 'listed';
    }
    await addByRssRepository.removeFeed(feedUrl);
    return 'removed';
  },

  /**
   * Remove a feed from the device. When it is an artist, its listings go too, and so do the
   * listed-only albums no other artist on the device lists.
   */
  removeFeed: async (feedUrl: string): Promise<void> => {
    await initializeDatabase();
    await deleteStoredFeed(feedUrl);
    await getDb()
      .delete(schema.addByRssListedFeed)
      .where(eq(schema.addByRssListedFeed.publisherFeedUrl, feedUrl));
    await pruneListedOnlyFeeds();
    await afterArtistRelationsChanged();
  },

  /** Clear all feeds and listings (session reset / logout). */
  clear: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.addByRssFeed);
    await getDb().delete(schema.addByRssListedFeed);
    await afterArtistRelationsChanged();
  },
};
