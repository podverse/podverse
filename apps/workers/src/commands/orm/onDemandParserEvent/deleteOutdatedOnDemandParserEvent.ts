import { OnDemandParserEventService } from '@podverse/orm';
import { getLogger } from '@workers/factories/logger.js';
import type { CommandLineArgs } from '@workers/commands/index.js';

const DEFAULT_DAYS = 30;

export const deleteOutdatedOnDemandParserEvent = async (args: CommandLineArgs) => {
  getLogger().info('Deleting outdated OnDemandParserEvent records...');

  const days = args.days ? parseInt(args.days as string, 10) : DEFAULT_DAYS;

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
