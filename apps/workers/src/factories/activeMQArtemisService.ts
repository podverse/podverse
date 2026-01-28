import { ActiveMQArtemisService, ActiveMQArtemisServiceParams } from '@podverse/mq';
import { loggerService } from './loggerService';
import { config } from '@workers/config';

const activeMQArtemisParams: ActiveMQArtemisServiceParams = {
  protocol: config.queue.protocol,
  host: config.queue.host,
  port: config.queue.port,
  username: config.queue.username,
  password: config.queue.password,
};

export const activeMQArtemisService = new ActiveMQArtemisService(
  activeMQArtemisParams,
  loggerService
);
