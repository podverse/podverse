import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';

import { LoggerService } from '@podverse/helpers-backend';

import type { ORMConfig } from './config/types.js';
import { setORMContext } from './context.js';
import { entities } from './db/entities.js';
import { SnakeNamingStrategy } from './lib/snakeNamingStrategy.js';

export type ORMContext = {
  config: ORMConfig;
  dataSourceRead: DataSource;
  dataSourceReadWrite: DataSource;
  loggerService: LoggerService;
};

/**
 * Creates an ORM context with the provided configuration.
 * This is the factory function that should be called from the app level.
 *
 * The DataSources are NOT initialized - call dataSourceRead.initialize() and
 * dataSourceReadWrite.initialize() after creating the context.
 *
 * This function also sets the module-level context so that services can access
 * the DataSources and logger without needing to pass them explicitly.
 *
 * @param config - The ORM configuration (from app-level env vars)
 * @returns ORMContext with DataSources and logger (not yet initialized)
 */
export function createORMContext(config: ORMConfig): ORMContext {
  const commonConfig: DataSourceOptions = {
    type: 'postgres',
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    cache: false,
    synchronize: false,
    logging: false,
    entities,
    migrations: [],
    subscribers: [],
    namingStrategy: new SnakeNamingStrategy(),
  };

  const readConfig: DataSourceOptions = {
    ...commonConfig,
    username: config.database.read_username,
    password: config.database.read_password,
  };

  const readWriteConfig: DataSourceOptions = {
    ...commonConfig,
    username: config.database.read_write_username,
    password: config.database.read_write_password,
  };

  const dataSourceRead = new DataSource(readConfig);
  const dataSourceReadWrite = new DataSource(readWriteConfig);

  const loggerService = new LoggerService({
    logLevel: config.log.level,
  });

  const context: ORMContext = {
    config,
    dataSourceRead,
    dataSourceReadWrite,
    loggerService,
  };

  // Set the module-level context so services can access it
  setORMContext(context);

  return context;
}
