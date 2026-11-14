import type { CommandLineArgs } from '@workers/commands/index.js';
import { parsePodcastIndexFeedDirectly } from '@workers/commands/parser/rss/parseFeed.js';
import { getPodcastIndexConfig } from '@workers/config/index.js';
import { getIndexProvider } from '@workers/factories/indexProvider.js';
import { getLogger } from '@workers/factories/logger.js';
import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';
import {
  recheckRemoteChannelStub,
  repointRemoteChannelStub,
} from '@workers/lib/remoteStubs/remoteStubActions.js';

import {
  computeExponentialBackoffDelayMs,
  FIVE_MINUTES_MS,
  getErrorMessage,
  PARSER_MAX_FEED_BODY_BYTES_MAX,
} from '@podverse/helpers';
import type { Feed, ScheduledJob } from '@podverse/orm';
import {
  ADMIN_NOTIFICATION_SEND_JOB_TYPE,
  AdminNotificationCampaignService,
  decideMigrationFeedRetry,
  dispatchAdminNotificationCampaign,
  FEED_FORCE_REPARSE_JOB_TYPE,
  FeedConditionSourceEnum,
  FeedConditionTypeKeyEnum,
  FeedLifecycleStateKeyEnum,
  FeedLogService,
  FeedPolicyReasonEnum,
  FeedPolicyService,
  FeedService,
  getV4MigrationFeedRetryBackoffMs,
  parseAdminNotificationSendPayload,
  parseFeedForceReparsePayload,
  parseRemoteStubPromotePayload,
  parseRemoteStubRecheckPayload,
  parseRemoteStubRepointPayload,
  parseV4MigrationFeedRetryPayload,
  readFeedLastParseOutcome,
  REMOTE_STUB_PROMOTE_JOB_TYPE,
  REMOTE_STUB_RECHECK_JOB_TYPE,
  REMOTE_STUB_REPOINT_JOB_TYPE,
  ScheduledJobService,
  shouldAttemptFeedParseFromLifecycleAndPolicy,
  V4_MIGRATION_FEED_RETRY_JOB_TYPE,
} from '@podverse/orm';

import { decideMigrationOversize } from './v4MigrationFeedOversize.js';

type JobHandlerResult =
  { outcome: 'completed' | 'cancelled'; reason?: string } | { outcome: 'failed'; reason: string };

type JobHandler = (job: ScheduledJob) => Promise<JobHandlerResult>;

const DEFAULT_CLAIM_LIMIT = 50;
const STALE_LOCK_MINUTES = 15;
const BASE_BACKOFF_MS = FIVE_MINUTES_MS;

/**
 * Retries are spaced deterministically: a job requeued after the same number of attempts always
 * lands at the same offset, so an operator reading `next_run_at` can say when it will run.
 *
 * Jitter exists to stop simultaneous retries from colliding, which matters for a shared remote
 * endpoint. These jobs are claimed one at a time out of a table, so the collision it prevents is
 * not one this loop can have.
 */
const BACKOFF_JITTER_MS = 0;

function parseLimit(args: CommandLineArgs): number {
  const rawLimit = args.limit;
  if (typeof rawLimit !== 'string') {
    return DEFAULT_CLAIM_LIMIT;
  }

  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_CLAIM_LIMIT;
  }

  return parsed;
}

function isDryRun(args: CommandLineArgs): boolean {
  return args['dry-run'] !== undefined || args.dryRun !== undefined || args.dry_run !== undefined;
}

function resolveWorkerId(): string {
  const hostname = process.env.HOSTNAME;
  if (typeof hostname === 'string' && hostname.trim() !== '') {
    return hostname;
  }

  return `local-${process.pid}`;
}

const handleAdminNotificationSend: JobHandler = async (job) => {
  const payload = parseAdminNotificationSendPayload(job.payload);
  if (payload === null) {
    throw new Error('Invalid admin-notification-send payload');
  }

  const campaignService = new AdminNotificationCampaignService();
  const campaign = await campaignService.getByIdText(payload.campaignIdText);
  if (campaign === null) {
    return { outcome: 'cancelled', reason: 'Notification campaign not found' };
  }

  await campaignService.markSending(campaign.id);
  await dispatchAdminNotificationCampaign(campaign);
  await campaignService.markSent(campaign.id, new Date());
  return { outcome: 'completed' };
};

type FeedParseGateInput = {
  feed_lifecycle_state: {
    feed_lifecycle_state_type: { state_key: FeedLifecycleStateKeyEnum } | null;
  } | null;
  feed_policy: Parameters<typeof shouldAttemptFeedParseFromLifecycleAndPolicy>[0]['feedPolicy'];
};

