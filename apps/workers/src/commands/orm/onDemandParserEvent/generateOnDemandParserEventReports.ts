import { OnDemandParserEventType } from '@podverse/helpers';
import { OnDemandParserEventService } from '@podverse/orm';
import { createDailyRotateLogger } from '@workers/lib/winston';
import { logger } from '@workers/factories/logger';

export const generateOnDemandParserEventReports = async () => {
  logger.info('Generating OnDemandParserEvent reports...');

  try {
    const service = new OnDemandParserEventService();
    const types = Object.values(OnDemandParserEventType);

    for (const type of types) {
      const reportLogger = createDailyRotateLogger(
        `onDemandParserEvent/on-demand-parser-event-report-${type}`
      );
      const counts = await service.getAggregateCount(type);
      reportLogger.log({
        level: 'info',
        message: `Report for type ${type}`,
        counts,
      });
    }

    logger.info('Successfully generated OnDemandParserEvent reports.');
  } catch (error) {
    logger.error(`Error generating OnDemandParserEvent reports: ${(error as Error).message}`);
  }
};
