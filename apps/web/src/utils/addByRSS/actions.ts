import type { DTOAccount } from '@podverse/helpers';
import { createAddByRSSId, createAddByRSSIdText, sleep } from '@podverse/helpers';
import { convertParsedRSSFeedToCompat } from '@podverse/parser-mapping';

import type { AddByRSSParseStatusResponse } from './api';
import {
  enqueueAddByRSSParse,
  followAddByRSSChannel,
  getAddByRSSParseStatus,
  unfollowAddByRSSChannel,
} from './api';
import { getAddByRSSFeedByUrl, removeAddByRSSFeed, upsertAddByRSSFeed } from './storage';
import type { AddByRSSFeedRecord, AddByRSSParsedFeed, AddByRSSResourceType } from './types';

const STATUS_POLL_DELAY_MS = 3000;
const STATUS_POLL_MAX_ATTEMPTS = 30;

type ApplyAddByRSSParseStatusParams = {
  feedUrl: string;
  parsedFeed: AddByRSSParsedFeed | undefined;
  status: AddByRSSFeedRecord['status'];
  cache?: AddByRSSFeedRecord['cache'];
  fallbackRecord?: AddByRSSFeedRecord | null;
  onUpdated?: (record: AddByRSSFeedRecord) => void;
};

type PollAddByRSSParseStatusParams = {
  requestId: string;
  onStatusUpdate: (response: AddByRSSParseStatusResponse) => Promise<void>;
};

export const unfollowAddByRSSChannelAndClear = async (params: {
  feedUrl: string;
  channelIdText: string;
}): Promise<DTOAccount> => {
  const account = await unfollowAddByRSSChannel(params.feedUrl);
  await removeAddByRSSFeed(params.channelIdText);
  return account;
};

export const followAddByRSSChannelAndQueue = async (params: {
  feedUrl: string;
  resourceType: AddByRSSResourceType;
  title?: string | null;
  imageUrl?: string | null;
  basic_auth_username?: string | null;
  basic_auth_password?: string | null;
}): Promise<{ requestId: string; record: AddByRSSFeedRecord; account: DTOAccount }> => {
  const account = await followAddByRSSChannel({
    feedUrl: params.feedUrl,
    title: params.title ?? null,
    imageUrl: params.imageUrl ?? null,
    basic_auth_username: params.basic_auth_username ?? null,
    basic_auth_password: params.basic_auth_password ?? null,
  });

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
  };
  await upsertAddByRSSFeed(record);

  const parseResponse = await enqueueAddByRSSParse({ feedUrl: params.feedUrl });
  return { requestId: parseResponse.request_id, record, account };
};

export const applyAddByRSSParseStatus = async ({
  feedUrl,
  parsedFeed,
  status,
  cache,
  fallbackRecord,
  onUpdated,
}: ApplyAddByRSSParseStatusParams): Promise<AddByRSSFeedRecord | null> => {
  const existing = await getAddByRSSFeedByUrl(feedUrl);
  const base = existing ?? fallbackRecord;
  if (!base) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const nextBase = {
    ...base,
    status,
    cache: cache ?? base.cache,
    updatedAt: nowIso,
    lastParsedAt:
      status === 'parsed' || status === 'not_modified'
        ? nowIso
        : (base.lastParsedAt ?? null),
    lastFailedParseAt: status === 'failed' ? nowIso : (base.lastFailedParseAt ?? null),
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
