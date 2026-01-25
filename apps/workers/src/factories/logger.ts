import * as winston from 'winston';
import { config } from '@workers/config';

const { combine, timestamp, json, simple } = winston.format;

export const logger = winston.createLogger({
  level: config.log.level,
  format: combine(
    timestamp(),
    json(),
  ),
  transports: [
    new winston.transports.Console({
      format: simple(),
    }),
  ],
});
