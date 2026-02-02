import type { ActiveMQArtemisServiceParams } from '@podverse/mq';
import { ActiveMQArtemisService } from '@podverse/mq';
import { loggerService } from './loggerService.js';
import { config } from '@api/config/index.js';

const activeMQArtemisParams: ActiveMQArtemisServiceParams = {
  protocol: config.activeMQArtemis.protocol,
  host: config.activeMQArtemis.host,
  port: config.activeMQArtemis.port,
  username: config.activeMQArtemis.username,
  password: config.activeMQArtemis.password,
};

export const activeMQArtemisService = new ActiveMQArtemisService(
  activeMQArtemisParams,
  loggerService
);

activeMQArtemisService.initialize().catch((error) => {
  loggerService.error('Failed to initialize ActiveMQArtemisService:', error);
});
