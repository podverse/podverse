import type {
  AddByRSSParseStatus,
  AddByRSSPublisherListedFeed,
  DTOAccount,
  DTOChannelDirectoryMatch,
} from '@podverse/helpers';
import { createAddByRSSId, createAddByRSSIdText, sleep } from '@podverse/helpers';
import type { AddByRSSBasicAuthCredentials } from '@podverse/helpers-validation/client';
import {
  addByRSSFeedMayHaveLivestreams,
  convertParsedRSSFeedToCompat,
  getAddByRSSChannelMetadata,
} from '@podverse/parser-mapping';

import type { AddByRSSArtistFollowedAlbums } from '../../lib/artistUnsubscribe';
import { trackBackgroundActivity } from '../backgroundActivity/backgroundActivityStore';
import type { AddByRSSParseStatusResponse } from './api';
import {
  enqueueAddByRSSParse,
  followAddByRSSChannel,
  getAddByRSSParseStatus,
  unfollowAddByRSSChannel,
  unfollowAddByRSSFeedsBulk,
} from './api';
import { nextLocalRequiresCredentials } from './credentialsStatus';
import { deleteCredentials, getCredentials, setCredentials } from './credentialStore';
import { emitAddByRSSFeedChanged } from './feedChangedEvent';
import {
  assignListedLiveItemIdTexts,
  assignListedTrackIdTexts,
  normalizeAddByRSSGuid,
  pruneAddByRSSPublisherData,
  toAddByRSSComparableFeedUrl,
} from './listedFeeds';
import {
  claimAddByRSSParseInFlight,
  markAddByRSSParseInFlight,
  releaseAddByRSSParseInFlight,
} from './parseInFlight';
import {
  getAddByRSSFeedByUrl,
  getListedAddByRSSFeedByUrl,
  removeAddByRSSFeed,
  upsertAddByRSSFeed,
  upsertAddByRSSPublisherLink,
  upsertListedAddByRSSFeed,
} from './storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSListedFeedRecord,
  AddByRSSParsedFeed,
  AddByRSSResourceType,
} from './types';

const STATUS_POLL_DELAY_MS = 3000;
const STATUS_POLL_MAX_ATTEMPTS = 30;
const LISTED_POLL_CONCURRENCY = 4;

/** The parts of a parse status response beyond the feed itself. */
export type AddByRSSParseOutcome = Pick<
  AddByRSSParseStatusResponse,
  'failureReason' | 'credentialsState' | 'publisherListedFeeds'
>;

export type ApplyAddByRSSParseStatusParams = {
  feedUrl: string;
  parsedFeed: AddByRSSParsedFeed | undefined;
  status: AddByRSSParseStatus;
  cache?: AddByRSSFeedRecord['cache'];
  outcome?: AddByRSSParseOutcome;
  fallbackRecord?: AddByRSSFeedRecord | null;
  onUpdated?: (record: AddByRSSFeedRecord) => void;
};

type PollAddByRSSParseStatusParams = {
  requestId: string;
  onStatusUpdate: (response: AddByRSSParseStatusResponse) => Promise<void>;
};

/**
 * A credential-store failure must never block the feed operation around it; the feed then
 * behaves as if this browser had no credentials for it.
 */
const readStoredCredentials = async (
  accountId: string,
  feedUrl: string
): Promise<AddByRSSBasicAuthCredentials | null> => {
  try {
    return await getCredentials(accountId, feedUrl);
  } catch (error) {
    console.error('Could not read add-by-RSS credentials on this browser', error);
    return null;
  }
};

const storeCredentials = async (
  accountId: string,
  feedUrl: string,
  credentials: AddByRSSBasicAuthCredentials
): Promise<boolean> => {
  try {
    return await setCredentials(accountId, feedUrl, credentials);
  } catch (error) {
    console.error('Could not save add-by-RSS credentials on this browser', error);
    return false;
  }
};

/** Removes one followed Add by RSS feed and its credentials on this browser. */
const clearLocalAddByRSSFollow = async (params: {
  accountId: string;
  feedUrl: string;
  channelIdText: string;
}): Promise<void> => {
  await removeAddByRSSFeed(params.channelIdText);
  try {
    await deleteCredentials(params.accountId, params.feedUrl);
  } catch (error) {
    console.error('Could not delete add-by-RSS credentials on this browser', error);
  }
};

