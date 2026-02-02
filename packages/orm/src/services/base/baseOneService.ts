import type {
  EntityManager,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { getDataSourceRead, getDataSourceReadWrite, getLoggerService } from '@orm/context.js';
import { applyProperties } from '@orm/lib/applyProperties.js';
import { hasDifferentValues } from '@orm/lib/hasDifferentValues.js';

export class BaseOneService<T extends ObjectLiteral, K extends keyof T> {
  private parentEntityKey: K;
  protected repositoryRead: Repository<T>;
  protected repositoryReadWrite: Repository<T>;
  private transactionalEntityManager?: EntityManager;

  constructor(
    entity: { new (): T },
    parentEntityKey: K,
    transactionalEntityManager?: EntityManager
  ) {
    this.parentEntityKey = parentEntityKey;
    this.repositoryRead = getDataSourceRead().getRepository(entity) as Repository<T>;
    this.repositoryReadWrite = getDataSourceReadWrite().getRepository(entity) as Repository<T>;
    if (transactionalEntityManager !== undefined) {
      this.transactionalEntityManager = transactionalEntityManager;
    }
  }

  async _get(parentEntity: T[K], config?: FindOneOptions<T>): Promise<T | null> {
    const where: FindOptionsWhere<T> = {
      [this.parentEntityKey]: { id: parentEntity.id },
    } as FindOptionsWhere<T>;
    return this.repositoryRead.findOne({ where, ...config });
  }

  async _update(parentEntity: T[K], dto: Partial<T>, config?: FindOneOptions<T>): Promise<T> {
    let entity = await this._get(parentEntity, config);
    const loggerService = getLoggerService();

    loggerService.debug(`parentEntityKey: ${this.parentEntityKey as string}`);
    loggerService.debug(`dto: ${dto ? JSON.stringify(dto) : 'null'}`);
    loggerService.debug(`config: ${config ? JSON.stringify(config) : 'null'}`);
    loggerService.debug(`Entity exists: ${!!entity}`);
    loggerService.debug(
      `Entity has different values: ${entity ? hasDifferentValues(entity, dto) : 'N/A'}`
    );

    if (!entity) {
      entity = new (this.repositoryReadWrite.target as { new (): T })();
      entity[this.parentEntityKey] = parentEntity;
    } else if (!hasDifferentValues(entity, dto)) {
      return entity;
    }

    entity = applyProperties(entity, dto);
    loggerService.debug(`Updating entity ${JSON.stringify(entity)}`);
    loggerService.debug(`With DTO ${JSON.stringify(dto)}`);

    return ((this.transactionalEntityManager as EntityManager) ?? this.repositoryReadWrite).save(
      entity
    );
  }

  public async _delete(parentEntity: T[K]): Promise<void> {
    const rowToDelete = await this._get(parentEntity);
    if (rowToDelete) {
      await this.repositoryReadWrite.remove(rowToDelete);
    }
  }
}
