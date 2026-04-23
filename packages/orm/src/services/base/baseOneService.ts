import { getDataSourceRead, getDataSourceReadWrite, getLoggerService } from '@orm/context.js';
import { applyProperties } from '@orm/lib/applyProperties.js';
import { hasDifferentValues } from '@orm/lib/hasDifferentValues.js';
import type {
  EntityManager,
  EntityTarget,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';

import { redactForLog } from '@podverse/helpers-backend';

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

  private getWriteRepository(): Repository<T> {
    if (this.transactionalEntityManager !== undefined) {
      return this.transactionalEntityManager.getRepository(
        this.repositoryReadWrite.target as EntityTarget<T>
      );
    }

    return this.repositoryReadWrite;
  }

  private async _getForWrite(parentEntity: T[K], config?: FindOneOptions<T>): Promise<T | null> {
    const where: FindOptionsWhere<T> = {
      [this.parentEntityKey]: { id: parentEntity.id },
    } as FindOptionsWhere<T>;
    return this.getWriteRepository().findOne({ where, ...config });
  }

  async _update(parentEntity: T[K], dto: Partial<T>, config?: FindOneOptions<T>): Promise<T> {
    let entity = await this._getForWrite(parentEntity, config);
    const loggerService = getLoggerService();

    loggerService.debug(`parentEntityKey: ${this.parentEntityKey as string}`);
    loggerService.debug(
      `dto: ${dto ? JSON.stringify(redactForLog(dto as Record<string, unknown>)) : 'null'}`
    );
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
    loggerService.debug(
      `Updating entity ${JSON.stringify(redactForLog(entity as Record<string, unknown>))}`
    );
    loggerService.debug(`With DTO ${JSON.stringify(redactForLog(dto as Record<string, unknown>))}`);

    return this.getWriteRepository().save(entity);
  }

  public async _delete(parentEntity: T[K]): Promise<void> {
    const rowToDelete = await this._getForWrite(parentEntity);
    if (rowToDelete) {
      await this.getWriteRepository().remove(rowToDelete);
    }
  }
}
