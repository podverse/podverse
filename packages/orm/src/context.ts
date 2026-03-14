import type { DataSource } from 'typeorm';

import type { ILoggerLike } from '@podverse/helpers-backend';

import type { ORMConfig } from './config/types.js';

/**
 * Module-level context holder for the ORM.
 * This is set by createORMContext() and used by services.
 *
 * This pattern allows us to:
 * 1. Remove process.env from the module
 * 2. Keep the factory pattern (config comes from app)
 * 3. Minimize changes to individual services
 */
let _context: {
  config: ORMConfig;
  dataSourceRead: DataSource;
  dataSourceReadWrite: DataSource;
  loggerService: ILoggerLike;
} | null = null;

export function setORMContext(context: {
  config: ORMConfig;
  dataSourceRead: DataSource;
  dataSourceReadWrite: DataSource;
  loggerService: ILoggerLike;
}): void {
  _context = context;
}

export function getORMContext() {
  if (!_context) {
    throw new Error('ORM context not initialized. Call createORMContext() first.');
  }
  return _context;
}

// Convenience accessors
export function getDataSourceRead(): DataSource {
  return getORMContext().dataSourceRead;
}

export function getDataSourceReadWrite(): DataSource {
  return getORMContext().dataSourceReadWrite;
}

export function getLoggerService(): ILoggerLike {
  return getORMContext().loggerService;
}

export function getORMConfig(): ORMConfig {
  return getORMContext().config;
}
