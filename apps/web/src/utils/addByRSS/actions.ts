import type { DTOAccount } from '@podverse/helpers';
import { createAddByRSSId, createAddByRSSIdText, sleep } from '@podverse/helpers';
import type { AddByRSSBasicAuthCredentials } from '@podverse/helpers-validation/client';
import { convertParsedRSSFeedToCompat } from '@podverse/parser-mapping';

import type { AddByRSSParseStatusResponse } from './api';
import {
  enqueueAddByRSSParse,
  followAddByRSSChannel,
  getAddByRSSParseStatus,
  unfollowAddByRSSChannel,
} from './api';
import { deleteCredentials, getCredentials, setCredentials } from './credentialStore';
import { nextLocalRequiresCredentials } from './credentialsStatus';
import { getAddByRSSFeedByUrl, removeAddByRSSFeed, upsertAddByRSSFeed } from './storage';
import type { AddByRSSFeedRecord, AddByRSSParsedFeed, AddByRSSResourceType } from './types';

const STATUS_POLL_DELAY_MS = 3000;
const STATUS_POLL_MAX_ATTEMPTS = 30;

/** The credential-related parts of a parse status response. */
export type AddByRSSParseOutcome = Pick<
  AddByRSSParseStatusResponse,
  'failureReason' | 'credentialsState'
>;

type ApplyAddByRSSParseStatusParams = {
  feedUrl: string;
  parsedFeed: AddByRSSParsedFeed | undefined;
  status: AddByRSSFeedRecord['status'];
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

export const unfollowAddByRSSChannelAndClear = async (params: {
  accountId: string;
  feedUrl: string;
  channelIdText: string;
}): Promise<DTOAccount> => {
  const account = await unfollowAddByRSSChannel(params.feedUrl);
  await removeAddByRSSFeed(params.channelIdText);
  try {
    await deleteCredentials(params.accountId, params.feedUrl);
  } catch (error) {
    console.error('Could not delete add-by-RSS credentials on this browser', error);
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

/**
 * Follows a feed and queues its first parse. Credentials (explicit, else already stored on this
 * browser) are saved locally and sent only in the parse body; the follow carries just the flag.
 */
export const followAddByRSSChannelAndQueue = async (params: {
  accountId: string;
  feedUrl: string;
  resourceType: AddByRSSResourceType;
  title?: string | null;
  imageUrl?: string | null;
  credentials?: AddByRSSBasicAuthCredentials | null;
}): Promise<{ requestId: string; record: AddByRSSFeedRecord; account: DTOAccount }> => {
  const credentials =
    params.credentials ?? (await readStoredCredentials(params.accountId, params.feedUrl));

  const account = await followAddByRSSChannel({
    feedUrl: params.feedUrl,
    title: params.title ?? null,
    imageUrl: params.imageUrl ?? null,
    ...(credentials ? { requiresCredentials: true } : {}),
  });

  if (params.credentials) {
    await storeCredentials(params.accountId, params.feedUrl, params.credentials);
  }

  const idText = createAddByRSSIdText();
  const record: AddByRSSFeedRecord = {
    id: createAddByRSSId(idText),
    idText,
    resourceType: params.resourceType,
    feedUrl: params.feedUrl,
    title: params.title ?? params.feedUrl,
    imageUrl: params.imageUrl ?? null,
    status: 'queued',
    updatedAt: new Date().toISOString(),
    ...(credentials ? { requiresCredentials: true } : {}),
  };
  await upsertAddByRSSFeed(record);

  const parseResponse = await enqueueAddByRSSParse({ feedUrl: params.feedUrl, credentials });
  return { requestId: parseResponse.request_id, record, account };
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

  const nowIso = new Date().toISOString();
  const isSuccess = status === 'parsed' || status === 'not_modified';
  const nextBase: AddByRSSFeedRecord = {
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
    await upsertAddByRSSFeed(nextBase);
    onUpdated?.(nextBase);
    return nextBase;
  }

  const mappedFeed = convertParsedRSSFeedToCompat(parsedFeed);
  const mappedTitle = mappedFeed.channel.channel.title ?? null;
  const mappedImageUrl = mappedFeed.channel.images?.[0]?.url ?? null;
  const updated = {
    ...nextBase,
    mappedFeed,
    title: mappedTitle ?? nextBase.title,
    imageUrl: mappedImageUrl ?? nextBase.imageUrl,
  };
  await upsertAddByRSSFeed(updated);
  onUpdated?.(updated);
  return updated;
};

export const pollAddByRSSParseStatus = async ({
  requestId,
  onStatusUpdate,
}: PollAddByRSSParseStatusParams): Promise<AddByRSSParseStatusResponse['status']> => {
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
};