export const unfollowAddByRSSChannelAndClear = async (params: {
  accountId: string;
  feedUrl: string;
  channelIdText: string;
}): Promise<DTOAccount> => {
  const account = await unfollowAddByRSSChannel(params.feedUrl);
  await clearLocalAddByRSSFollow(params);
  try {
    await pruneAddByRSSPublisherData();
  } catch (error) {
    console.error('Could not remove the albums only this Add by RSS artist listed', error);
  }
  return account;
};

/** Ends the artist's follow and the given album follows in one request, then clears them here. */
export const unfollowAddByRSSArtistAndAlbums = async (params: {
  accountId: string;
  artist: { feedUrl: string; idText: string };
  albums: AddByRSSArtistFollowedAlbums;
}): Promise<DTOAccount> => {
  const account = await unfollowAddByRSSFeedsBulk({
    feedUrls: [params.artist.feedUrl, ...params.albums.addByRSSFeeds.map((feed) => feed.feedUrl)],
    channelIdTexts: params.albums.directoryChannelIdTexts,
  });
  await clearLocalAddByRSSFollow({
    accountId: params.accountId,
    feedUrl: params.artist.feedUrl,
    channelIdText: params.artist.idText,
  });
  for (const album of params.albums.addByRSSFeeds) {
    await clearLocalAddByRSSFollow({
      accountId: params.accountId,
      feedUrl: album.feedUrl,
      channelIdText: album.idText,
    });
  }
  try {
    await pruneAddByRSSPublisherData();
  } catch (error) {
    console.error('Could not remove the albums only this Add by RSS artist listed', error);
  }
  return account;
};

/** Enqueues a single-feed parse, attaching this browser's credentials for the feed when it has any. */
export const enqueueAddByRSSParseWithStoredCredentials = async (params: {
  accountId: string;
  feedUrl: string;
  cache?: AddByRSSFeedRecord['cache'];
}): Promise<{ request_id: string }> => {
  const credentials = await readStoredCredentials(params.accountId, params.feedUrl);
  return enqueueAddByRSSParse({ feedUrl: params.feedUrl, cache: params.cache, credentials });
};

export type FollowAddByRSSResult =
  | { kind: 'directory'; channel: DTOChannelDirectoryMatch; account: DTOAccount }
  | { kind: 'add_by_rss'; requestId: string; record: AddByRSSFeedRecord; account: DTOAccount };

/**
 * Follows a feed and queues its first parse. Credentials (explicit, else already stored on this
 * browser) are saved locally and sent only in the parse body; the follow carries just the flag.
 * A `seedRecord` (a listed album) gives the followed record its id, idText, and parsed feed, so
 * the album keeps its URL and shows its tracks while the follow's parse runs.
 * A directory match subscribes to that channel and leaves no Add by RSS record or parse.
 */
