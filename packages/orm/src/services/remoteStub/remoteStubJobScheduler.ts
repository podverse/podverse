import type { ScheduledJob } from '@orm/entities/account/scheduledJob.js';
import { ScheduledJobService } from '@orm/services/account/scheduledJob.js';

import { DATABASE_CONSTANTS, isIndexProviderId } from '@podverse/helpers';
import type { IndexProviderId } from '@podverse/helpers';

export const REMOTE_STUB_RECHECK_JOB_TYPE = 'remote-stub-recheck';
export const REMOTE_STUB_REPOINT_JOB_TYPE = 'remote-stub-repoint';
export const REMOTE_STUB_PROMOTE_JOB_TYPE = 'remote-stub-promote';

export type RemoteStubRecheckPayload = { remoteChannelStubId: number };
export type RemoteStubRepointPayload = {
  remoteChannelStubId: number;
  targetProviderFeedId: string;
};
export type RemoteStubPromotePayload = {
  indexProvider: IndexProviderId;
  providerFeedId: string;
};

const REMOTE_STUB_MAX_ATTEMPTS = 3;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const parseProviderFeedId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > DATABASE_CONSTANTS.varchar_short) {
    return null;
  }
  return trimmed;
};

export const buildRemoteStubRecheckDedupeKey = (remoteChannelStubId: number): string =>
  `${REMOTE_STUB_RECHECK_JOB_TYPE}:${remoteChannelStubId}`;

export const buildRemoteStubRepointDedupeKey = (remoteChannelStubId: number): string =>
  `${REMOTE_STUB_REPOINT_JOB_TYPE}:${remoteChannelStubId}`;

export const buildRemoteStubPromoteDedupeKey = (
  indexProvider: IndexProviderId,
  providerFeedId: string
): string => `${REMOTE_STUB_PROMOTE_JOB_TYPE}:${indexProvider}:${providerFeedId}`;

export const parseRemoteStubRecheckPayload = (
  payload: Record<string, unknown> | null | undefined
): RemoteStubRecheckPayload | null => {
  const remoteChannelStubId = payload?.remoteChannelStubId;
  if (!isPositiveInteger(remoteChannelStubId)) {
    return null;
  }
  return { remoteChannelStubId };
};

export const parseRemoteStubRepointPayload = (
  payload: Record<string, unknown> | null | undefined
): RemoteStubRepointPayload | null => {
  const remoteChannelStubId = payload?.remoteChannelStubId;
  if (!isPositiveInteger(remoteChannelStubId)) {
    return null;
  }
  const targetProviderFeedId = parseProviderFeedId(payload?.targetProviderFeedId);
  if (targetProviderFeedId === null) {
    return null;
  }
  return { remoteChannelStubId, targetProviderFeedId };
};

export const parseRemoteStubPromotePayload = (
  payload: Record<string, unknown> | null | undefined
): RemoteStubPromotePayload | null => {
  const indexProvider = payload?.indexProvider;
  if (!isIndexProviderId(indexProvider)) {
    return null;
  }
  const providerFeedId = parseProviderFeedId(payload?.providerFeedId);
  if (providerFeedId === null) {
    return null;
  }
  return { indexProvider, providerFeedId };
};

const scheduleRemoteStubJob = async (
  dedupeKey: string,
  jobType: string,
  payload: Record<string, unknown>
): Promise<ScheduledJob> =>
  new ScheduledJobService().upsertByDedupeKey({
    dedupe_key: dedupeKey,
    job_type: jobType,
    max_attempts: REMOTE_STUB_MAX_ATTEMPTS,
    payload,
    run_after: new Date(),
  });

export const scheduleRemoteStubRecheck = async (
  remoteChannelStubId: number
): Promise<ScheduledJob> =>
  scheduleRemoteStubJob(
    buildRemoteStubRecheckDedupeKey(remoteChannelStubId),
    REMOTE_STUB_RECHECK_JOB_TYPE,
    { remoteChannelStubId }
  );

export const scheduleRemoteStubRepoint = async (
  remoteChannelStubId: number,
  targetProviderFeedId: string
): Promise<ScheduledJob> =>
  scheduleRemoteStubJob(
    buildRemoteStubRepointDedupeKey(remoteChannelStubId),
    REMOTE_STUB_REPOINT_JOB_TYPE,
    { remoteChannelStubId, targetProviderFeedId }
  );

export const scheduleRemoteStubPromote = async (
  indexProvider: IndexProviderId,
  providerFeedId: string
): Promise<ScheduledJob> =>
  scheduleRemoteStubJob(
    buildRemoteStubPromoteDedupeKey(indexProvider, providerFeedId),
    REMOTE_STUB_PROMOTE_JOB_TYPE,
    { indexProvider, providerFeedId }
  );