function cancelledWhenFeedMayNotBeParsed(feed: FeedParseGateInput): JobHandlerResult | null {
  const lifecycleStateKey =
    feed.feed_lifecycle_state?.feed_lifecycle_state_type?.state_key ??
    FeedLifecycleStateKeyEnum.Active;
  if (
    !shouldAttemptFeedParseFromLifecycleAndPolicy({
      lifecycleStateKey,
      feedPolicy: feed.feed_policy,
    })
  ) {
    return {
      outcome: 'cancelled',
      reason: `Feed may not be parsed (lifecycle=${lifecycleStateKey})`,
    };
  }
  return null;
}

const handleFeedForceReparse: JobHandler = async (job) => {
  const payload = parseFeedForceReparsePayload(job.payload);
  if (payload === null) {
    throw new Error('Invalid feed-force-reparse payload');
  }

  const feed = await new FeedService().get(payload.feedId);
  if (feed === null) {
    return { outcome: 'cancelled', reason: 'Feed not found' };
  }

  const cancelled = cancelledWhenFeedMayNotBeParsed(feed);
  if (cancelled !== null) {
    return cancelled;
  }

  await parsePodcastIndexFeedDirectly(feed.podcast_index_id, true, {
    enqueueFollowUpWork: true,
    suppressNewItemSideEffectsPublishedBeforeMs: job.created_at.getTime(),
  });
  return { outcome: 'completed' };
};

function finishedAfter(lastFinishedParseTime: Date | null, since: Date): boolean {
  return lastFinishedParseTime !== null && lastFinishedParseTime.getTime() > since.getTime();
}

/**
 * The URL `parsePodcastIndexFeedDirectly` fetches. A missing or empty URL is the same check
 * that function fails on before it parses.
 */
function podcastIndexFeedUrl(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || !('feed' in value)) {
    return undefined;
  }
  const feed: unknown = value.feed;
  if (typeof feed !== 'object' || feed === null || !('url' in feed)) {
    return undefined;
  }
  return feed.url;
}

async function recordNoFeedUrl(feed: Feed): Promise<void> {
  await new FeedLogService().update(feed, {
    last_failed_parse_time: new Date(),
    last_parse_failure_reason: 'no_feed_url',
  });
}

/**
 * Parses a migration-seeded feed whose first parse may have failed. When the last failure is a
 * body over the parser limit, or the oversized condition is active, and the feed's body limit
 * is below the parser maximum, this raises that limit once, clears the oversized condition, and
 * parses. A feed already at the maximum fails with `body_too_large`. A parse that finished after
 * the job was created means the work is done. A feed with no URL to fetch fails the job. A
 * permanent failure fails the job after its second attempt. Any other unfinished parse throws,
 * which requeues the job until it uses its attempts.
 */
const handleV4MigrationFeedRetry: JobHandler = async (job) => {
  const payload = parseV4MigrationFeedRetryPayload(job.payload);
  if (payload === null) {
    throw new Error('Invalid v4-migration-feed-retry payload');
  }

  const feedService = new FeedService();
  let feed = await feedService.get(payload.feedId);
  if (feed === null) {
    return { outcome: 'cancelled', reason: 'Feed not found' };
  }

  const before = await readFeedLastParseOutcome(feed.id);
  const currentOverride = feed.max_response_body_bytes_override;
  const oversize = decideMigrationOversize({
    lastFailureReason: before.lastParseFailureReason,
    oversizedConditionActive:
      feed.feed_policy?.primary_block_reason === FeedPolicyReasonEnum.OversizedDetected,
    currentOverride: typeof currentOverride === 'number' ? currentOverride : null,
  });
  if (oversize === 'give_up') {
    return { outcome: 'failed', reason: 'body_too_large' };
  }
  if (oversize === 'raise') {
    const updated = await feedService.update(feed.id, {
      max_response_body_bytes_override: PARSER_MAX_FEED_BODY_BYTES_MAX,
    });
    await new FeedPolicyService().setCondition({
      feedId: feed.id,
      conditionKey: FeedConditionTypeKeyEnum.OversizedDetected,
      isActive: false,
      source: FeedConditionSourceEnum.Auto,
      note: 'v4 migration raised body limit',
    });
    const policy = await feedService.refreshFeedPolicy(feed.id);
    // The parse gate reads lifecycle and policy from this feed. Lifecycle is unchanged.
    // Policy is the recomputed row, with the oversized condition cleared.
    updated.feed_policy = policy;
    feed = updated;
  }

  const cancelled = cancelledWhenFeedMayNotBeParsed(feed);
  if (cancelled !== null) {
    return cancelled;
  }

  if (finishedAfter(before.lastFinishedParseTime, job.created_at)) {
    return { outcome: 'completed' };
  }

  const indexed = await getPodcastIndexService().podcastGetById(feed.podcast_index_id);
  if (!podcastIndexFeedUrl(indexed)) {
    await recordNoFeedUrl(feed);
    return { outcome: 'failed', reason: 'no_feed_url' };
  }

  await parsePodcastIndexFeedDirectly(feed.podcast_index_id, true, {
    enqueueFollowUpWork: true,
    suppressNewItemSideEffectsPublishedBeforeMs: job.created_at.getTime(),
  });

  const after = await readFeedLastParseOutcome(feed.id);
  if (!finishedAfter(after.lastFinishedParseTime, job.created_at)) {
    const decision = decideMigrationFeedRetry(job.attempts, after.lastParseFailureReason);
    if (decision.action === 'fail') {
      return { outcome: 'failed', reason: decision.reason };
    }
    throw new Error(decision.message);
  }
  return { outcome: 'completed' };
};

