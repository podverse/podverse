import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { config } from '@workers/config';

export const createDailyRotateLogger = (filename: string, level = 'info') => {
  const logDir = config.log.dir || './logs';
  const transports: winston.transport[] = [
    new winston.transports.Console({ level }),
  ];

  // Only add file transport if LOG_DIR is set and non-empty
  if (logDir && logDir.trim() !== '') {
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: `${logDir}/${filename}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
      }),
    );
  }

  return winston.createLogger({
    level,
    format: winston.format.json(),
    transports,
  });
};