export const followAddByRSSChannelAndQueue = async (params: {
  accountId: string;
  feedUrl: string;
  resourceType: AddByRSSResourceType;
  title?: string | null;
  imageUrl?: string | null;
  credentials?: AddByRSSBasicAuthCredentials | null;
  seedRecord?: AddByRSSFeedRecord | null;
}): Promise<FollowAddByRSSResult> => {
  const credentials =
    params.credentials ?? (await readStoredCredentials(params.accountId, params.feedUrl));

  const followed = await followAddByRSSChannel({
    feedUrl: params.feedUrl,
    title: params.title ?? null,
    imageUrl: params.imageUrl ?? null,
    ...(credentials ? { requiresCredentials: true } : {}),
  });
  const account = followed.account;

  if (followed.directory_channel) {
    const existing = await getAddByRSSFeedByUrl(params.feedUrl);
    if (existing) {
      await removeAddByRSSFeed(existing.idText);
      emitAddByRSSFeedChanged(existing.feedUrl);
    }
    return { kind: 'directory', channel: followed.directory_channel, account };
  }

  if (params.credentials) {
    await storeCredentials(params.accountId, params.feedUrl, params.credentials);
  }

  const seed = params.seedRecord ?? null;
  const updatedAt = new Date().toISOString();
  const idText = createAddByRSSIdText();
  const record: AddByRSSFeedRecord = seed
    ? {
        id: seed.id,
        idText: seed.idText,
        resourceType: params.resourceType,
        feedUrl: params.feedUrl,
        title: seed.title,
        imageUrl: seed.imageUrl,
        mappedFeed: seed.mappedFeed,
        cache: seed.cache,
        lastParsedAt: seed.lastParsedAt,
        mayHaveLivestreams: seed.mayHaveLivestreams,
        status: 'queued',
        updatedAt,
        ...(credentials ? { requiresCredentials: true } : {}),
      }
    : {
        id: createAddByRSSId(idText),
        idText,
        resourceType: params.resourceType,
        feedUrl: params.feedUrl,
        title: params.title ?? params.feedUrl,
        imageUrl: params.imageUrl ?? null,
        status: 'queued',
        updatedAt,
        ...(credentials ? { requiresCredentials: true } : {}),
      };
  markAddByRSSParseInFlight(params.feedUrl);
  try {
    await upsertAddByRSSFeed(record);
    const parseResponse = await enqueueAddByRSSParse({ feedUrl: params.feedUrl, credentials });
    return { kind: 'add_by_rss', requestId: parseResponse.request_id, record, account };
  } catch (error) {
    releaseAddByRSSParseInFlight(params.feedUrl);
    throw error;
  }
};

/**
 * Saves credentials for an already-followed feed on this browser and queues a parse to check
 * them. The saved credentials are kept even if the parse rejects them, so the user can edit
 * rather than retype.
 */
export const saveAddByRSSCredentialsAndQueue = async (params: {
  accountId: string;
  feed: AddByRSSFeedRecord;
  credentials: AddByRSSBasicAuthCredentials;
}): Promise<{ requestId: string; savedOnDevice: boolean }> => {
  const savedOnDevice = await storeCredentials(
    params.accountId,
    params.feed.feedUrl,
    params.credentials
  );
  const parseResponse = await enqueueAddByRSSParse({
    feedUrl: params.feed.feedUrl,
    cache: params.feed.cache,
    credentials: params.credentials,
  });
  return { requestId: parseResponse.request_id, savedOnDevice };
};

const buildAddByRSSFeedRecordFromStatus = <T extends AddByRSSFeedRecord>(
  base: T,
  params: {
    parsedFeed: AddByRSSParsedFeed | undefined;
    status: AddByRSSParseStatus;
    cache?: AddByRSSFeedRecord['cache'];
    outcome?: AddByRSSParseOutcome;
  }
): T => {
  const { parsedFeed, status, cache, outcome } = params;
  const nowIso = new Date().toISOString();
  const isSuccess = status === 'parsed' || status === 'not_modified';
  const nextBase: T = {
    ...base,
    status,
    cache: cache ?? base.cache,
    updatedAt: nowIso,
    lastParsedAt: isSuccess ? nowIso : (base.lastParsedAt ?? null),
    lastFailedParseAt: status === 'failed' ? nowIso : (base.lastFailedParseAt ?? null),
    lastFailureReason: isSuccess
      ? null
      : status === 'failed'
        ? (outcome?.failureReason ?? null)
        : base.lastFailureReason,
    requiresCredentials: nextLocalRequiresCredentials({
      current: base.requiresCredentials,
      status,
      failureReason: outcome?.failureReason,
      credentialsState: outcome?.credentialsState,
    }),
  };

  if (!parsedFeed) {
    return nextBase;
  }

  const mappedFeed = convertParsedRSSFeedToCompat(parsedFeed);
  const { title: mappedTitle, imageUrl: mappedImageUrl } = getAddByRSSChannelMetadata(mappedFeed);
  return {
    ...nextBase,
    mappedFeed,
    title: mappedTitle ?? nextBase.title,
    imageUrl: mappedImageUrl ?? nextBase.imageUrl,
    mayHaveLivestreams: addByRSSFeedMayHaveLivestreams(nextBase.mayHaveLivestreams, mappedFeed),
  };
};

