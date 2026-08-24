import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';

import { APP_ROUTES, hasValidMembership, NotificationCategoryEnum } from '@podverse/helpers';
import {
  AccountService,
  createAccountNotificationWithOptionalPush,
  MEMBERSHIP_EXPIRY_REMINDER_JOB_TYPE,
  parseMembershipExpiryReminderPayload,
  type ScheduledJob,
  ScheduledJobService,
} from '@podverse/orm';

type JobHandlerResult = {
  outcome: 'completed' | 'cancelled';
  reason?: string;
};

type JobHandlerContext = {
  accountService: AccountService;
};

type JobHandler = (job: ScheduledJob, context: JobHandlerContext) => Promise<JobHandlerResult>;

const DEFAULT_CLAIM_LIMIT = 50;
const STALE_LOCK_MINUTES = 15;
const BASE_BACKOFF_MS = 5 * 60 * 1000;
const ADMIN_NOTIFICATION_SEND_JOB_TYPE = 'admin-notification-send';

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

function calculateBackoffMs(attempts: number): number {
  return BASE_BACKOFF_MS * Math.pow(2, attempts);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

const handleMembershipExpiryReminder: JobHandler = async (job, context) => {
  const payload = parseMembershipExpiryReminderPayload(job.payload);
  if (payload === null) {
    throw new Error('Invalid membership-expiry reminder payload');
  }

  const account = await context.accountService.get(payload.accountId, {
    relations: {
      account_membership_status: { account_membership: true },
    },
  });
  if (!account || !account.account_membership_status) {
    return { outcome: 'cancelled', reason: 'Account or membership status not found' };
  }

  const membershipExpiresAt = account.account_membership_status.membership_expires_at;
  if (
    membershipExpiresAt === null ||
    membershipExpiresAt === undefined ||
    !hasValidMembership(account.account_membership_status)
  ) {
    return { outcome: 'cancelled', reason: 'Membership is no longer valid' };
  }

  if (membershipExpiresAt.toISOString() !== payload.expiresAtIso) {
    return {
      outcome: 'cancelled',
      reason: 'Membership expiration changed before reminder execution',
    };
  }

  await createAccountNotificationWithOptionalPush([
    {
      account_id: account.id,
      body: 'Your membership will expire soon. Renew now to keep your premium benefits.',
      category: NotificationCategoryEnum.MembershipExpiry,
      link_path: APP_ROUTES.MEMBERSHIP_RENEW,
      payload: {
        membershipExpiresAt: membershipExpiresAt.toISOString(),
      },
      title: 'Membership expiring soon',
    },
  ]);

  return { outcome: 'completed' };
};

const handleAdminNotificationSend: JobHandler = async () => {
  throw new Error('admin-notification-send handler is not implemented yet');
};

const jobHandlers: Record<string, JobHandler> = {
  [MEMBERSHIP_EXPIRY_REMINDER_JOB_TYPE]: handleMembershipExpiryReminder,
  [ADMIN_NOTIFICATION_SEND_JOB_TYPE]: handleAdminNotificationSend,
};

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

  const context: JobHandlerContext = {
    accountService: new AccountService(),
  };

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
      const result = await handler(job, context);
      if (result.outcome === 'cancelled') {
        await scheduledJobService.markCancelled(job.id, result.reason);
        logger.info(
          `scheduledJobsRunDue cancelled id=${job.id} dedupe_key=${job.dedupe_key}${result.reason ? ` reason=${result.reason}` : ''}`
        );
      } else {
        await scheduledJobService.markCompleted(job.id);
        logger.info(`scheduledJobsRunDue completed id=${job.id} dedupe_key=${job.dedupe_key}`);
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      if (job.attempts < job.max_attempts) {
        const backoffMs = calculateBackoffMs(job.attempts);
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
