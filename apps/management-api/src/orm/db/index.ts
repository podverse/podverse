import { config } from '@mgmt-api/config/index.js';
import { AdminAccount } from '@mgmt-api/orm/entities/adminAccount.js';
import { AdminAccountCredentials } from '@mgmt-api/orm/entities/adminAccountCredentials.js';
import { AdminAccountPermissions } from '@mgmt-api/orm/entities/adminAccountPermissions.js';
import { AdminAccountRole } from '@mgmt-api/orm/entities/adminAccountRole.js';
import { DatabaseAuditLog } from '@mgmt-api/orm/entities/databaseAuditLog.js';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const commonConfig: DataSourceOptions = {
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  cache: false,
  synchronize: false,
  logging: false,
  entities: [
    AdminAccount,
    AdminAccountCredentials,
    AdminAccountPermissions,
    AdminAccountRole,
    DatabaseAuditLog,
  ],
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
