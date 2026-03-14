import { LoggerService } from '@podverse/helpers-backend';

import { config } from '../config/index.js';

export const loggerService = new LoggerService({
  logLevel: config.log.level,
});
