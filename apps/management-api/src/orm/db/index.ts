import { config } from '@management-api/config/index.js';
import { AdminAccount } from '@management-api/orm/entities/adminAccount.js';
import { AdminAccountCredentials } from '@management-api/orm/entities/adminAccountCredentials.js';
import { AdminAccountPermissions } from '@management-api/orm/entities/adminAccountPermissions.js';
import { AdminAccountRole } from '@management-api/orm/entities/adminAccountRole.js';
import { DatabaseAuditLog } from '@management-api/orm/entities/databaseAuditLog.js';
import { ManagementAdminRole } from '@management-api/orm/entities/managementAdminRole.js';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';

import { SnakeNamingStrategy } from '@podverse/orm';

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
    ManagementAdminRole,
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