export const applyAddByRSSParseStatus = async ({
  feedUrl,
  parsedFeed,
  status,
  cache,
  outcome,
  fallbackRecord,
  onUpdated,
}: ApplyAddByRSSParseStatusParams): Promise<AddByRSSFeedRecord | null> => {
  const existing = await getAddByRSSFeedByUrl(feedUrl);
  const base = existing ?? fallbackRecord;
  if (!base) {
    return null;
  }

  const updated = buildAddByRSSFeedRecordFromStatus(base, { parsedFeed, status, cache, outcome });
  await upsertAddByRSSFeed(updated);
  onUpdated?.(updated);
  emitAddByRSSFeedChanged(updated.feedUrl);

  // The artist record is ready before its albums, so the albums are stored without waiting.
  const publisherListedFeeds = outcome?.publisherListedFeeds;
  if (parsedFeed && status === 'parsed' && publisherListedFeeds !== undefined) {
    void ingestAddByRSSPublisherListedFeeds({
      publisher: updated,
      listedFeeds: publisherListedFeeds,
    });
  }
  return updated;
};

/** Applies a parse status to a listed album. Never writes the feeds store. */
export const applyListedAddByRSSParseStatus = async (params: {
  feedUrl: string;
  parsedFeed: AddByRSSParsedFeed | undefined;
  status: AddByRSSParseStatus;
  cache?: AddByRSSFeedRecord['cache'];
  outcome?: AddByRSSParseOutcome;
  fallbackRecord?: AddByRSSListedFeedRecord | null;
  onUpdated?: (record: AddByRSSListedFeedRecord) => void;
}): Promise<AddByRSSListedFeedRecord | null> => {
  const { feedUrl, parsedFeed, status, cache, outcome, fallbackRecord, onUpdated } = params;
  const base = (await getListedAddByRSSFeedByUrl(feedUrl)) ?? fallbackRecord ?? null;
  if (base === null) {
    return null;
  }

  const updated = assignListedLiveItemIdTexts(
    assignListedTrackIdTexts(
      buildAddByRSSFeedRecordFromStatus(base, { parsedFeed, status, cache, outcome })
    )
  );
  await upsertListedAddByRSSFeed(updated);
  onUpdated?.(updated);
  emitAddByRSSFeedChanged(feedUrl);
  return updated;
};

const loggedListedPollErrors = new Set<string>();

const logListedPollErrorOnce = (feedUrl: string, error: unknown): void => {
  const feedKey = toAddByRSSComparableFeedUrl(feedUrl);
  if (loggedListedPollErrors.has(feedKey)) {
    return;
  }
  loggedListedPollErrors.add(feedKey);
  console.error('Add by RSS artist album parse could not be followed', error);
};

const pollListedAddByRSSFeed = async (record: AddByRSSListedFeedRecord): Promise<void> => {
  const requestId = record.publisherParseRequestId;
  const inFlightKey = `listed:${record.feedUrl}`;
  if (requestId === null || !claimAddByRSSParseInFlight(inFlightKey)) {
    return;
  }
  try {
    await pollAddByRSSParseStatus({
      requestId,
      onStatusUpdate: async (response) => {
        await applyListedAddByRSSParseStatus({
          feedUrl: record.feedUrl,
          parsedFeed: response.payload,
          status: response.status,
          cache: response.cache,
          outcome: response,
          fallbackRecord: record,
        });
      },
    });
  } catch (error) {
    // A timed-out or expired request stays queued until the next artist parse replaces its id.
    logListedPollErrorOnce(record.feedUrl, error);
  } finally {
    releaseAddByRSSParseInFlight(inFlightKey);
  }
};

