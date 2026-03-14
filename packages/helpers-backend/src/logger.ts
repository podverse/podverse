/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';
import type * as TransportStream from 'winston-transport';

import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, json } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return stack
    ? `${timestamp} [${level}]: ${message} - ${stack}`
    : `${timestamp} [${level}]: ${message}`;
});

export interface LoggerServiceParams {
  logLevel: string;
  logDir?: string;
}

export interface ILoggerLike {
  addRemoteTransport(transport: unknown): void;
  logError(message: string, error?: Error | unknown): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export class LoggerService {
  private logger: Logger;

  constructor({ logLevel, logDir }: LoggerServiceParams) {
    const loggerTransports: TransportStream[] = [
      new transports.Console({
        format: combine(colorize(), timestamp(), logFormat),
      }),
    ];

    // Add file transport if logDir is provided and non-empty
    if (logDir && logDir.trim() !== '') {
      loggerTransports.push(
        new transports.DailyRotateFile({
          filename: `${logDir}/app-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          format: combine(timestamp(), json()),
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        })
      );
    }

    this.logger = createLogger({
      level: logLevel,
      format: combine(timestamp(), logFormat),
      transports: loggerTransports,
    });
  }

  public addRemoteTransport(transport: TransportStream) {
    this.logger.add(transport);
  }

  public logError(message: string, error?: Error | unknown) {
    this.logger.error(message);

    if (error instanceof Error) {
      this.logger.error(error.message, { stack: error.stack });
    } else if (typeof error === 'string') {
      this.logger.error(error);
    } else if (error) {
      this.logger.error('An unknown error occurred:', { error });
    }
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }
}
