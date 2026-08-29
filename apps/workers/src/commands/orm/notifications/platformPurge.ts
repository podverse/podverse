import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';

import { AccountNotificationService, ScheduledJobService } from '@podverse/orm';

function getOneMonthCutoff(now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 1);
  return cutoff;
}

export const notificationsPlatformPurge = async (_args: CommandLineArgs) => {
  const logger = getLogger();
  const accountNotificationService = new AccountNotificationService();
  const scheduledJobService = new ScheduledJobService();
  const now = new Date();
  const cutoff = getOneMonthCutoff(now);

  logger.info(`notificationsPlatformPurge starting with cutoff=${cutoff.toISOString()}`);

  const deletedNotifications = await accountNotificationService.deleteExpiredBefore(cutoff);
  const deletedTerminalJobs = await scheduledJobService.deleteTerminalBefore(cutoff);

  logger.info(
    `notificationsPlatformPurge completed notifications_deleted=${deletedNotifications} terminal_jobs_deleted=${deletedTerminalJobs}`
  );
};
