import { config } from '@api/config';
import { LoggerService } from '@podverse/helpers-backend';

export const loggerService = new LoggerService({
  logLevel: config.log.level,
  logDir: config.log.dir,
});
