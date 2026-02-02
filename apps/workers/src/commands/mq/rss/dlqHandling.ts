import { mqRSSSetupDlqConsumers, createActiveMQShutdown } from '@podverse/mq';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getLogger } from '@workers/factories/logger.js';
import { createDailyRotateLogger } from '@workers/lib/winston.js';

export const mqRSSRunDlqConsumer = async () => {
  getLogger().info('DLQ consumer process started.');

  const activeMQArtemisService = getActiveMQArtemisService();
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

  getLogger().info('DLQ consumers are running. Press Ctrl+C to exit.');

  let keepRunning = true;

  const { unregister } = createActiveMQShutdown(activeMQArtemisService, getLogger(), () => {
    keepRunning = false;
  });

  while (keepRunning) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  unregister();
};
