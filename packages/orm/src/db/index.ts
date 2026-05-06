import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import type { DataSource, EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm';

// Re-export entities
export { entities } from './entities.js';

// Types for the DataSource proxies
type DataSourceReadProxy = {
  readonly isInitialized: boolean;
  getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity>;
  initialize(): Promise<DataSource>;
  destroy(): Promise<void>;
  createQueryRunner(): ReturnType<DataSource['createQueryRunner']>;
  readonly manager: DataSource['manager'];
};

type DataSourceReadWriteProxy = DataSourceReadProxy & {
  transaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;
};

// Proxy objects that delegate to the context's DataSources
// This allows existing code using AppDataSourceRead.getRepository() to work
export const AppDataSourceRead: DataSourceReadProxy = {
  get isInitialized() {
    return getDataSourceRead().isInitialized;
  },
  getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity> {
    return getDataSourceRead().getRepository(target);
  },
  async initialize() {
    return getDataSourceRead().initialize();
  },
  async destroy() {
    return getDataSourceRead().destroy();
  },
  createQueryRunner() {
    return getDataSourceRead().createQueryRunner();
  },
  get manager() {
    return getDataSourceRead().manager;
  },
};

export const AppDataSourceReadWrite: DataSourceReadWriteProxy = {
  get isInitialized() {
    return getDataSourceReadWrite().isInitialized;
  },
  getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity> {
    return getDataSourceReadWrite().getRepository(target);
  },
  async initialize() {
    return getDataSourceReadWrite().initialize();
  },
  async destroy() {
    return getDataSourceReadWrite().destroy();
  },
  createQueryRunner() {
    return getDataSourceReadWrite().createQueryRunner();
  },
  get manager() {
    return getDataSourceReadWrite().manager;
  },
  transaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T> {
    return getDataSourceReadWrite().transaction(runInTransaction);
  },
};

export interface RepositoryOptions {
  dbuser: 'read' | 'read_write';
}
