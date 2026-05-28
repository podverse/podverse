import { config } from '@management-api/config/index.js';

import { LoggerService } from '@podverse/helpers-backend';

export const loggerService = new LoggerService({
  logLevel: config.log.level,
  logDir: config.log.dir,
});