/** Polls each listed album still queued or processing, at most four at a time. */
export const resumeListedAddByRSSPolls = async (
  records: readonly AddByRSSListedFeedRecord[]
): Promise<void> => {
  const pending = records.filter(
    (record) =>
      record.publisherParseRequestId !== null &&
      (record.status === undefined || record.status === 'queued' || record.status === 'processing')
  );
  const worker = async (): Promise<void> => {
    let record = pending.shift();
    while (record !== undefined) {
      await pollListedAddByRSSFeed(record);
      record = pending.shift();
    }
  };
  const workerCount = Math.min(LISTED_POLL_CONCURRENCY, pending.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
};

/**
 * Stores what a parsed artist lists and the albums parsed with it, then polls those albums. A
 * failure here never fails the artist's parse.
 */
export const ingestAddByRSSPublisherListedFeeds = async (params: {
  publisher: AddByRSSFeedRecord;
  listedFeeds: AddByRSSPublisherListedFeed[];
}): Promise<void> => {
  const { publisher, listedFeeds } = params;
  try {
    const nowIso = new Date().toISOString();
    const mappedTitle = publisher.mappedFeed
      ? getAddByRSSChannelMetadata(publisher.mappedFeed).title
      : null;
    await upsertAddByRSSPublisherLink({
      publisherFeedUrl: toAddByRSSComparableFeedUrl(publisher.feedUrl),
      publisherIdText: publisher.idText,
      publisherTitle: mappedTitle ?? publisher.title ?? publisher.feedUrl,
      publisherGuid: normalizeAddByRSSGuid(publisher.mappedFeed?.channel?.channel?.podcast_guid),
      listedFeeds,
      updatedAt: nowIso,
    });
    emitAddByRSSFeedChanged(publisher.feedUrl);

    const collected: AddByRSSListedFeedRecord[] = [];
    for (const row of listedFeeds) {
      if (row.kind !== 'add_by_rss' || row.feedUrl === null) {
        continue;
      }
      const existing = await getListedAddByRSSFeedByUrl(row.feedUrl);
      let record: AddByRSSListedFeedRecord;
      if (existing) {
        record = {
          ...existing,
          publisherParseRequestId: row.requestId,
          status: 'queued',
          updatedAt: nowIso,
        };
      } else {
        const idText = createAddByRSSIdText();
        record = {
          id: createAddByRSSId(idText),
          idText,
          resourceType: 'albums',
          feedUrl: row.feedUrl,
          title: row.title ?? row.feedUrl,
          imageUrl: null,
          status: 'queued',
          updatedAt: nowIso,
          publisherParseRequestId: row.requestId,
          itemIdTextsByGuid: {},
          liveItemIdTextsByGuid: {},
        };
      }
      await upsertListedAddByRSSFeed(record);
      collected.push(record);
    }

    // An album this artist dropped leaves unless another stored artist still lists it.
    await pruneAddByRSSPublisherData();
    await resumeListedAddByRSSPolls(collected);
  } catch (error) {
    console.error('Add by RSS artist albums could not be stored', error);
  }
};

/** Re-parses an artist with no cache hints so the server lists its albums again. */
export const refreshAddByRSSPublisherLinks = async (params: {
  accountId: string;
  publisher: AddByRSSFeedRecord;
}): Promise<void> => {
  const { accountId, publisher } = params;
  if (!claimAddByRSSParseInFlight(publisher.feedUrl)) {
    return;
  }
  try {
    const { request_id } = await enqueueAddByRSSParseWithStoredCredentials({
      accountId,
      feedUrl: publisher.feedUrl,
    });
    await pollAddByRSSParseStatus({
      requestId: request_id,
      onStatusUpdate: async (response) => {
        await applyAddByRSSParseStatus({
          feedUrl: publisher.feedUrl,
          parsedFeed: response.payload,
          status: response.status,
          cache: response.cache,
          outcome: response,
          fallbackRecord: publisher,
        });
      },
    });
  } catch (error) {
    console.error('Add by RSS artist albums could not be refreshed', error);
  } finally {
    releaseAddByRSSParseInFlight(publisher.feedUrl);
  }
};

export const pollAddByRSSParseStatus = async ({
  requestId,
  onStatusUpdate,
}: PollAddByRSSParseStatusParams): Promise<AddByRSSParseStatusResponse['status']> => {
  return trackBackgroundActivity('add_by_rss_refresh', { counted: true }, async () => {
    for (let attempt = 0; attempt < STATUS_POLL_MAX_ATTEMPTS; attempt += 1) {
      const statusResponse = await getAddByRSSParseStatus(requestId);
      await onStatusUpdate(statusResponse);

      if (
        statusResponse.status === 'parsed' ||
        statusResponse.status === 'not_modified' ||
        statusResponse.status === 'failed'
      ) {
        return statusResponse.status;
      }

      await sleep(STATUS_POLL_DELAY_MS);
    }

    throw new Error(`Parse status timed out. Request ID: ${requestId}`);
  });
};
