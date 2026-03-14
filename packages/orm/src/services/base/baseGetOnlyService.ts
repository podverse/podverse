import { getDataSourceRead } from '@orm/context.js';
import type {
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';

interface EntityWithId extends ObjectLiteral {
  id: number;
}

export class BaseGetOnlyService<T extends EntityWithId> {
  protected repositoryRead: Repository<T>;

  constructor(entity: { new (): T }) {
    this.repositoryRead = getDataSourceRead().getRepository(entity) as Repository<T>;
  }

  async get(id: number, config?: FindOneOptions<T>): Promise<T | null> {
    const where: FindOptionsWhere<T> = { id } as FindOptionsWhere<T>;
    return this.repositoryRead.findOne({ where, ...config });
  }

  async getMany(config?: FindManyOptions<T>): Promise<T[]> {
    return this.repositoryRead.find(config);
  }
}
