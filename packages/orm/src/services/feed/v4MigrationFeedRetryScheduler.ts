import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { ScheduledJob } from '@orm/entities/account/scheduledJob.js';
import { FeedLog } from '@orm/entities/feed/feedLog.js';
import { ScheduledJobService } from '@orm/services/account/scheduledJob.js';
import { In } from 'typeorm';

import type { ScheduledJobStatusValues } from '@podverse/helpers';
import { ONE_DAY_MS, ONE_HOUR_MS, ScheduledJobStatusEnum } from '@podverse/helpers';

export const V4_MIGRATION_FEED_RETRY_JOB_TYPE = 'v4-migration-feed-retry';

export const V4_MIGRATION_FEED_RETRY_MAX_ATTEMPTS = 6;

/** Delay from the catalog seed to the first retry. The seed's own parse runs first. */
export const V4_MIGRATION_FEED_RETRY_FIRST_DELAY_MS = ONE_HOUR_MS;

/**
 * Delay before the next retry, indexed by the attempt that just failed (attempt 1 is index 0).
 * The ladder has one entry per retry that can still follow, so attempt `max_attempts` never reads it.
 */
const V4_MIGRATION_FEED_RETRY_BACKOFF_LADDER_MS: readonly number[] = [
  ONE_HOUR_MS,
  6 * ONE_HOUR_MS,
  ONE_DAY_MS,
  3 * ONE_DAY_MS,
  7 * ONE_DAY_MS,
];

export type V4MigrationFeedRetryPayload = {
  feedId: number;
};

export const buildV4MigrationFeedRetryDedupeKey = (feedId: number): string =>
  `${V4_MIGRATION_FEED_RETRY_JOB_TYPE}:${feedId}`;

export const parseV4MigrationFeedRetryPayload = (
  payload: Record<string, unknown> | null | undefined
): V4MigrationFeedRetryPayload | null => {
  const feedId = payload?.feedId;
  if (typeof feedId !== 'number' || !Number.isInteger(feedId) || feedId <= 0) {
    return null;
  }
  return { feedId };
};

/**
 * Backoff after a failed attempt. An attempt count past the ladder (a job whose attempts were
 * not reset when it was rescheduled) keeps the longest delay.
 */
export const getV4MigrationFeedRetryBackoffMs = (attempts: number): number => {
  const ladder = V4_MIGRATION_FEED_RETRY_BACKOFF_LADDER_MS;
  const index = Math.min(Math.max(attempts, 1), ladder.length) - 1;
  return ladder[index] ?? 7 * ONE_DAY_MS;
};

/**
 * Queue the slow retry for one feed the v4 catalog seed created, deduped by feed id. The job
 * completes without parsing when an ordinary parse finishes after the job was created.
 */
export const scheduleV4MigrationFeedRetry = async (
  feedId: number,
  runAfter: Date
): Promise<ScheduledJob> => {
  const payload: V4MigrationFeedRetryPayload = { feedId };
  return new ScheduledJobService().upsertByDedupeKey({
    dedupe_key: buildV4MigrationFeedRetryDedupeKey(feedId),
    job_type: V4_MIGRATION_FEED_RETRY_JOB_TYPE,
    max_attempts: V4_MIGRATION_FEED_RETRY_MAX_ATTEMPTS,
    payload,
    run_after: runAfter,
  });
};

/** Reads from the primary so a parse that just finished is visible. */
export const readFeedLastFinishedParseTime = async (feedId: number): Promise<Date | null> => {
  const feedLog = await AppDataSourceReadWrite.getRepository(FeedLog).findOne({
    where: { feed: { id: feedId } },
  });
  return feedLog?.last_finished_parse_time ?? null;
};

export type V4MigrationFeedSettledInput = {
  lastFinishedParseTime: Date | null;
  lastFailedParseTime: Date | null;
  /** Status of the feed's `v4-migration-feed-retry` job, or null when it has none. */
  retryJobStatus: ScheduledJobStatusValues | null;
};

/**
 * A migration feed is settled when no further migration parse will change what it holds: a
 * parse finished, or its retry job used up its attempts or was cancelled. A feed with no retry
 * job is settled once a parse has finished or failed.
 */
export const isV4MigrationFeedSettled = (input: V4MigrationFeedSettledInput): boolean => {
  if (input.lastFinishedParseTime !== null) {
    return true;
  }
  if (input.retryJobStatus !== null) {
    return (
      input.retryJobStatus === ScheduledJobStatusEnum.Failed ||
      input.retryJobStatus === ScheduledJobStatusEnum.Cancelled
    );
  }
  return input.lastFailedParseTime !== null;
};

/**
 * Settled state per feed id, read from the primary. A feed id with no `feed_log` row and no
 * retry job is reported as not settled.
 */
export const getV4MigrationFeedSettledByFeedId = async (
  feedIds: readonly number[]
): Promise<Map<number, boolean>> => {
  const settledByFeedId = new Map<number, boolean>();
  const uniqueFeedIds = [...new Set(feedIds)];
  if (uniqueFeedIds.length === 0) {
    return settledByFeedId;
  }

  const feedLogs = await AppDataSourceReadWrite.getRepository(FeedLog).find({
    where: { feed: { id: In(uniqueFeedIds) } },
    relations: { feed: true },
  });
  const feedLogByFeedId = new Map<number, FeedLog>();
  for (const feedLog of feedLogs) {
    feedLogByFeedId.set(feedLog.feed.id, feedLog);
  }

  const retryJobs = await AppDataSourceReadWrite.getRepository(ScheduledJob).find({
    where: { dedupe_key: In(uniqueFeedIds.map(buildV4MigrationFeedRetryDedupeKey)) },
  });
  const retryStatusByFeedId = new Map<number, ScheduledJobStatusValues>();
  for (const job of retryJobs) {
    const payload = parseV4MigrationFeedRetryPayload(job.payload);
    if (payload !== null) {
      retryStatusByFeedId.set(payload.feedId, job.status);
    }
  }

  for (const feedId of uniqueFeedIds) {
    const feedLog = feedLogByFeedId.get(feedId);
    settledByFeedId.set(
      feedId,
      isV4MigrationFeedSettled({
        lastFinishedParseTime: feedLog?.last_finished_parse_time ?? null,
        lastFailedParseTime: feedLog?.last_failed_parse_time ?? null,
        retryJobStatus: retryStatusByFeedId.get(feedId) ?? null,
      })
    );
  }
  return settledByFeedId;
};
