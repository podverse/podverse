import * as winston from 'winston';
import type { BaseConfig } from '@workers/config/index.js';

const { combine, timestamp, json, simple } = winston.format;

let instance: winston.Logger | null = null;

export function setLogger(baseConfig: BaseConfig): void {
  instance = winston.createLogger({
    level: baseConfig.log.level,
    format: combine(timestamp(), json()),
    transports: [
      new winston.transports.Console({
        format: simple(),
      }),
    ],
  });
}

export function getLogger(): winston.Logger {
  if (instance === null) {
    throw new Error('Logger not initialized; call setLogger from runApp first');
  }
  return instance;
}
