import { config } from '../config/index.js';
import { LoggerService } from '@podverse/helpers-backend';

export const loggerService = new LoggerService({
  logLevel: config.log.level,
});
