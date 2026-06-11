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

export type BindORMContextInput = {
  config: ORMConfig;
  dataSourceRead: DataSource;
  dataSourceReadWrite: DataSource;
  loggerService: LoggerService;
};

/**
 * Binds existing, app-owned DataSources to the module-level ORM context.
 * Use when an app already creates and initializes its own read/read_write pools
 * (e.g. management-api AppDbDataSourceRead/Write) instead of createORMContext().
 *
 * DataSources must already be initialized before calling services that use them.
 */
export function bindORMContext(input: BindORMContextInput): ORMContext {
  const context: ORMContext = {
    config: input.config,
    dataSourceRead: input.dataSourceRead,
    dataSourceReadWrite: input.dataSourceReadWrite,
    loggerService: input.loggerService,
  };

  setORMContext(context);

  return context;
}
