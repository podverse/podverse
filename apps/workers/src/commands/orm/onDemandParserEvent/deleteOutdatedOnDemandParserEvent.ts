import { OnDemandParserEventService } from '@podverse/orm';
import { logger } from '@workers/factories/logger';
import { CommandLineArgs } from '@workers/commands';

const DEFAULT_DAYS = 30;

export const deleteOutdatedOnDemandParserEvent = async (args: CommandLineArgs) => {
  logger.info('Deleting outdated OnDemandParserEvent records...');

  const days = args.days ? parseInt(args.days as string, 10) : DEFAULT_DAYS;

  if (isNaN(days)) {
    logger.error('Invalid days argument. It must be a number.');
    return;
  }

  try {
    const service = new OnDemandParserEventService();
    await service.deleteOutdatedEvents(days);
    logger.info(`Successfully deleted OnDemandParserEvent records older than ${days} days.`);
  } catch (error) {
    logger.error(`Error deleting outdated OnDemandParserEvent records: ${(error as Error).message}`);
  }
};
