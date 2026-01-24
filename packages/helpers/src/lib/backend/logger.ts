/* eslint-disable @typescript-eslint/no-explicit-any */

import { createLogger, format, transports, Logger } from 'winston';
import * as TransportStream from 'winston-transport';

const { combine, timestamp, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return stack ? `${timestamp} [${level}]: ${message} - ${stack}` : `${timestamp} [${level}]: ${message}`;
});

export interface LoggerServiceParams {
  logLevel: string;
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

  constructor({ logLevel }: LoggerServiceParams) {
    this.logger = createLogger({
      level: logLevel,
      format: combine(
        timestamp(),
        logFormat,
      ),
      transports: [
        new transports.Console({
          format: combine(
            colorize(),
            timestamp(),
            logFormat,
          ),
        }),
      ],
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
