import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context';

// Re-export entities
export { entities } from './entities';

// Type for the DataSource proxy
type DataSourceProxy = {
  readonly isInitialized: boolean;
  getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity>;
  initialize(): Promise<DataSource>;
  destroy(): Promise<void>;
  createQueryRunner(): ReturnType<DataSource['createQueryRunner']>;
  readonly manager: DataSource['manager'];
};

// Proxy objects that delegate to the context's DataSources
// This allows existing code using AppDataSourceRead.getRepository() to work
export const AppDataSourceRead: DataSourceProxy = {
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

export const AppDataSourceReadWrite: DataSourceProxy = {
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
};

export interface RepositoryOptions {
  dbuser: 'read' | 'read_write';
}
