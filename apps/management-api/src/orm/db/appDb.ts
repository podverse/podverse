import { config } from '@mgmt-api/config/index.js';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const commonConfig: DataSourceOptions = {
  type: 'postgres',
  host: config.appDatabase.host,
  port: config.appDatabase.port,
  database: config.appDatabase.database,
  cache: false,
  synchronize: false,
  logging: false,
  entities: [],
  migrations: [],
  subscribers: [],
  namingStrategy: new SnakeNamingStrategy(),
};

const readConfig = {
  ...commonConfig,
  username: config.appDatabase.read_username,
  password: config.appDatabase.read_password,
};

const readWriteConfig = {
  ...commonConfig,
  username: config.appDatabase.read_write_username,
  password: config.appDatabase.read_write_password,
};

export const AppDbDataSourceRead = new DataSource(readConfig);
export const AppDbDataSourceReadWrite = new DataSource(readWriteConfig);
