import { OnDemandParserEventType } from '@podverse/helpers';
import { OnDemandParserEventService } from '@podverse/orm';
import { createDailyRotateLogger } from '@workers/lib/winston.js';
import { getLogger } from '@workers/factories/logger.js';

export const generateOnDemandParserEventReports = async () => {
  getLogger().info('Generating OnDemandParserEvent reports...');

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

    getLogger().info('Successfully generated OnDemandParserEvent reports.');
  } catch (error) {
    getLogger().error(`Error generating OnDemandParserEvent reports: ${(error as Error).message}`);
  }
};
