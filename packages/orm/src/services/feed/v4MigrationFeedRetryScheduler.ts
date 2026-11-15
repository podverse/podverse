import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { ScheduledJob } from '@orm/entities/account/scheduledJob.js';
import { FeedLog } from '@orm/entities/feed/feedLog.js';
import { ScheduledJobService } from '@orm/services/account/scheduledJob.js';
import { In } from 'typeorm';

import type { FeedParseFailureReason, ScheduledJobStatusValues } from '@podverse/helpers';
import {
  isPermanentFeedParseFailure,
  ONE_DAY_MS,
  ONE_HOUR_MS,
  ONE_MINUTE_MS,
  ScheduledJobStatusEnum,
} from '@podverse/helpers';

export const V4_MIGRATION_FEED_RETRY_JOB_TYPE = 'v4-migration-feed-retry';

export const V4_MIGRATION_FEED_RETRY_MAX_ATTEMPTS = 6;

/** A permanent parse failure stops the retry job after this many attempts. */
export const V4_MIGRATION_FEED_PERMANENT_MAX_ATTEMPTS = 2;

/** Delay from the catalog seed to the first retry. The seed's own parse runs first. */
export const V4_MIGRATION_FEED_RETRY_FIRST_DELAY_MS = 15 * ONE_MINUTE_MS;

/**
 * `standard` is the go-live schedule. `rehearsal` is for the local rehearsal only: a feed
 * that keeps failing settles about an hour after its first retry instead of days later.
 */
export type V4MigrationFeedRetrySchedule = 'standard' | 'rehearsal';

/**
 * Delay before the next retry, indexed by the attempt that just failed (attempt 1 is index 0).
 * Five entries cover the retries after attempts 1 through 5. A later attempt uses the last entry.
 */
const V4_MIGRATION_FEED_RETRY_BACKOFF_LADDER_MS: Record<
  V4MigrationFeedRetrySchedule,
  readonly [number, ...number[]]
> = {
  standard: [ONE_HOUR_MS, 6 * ONE_HOUR_MS, ONE_DAY_MS, ONE_DAY_MS, ONE_DAY_MS],
  rehearsal: [
    2 * ONE_MINUTE_MS,
    5 * ONE_MINUTE_MS,
    10 * ONE_MINUTE_MS,
    15 * ONE_MINUTE_MS,
    30 * ONE_MINUTE_MS,
  ],
};

export type V4MigrationFeedRetryPayload = {
  feedId: number;
  schedule: V4MigrationFeedRetrySchedule;
};

export const buildV4MigrationFeedRetryDedupeKey = (feedId: number): string =>
  `${V4_MIGRATION_FEED_RETRY_JOB_TYPE}:${feedId}`;

/** A payload with no `schedule` is `standard`. An unknown schedule is invalid. */
export const parseV4MigrationFeedRetryPayload = (
  payload: Record<string, unknown> | null | undefined
): V4MigrationFeedRetryPayload | null => {
  const feedId = payload?.feedId;
  if (typeof feedId !== 'number' || !Number.isInteger(feedId) || feedId <= 0) {
    return null;
  }
  const schedule = payload?.schedule;
  if (schedule === undefined || schedule === 'standard') {
    return { feedId, schedule: 'standard' };
  }
  if (schedule === 'rehearsal') {
    return { feedId, schedule };
  }
  return null;
};

/**
 * Backoff after a failed attempt. An attempt count past the ladder uses the ladder's last delay.
 */
export const getV4MigrationFeedRetryBackoffMs = (
  attempts: number,
  schedule: V4MigrationFeedRetrySchedule = 'standard'
): number => {
  const ladder = V4_MIGRATION_FEED_RETRY_BACKOFF_LADDER_MS[schedule];
  const index = Math.max(attempts, 1) - 1;
  return ladder[Math.min(index, ladder.length - 1)] ?? ladder[0];
};

export type MigrationFeedRetryDecision =
  { action: 'fail'; reason: string } | { action: 'retry'; message: string };

/**
 * A permanent failure stops after `V4_MIGRATION_FEED_PERMANENT_MAX_ATTEMPTS`. Every other
 * failure, including a missing reason, keeps retrying until the job uses its attempts.
 */
export const decideMigrationFeedRetry = (
  attempts: number,
  reason: FeedParseFailureReason | null
): MigrationFeedRetryDecision => {
  if (
    reason !== null &&
    isPermanentFeedParseFailure(reason) &&
    attempts >= V4_MIGRATION_FEED_PERMANENT_MAX_ATTEMPTS
  ) {
    return { action: 'fail', reason };
  }
  return {
    action: 'retry',
    message: `Migration feed parse failed: reason=${reason ?? 'unknown'}`,
  };
};

/**
 * Queue the slow retry for one feed the v4 catalog seed created, deduped by feed id. The job
 * completes without parsing when an ordinary parse finishes after the job was created.
 */
export const scheduleV4MigrationFeedRetry = async (
  feedId: number,
  runAfter: Date,
  schedule: V4MigrationFeedRetrySchedule = 'standard'
): Promise<ScheduledJob> => {
  const payload: Record<string, unknown> =
    schedule === 'standard' ? { feedId } : { feedId, schedule };
  return new ScheduledJobService().upsertByDedupeKey({
    dedupe_key: buildV4MigrationFeedRetryDedupeKey(feedId),
    job_type: V4_MIGRATION_FEED_RETRY_JOB_TYPE,
    max_attempts: V4_MIGRATION_FEED_RETRY_MAX_ATTEMPTS,
    payload,
    run_after: runAfter,
  });
};

export type FeedLastParseOutcome = {
  lastFinishedParseTime: Date | null;
  lastParseFailureReason: FeedParseFailureReason | null;
};

/** Reads from the primary so a parse that just finished is visible. */
export const readFeedLastParseOutcome = async (feedId: number): Promise<FeedLastParseOutcome> => {
  const feedLog = await AppDataSourceReadWrite.getRepository(FeedLog).findOne({
    where: { feed: { id: feedId } },
  });
  return {
    lastFinishedParseTime: feedLog?.last_finished_parse_time ?? null,
    lastParseFailureReason: feedLog?.last_parse_failure_reason ?? null,
  };
};

/** Finished time from `readFeedLastParseOutcome`. */
export const readFeedLastFinishedParseTime = async (feedId: number): Promise<Date | null> => {
  const outcome = await readFeedLastParseOutcome(feedId);
  return outcome.lastFinishedParseTime;
};

export type V4MigrationFeedSettledInput = {
  lastFinishedParseTime: Date | null;
  lastFailedParseTime: Date | null;
  /** Status of the feed's `v4-migration-feed-retry` job, or null when it has none. */
  retryJobStatus: ScheduledJobStatusValues | null;
};

/**
 * A migration feed is settled when no further migration parse will change what it holds: a
 * parse finished, or its retry job is failed or cancelled. A feed with no retry job is settled
 * once a parse has finished or failed.
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
