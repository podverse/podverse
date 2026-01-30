import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { config } from '@mgmt-api/config';
import { AdminAccount } from '@mgmt-api/orm/entities/adminAccount';
import { AdminAccountCredentials } from '@mgmt-api/orm/entities/adminAccountCredentials';
import { AdminAccountRole } from '@mgmt-api/orm/entities/adminAccountRole';

const commonConfig: DataSourceOptions = {
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  cache: false,
  synchronize: false,
  logging: false,
  entities: [AdminAccount, AdminAccountCredentials, AdminAccountRole],
  migrations: [],
  subscribers: [],
  namingStrategy: new SnakeNamingStrategy(),
};

const readConfig = {
  ...commonConfig,
  username: config.database.read_username,
  password: config.database.read_password,
};

const readWriteConfig = {
  ...commonConfig,
  username: config.database.read_write_username,
  password: config.database.read_write_password,
};

export const AppDataSourceRead = new DataSource(readConfig);
export const AppDataSourceReadWrite = new DataSource(readWriteConfig);