const handleRemoteStubRecheck: JobHandler = async (job) => {
  const payload = parseRemoteStubRecheckPayload(job.payload);
  if (payload === null) {
    throw new Error('Invalid remote-stub-recheck payload');
  }

  const result = await recheckRemoteChannelStub(getIndexProvider(), payload.remoteChannelStubId, {
    rateLimitDelayMs: getPodcastIndexConfig().rateLimitDelay ?? 0,
  });
  if (result === 'missing') {
    return { outcome: 'cancelled', reason: 'Remote stub not found' };
  }
  if (result === 'unavailable') {
    throw new Error('Index provider unavailable');
  }

  getLogger().info(
    `scheduledJobsRunDue remote-stub-recheck stub_id=${payload.remoteChannelStubId} result=${result}`
  );
  return { outcome: 'completed' };
};

const handleRemoteStubRepoint: JobHandler = async (job) => {
  const payload = parseRemoteStubRepointPayload(job.payload);
  if (payload === null) {
    throw new Error('Invalid remote-stub-repoint payload');
  }

  const result = await repointRemoteChannelStub(
    getIndexProvider(),
    payload.remoteChannelStubId,
    payload.targetProviderFeedId
  );
  if (result === 'missing') {
    return { outcome: 'cancelled', reason: 'Remote stub not found' };
  }
  if (result === 'target_not_found') {
    return { outcome: 'cancelled', reason: 'Target provider feed not found' };
  }
  if (result === 'unavailable') {
    throw new Error('Index provider unavailable');
  }

  getLogger().info(
    `scheduledJobsRunDue remote-stub-repoint stub_id=${payload.remoteChannelStubId} result=${result}`
  );
  return { outcome: 'completed' };
};

const handleRemoteStubPromote: JobHandler = async (job) => {
  const payload = parseRemoteStubPromotePayload(job.payload);
  if (payload === null) {
    throw new Error('Invalid remote-stub-promote payload');
  }

  switch (payload.indexProvider) {
    case 'podcast_index': {
      const podcastIndexId = Number(payload.providerFeedId);
      if (!Number.isSafeInteger(podcastIndexId) || podcastIndexId <= 0) {
        return { outcome: 'cancelled', reason: 'Invalid Podcast Index feed id' };
      }

      const existing = await new FeedService().getByPodcastIndexId(podcastIndexId);
      if (existing !== null) {
        const cancelled = cancelledWhenFeedMayNotBeParsed(existing);
        if (cancelled !== null) {
          return cancelled;
        }
      }

      await parsePodcastIndexFeedDirectly(podcastIndexId, true, {
        enqueueFollowUpWork: true,
        suppressNewItemSideEffectsPublishedBeforeMs: job.created_at.getTime(),
      });
      return { outcome: 'completed' };
    }
    default: {
      const unhandledProvider: never = payload.indexProvider;
      throw new Error(`Unhandled remote-stub-promote provider: ${String(unhandledProvider)}`);
    }
  }
};

