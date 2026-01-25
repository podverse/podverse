import { config } from '../config/index.js';
import { LoggerService } from '@podverse/helpers/dist/lib/backend/logger.js';

export const loggerService = new LoggerService({
  logLevel: config.log.level,
});
