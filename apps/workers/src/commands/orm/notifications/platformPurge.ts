import type { CommandLineArgs } from '@workers/commands/index.js';
import {
  getNotificationsRetentionConfig,
  getScheduledJobRetentionConfig,
} from '@workers/config/index.js';
import { getLogger } from '@workers/factories/logger.js';

import { subtractDays } from '@podverse/helpers';
import { AccountNotificationService, ScheduledJobService } from '@podverse/orm';

/**
 * Deletes what the inbox and the job table no longer need to hold.
 *
 * Notifications get two rules, because a row can be short-lived for its own reasons and the
 * account-wide ceiling is a separate decision: anything past its `expires_at` goes, and anything
 * older than the retention window goes regardless of what expiry it was created with. Applying the
 * window to rows already in the table is what makes shortening it take effect on the next run
 * rather than only on rows inserted afterwards.
 *
 * Finished scheduled jobs get a third rule and their own window. They are an operational record of
 * work the platform did rather than something a user reads, so how long an inbox holds a
 * notification says nothing about how long that record is worth keeping, and an operator tuning one
 * should not silently move the other.
 *
 * All three are plain deletes against a timestamp, so a re-run after a partial failure removes
 * whatever is left and finds nothing else to do.
 */
export const notificationsPlatformPurge = async (_args: CommandLineArgs) => {
  const logger = getLogger();
  const accountNotificationService = new AccountNotificationService();
  const scheduledJobService = new ScheduledJobService();
  const { retentionDays } = getNotificationsRetentionConfig();
  const { retentionDays: jobRetentionDays } = getScheduledJobRetentionConfig();
  const now = new Date();
  const retentionCutoff = subtractDays(now, retentionDays);
  const jobRetentionCutoff = subtractDays(now, jobRetentionDays);

  logger.info(
    `notificationsPlatformPurge starting with retention_days=${retentionDays} retention_cutoff=${retentionCutoff.toISOString()} job_retention_days=${jobRetentionDays} job_retention_cutoff=${jobRetentionCutoff.toISOString()}`
  );

  const deletedExpired = await accountNotificationService.deleteExpiredBefore(now);
  const deletedBeyondRetention =
    await accountNotificationService.deleteCreatedBefore(retentionCutoff);
  const deletedTerminalJobs = await scheduledJobService.deleteTerminalBefore(jobRetentionCutoff);

  logger.info(
    `notificationsPlatformPurge completed notifications_expired_deleted=${deletedExpired} notifications_beyond_retention_deleted=${deletedBeyondRetention} terminal_jobs_deleted=${deletedTerminalJobs}`
  );
};