const jobHandlers: Record<string, JobHandler> = {
  [ADMIN_NOTIFICATION_SEND_JOB_TYPE]: handleAdminNotificationSend,
  [FEED_FORCE_REPARSE_JOB_TYPE]: handleFeedForceReparse,
  [REMOTE_STUB_RECHECK_JOB_TYPE]: handleRemoteStubRecheck,
  [REMOTE_STUB_REPOINT_JOB_TYPE]: handleRemoteStubRepoint,
  [REMOTE_STUB_PROMOTE_JOB_TYPE]: handleRemoteStubPromote,
  [V4_MIGRATION_FEED_RETRY_JOB_TYPE]: handleV4MigrationFeedRetry,
};

/** Job types that retry on their own schedule instead of the shared exponential backoff. */
const backoffMsByJobType: Record<string, (attempts: number) => number> = {
  [V4_MIGRATION_FEED_RETRY_JOB_TYPE]: getV4MigrationFeedRetryBackoffMs,
};

function backoffMsFor(job: ScheduledJob): number {
  const backoffForType = backoffMsByJobType[job.job_type];
  if (backoffForType) {
    return backoffForType(job.attempts);
  }
  return computeExponentialBackoffDelayMs(job.attempts, BASE_BACKOFF_MS, BACKOFF_JITTER_MS);
}

export const scheduledJobsRunDue = async (args: CommandLineArgs) => {
  const logger = getLogger();
  const scheduledJobService = new ScheduledJobService();
  const limit = parseLimit(args);
  const dryRun = isDryRun(args);
  const workerId = resolveWorkerId();
  const now = new Date();

  if (dryRun) {
    const dueJobs = await scheduledJobService.listDuePendingBatch({ limit, now });
    logger.info(`[dry-run] scheduledJobsRunDue found ${dueJobs.length} due pending jobs`);
    for (const dueJob of dueJobs) {
      logger.info(
        `[dry-run] id=${dueJob.id} type=${dueJob.job_type} run_after=${dueJob.run_after.toISOString()} attempts=${dueJob.attempts}/${dueJob.max_attempts}`
      );
    }
    return;
  }

  const staleCutoff = new Date(now.getTime() - STALE_LOCK_MINUTES * 60 * 1000);
  const staleResetCount = await scheduledJobService.releaseStaleRunningBefore(staleCutoff);
  if (staleResetCount > 0) {
    logger.warn(
      `scheduledJobsRunDue reset ${staleResetCount} stale running jobs locked before ${staleCutoff.toISOString()}`
    );
  }

  const claimedJobs = await scheduledJobService.claimDueBatch({
    limit,
    now,
    worker_id: workerId,
  });

  logger.info(
    `scheduledJobsRunDue claimed ${claimedJobs.length} jobs with worker_id=${workerId} limit=${limit}`
  );

  if (claimedJobs.length === 0) {
    return;
  }

  for (const job of claimedJobs) {
    const handler = jobHandlers[job.job_type];
    if (!handler) {
      await scheduledJobService.markFailed(
        job.id,
        `No handler registered for job_type=${job.job_type}`
      );
      logger.error(
        `scheduledJobsRunDue failed id=${job.id} dedupe_key=${job.dedupe_key}: unknown job_type=${job.job_type}`
      );
      continue;
    }

    try {
      const result = await handler(job);
      if (result.outcome === 'cancelled') {
        await scheduledJobService.markCancelled(job.id, result.reason);
        logger.info(
          `scheduledJobsRunDue cancelled id=${job.id} dedupe_key=${job.dedupe_key}${result.reason ? ` reason=${result.reason}` : ''}`
        );
      } else if (result.outcome === 'failed') {
        await scheduledJobService.markFailed(job.id, result.reason);
        logger.error(
          `scheduledJobsRunDue marked failed id=${job.id} dedupe_key=${job.dedupe_key} attempts=${job.attempts}/${job.max_attempts} error="${result.reason}"`
        );
      } else {
        await scheduledJobService.markCompleted(job.id);
        logger.info(`scheduledJobsRunDue completed id=${job.id} dedupe_key=${job.dedupe_key}`);
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Unknown error');
      if (job.attempts < job.max_attempts) {
        const backoffMs = backoffMsFor(job);
        await scheduledJobService.requeueWithBackoff(job.id, errorMessage, backoffMs);
        logger.warn(
          `scheduledJobsRunDue requeued id=${job.id} dedupe_key=${job.dedupe_key} attempts=${job.attempts}/${job.max_attempts} backoff_ms=${backoffMs} error="${errorMessage}"`
        );
      } else {
        await scheduledJobService.markFailed(job.id, errorMessage);
        logger.error(
          `scheduledJobsRunDue marked failed id=${job.id} dedupe_key=${job.dedupe_key} attempts=${job.attempts}/${job.max_attempts} error="${errorMessage}"`
        );
      }
    }
  }
};
