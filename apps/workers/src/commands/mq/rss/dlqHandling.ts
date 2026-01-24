
import { mqRSSSetupDlqConsumers, createActiveMQShutdown } from '@podverse/mq';
import { activeMQArtemisService } from '@workers/factories/activeMQArtemisService';
import { logger } from '@workers/factories/logger';
import { createDailyRotateLogger } from '@workers/lib/winston';

export const mqRSSRunDlqConsumer = async () => {
  logger.info('DLQ consumer process started.');

  await activeMQArtemisService.initialize();

  const dlqLogger = createDailyRotateLogger('dlq/dlq');

  const loggerFunc = (logMessage: string) => {
    try {
      const logObject = JSON.parse(logMessage);
      dlqLogger.log(logObject);
    } catch {
      dlqLogger.info(logMessage);
    }
  };

  await mqRSSSetupDlqConsumers(activeMQArtemisService, loggerFunc);

  logger.info('DLQ consumers are running. Press Ctrl+C to exit.');

  let keepRunning = true;

  const { unregister } = createActiveMQShutdown(
    activeMQArtemisService,
    logger,
    () => { keepRunning = false; },
  );

  while (keepRunning) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  unregister();
};
