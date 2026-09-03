import type { CommandLineArgs } from '@workers/commands/index.js';
import { getOnDemandParserEventRetentionConfig } from '@workers/config/index.js';
import { getLogger } from '@workers/factories/logger.js';

import { OnDemandParserEventService } from '@podverse/orm';

/**
 * A `-days` argument overrides the configured window, because the deployment-wide setting is what
 * the scheduler runs on while an operator clearing a specific backlog by hand wants a one-off number
 * that does not outlive the invocation.
 */
export const deleteOutdatedOnDemandParserEvent = async (args: CommandLineArgs) => {
  getLogger().info('Deleting outdated OnDemandParserEvent records...');

  const { retentionDays } = getOnDemandParserEventRetentionConfig();
  const days = args.days ? parseInt(args.days as string, 10) : retentionDays;

  if (isNaN(days)) {
    getLogger().error('Invalid days argument. It must be a number.');
    return;
  }

  try {
    const service = new OnDemandParserEventService();
    await service.deleteOutdatedEvents(days);
    getLogger().info(`Successfully deleted OnDemandParserEvent records older than ${days} days.`);
  } catch (error) {
    getLogger().error(
      `Error deleting outdated OnDemandParserEvent records: ${(error as Error).message}`
    );
  }
};
