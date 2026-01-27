import { config } from '@workers/config';
import { LoggerService } from '@podverse/helpers/dist/lib/backend/logger';

export const loggerService = new LoggerService({
  logLevel: config.log.level,
  logDir: config.log.dir,
});