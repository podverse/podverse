import type { LoggerService } from '@podverse/helpers-backend';

let instance: LoggerService | null = null;

export function setLoggerService(service: LoggerService): void {
  instance = service;
}

export function getLoggerService(): LoggerService {
  if (instance === null) {
    throw new Error('LoggerService not initialized; call setLoggerService from runApp first');
  }
  return instance;
}
