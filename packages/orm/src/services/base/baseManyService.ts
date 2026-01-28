import {
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { getDataSourceRead, getDataSourceReadWrite, getLoggerService } from '@orm/context';
import { applyProperties } from '@orm/lib/applyProperties';
import { hasDifferentValues } from '@orm/lib/hasDifferentValues';

export class BaseManyService<T extends ObjectLiteral, K extends keyof T> {
  protected repositoryRead: Repository<T>;
  protected repositoryReadWrite: Repository<T>;
  protected parentEntityKey: K;
  protected targetEntity: { new (): T };
  private transactionalEntityManager?: EntityManager;

  constructor(
    targetEntity: { new (): T },
    parentEntityKey: K,
    transactionalEntityManager?: EntityManager
  ) {
    this.targetEntity = targetEntity;
    this.parentEntityKey = parentEntityKey;
    this.repositoryRead = getDataSourceRead().getRepository(targetEntity) as Repository<T>;
    this.repositoryReadWrite = getDataSourceReadWrite().getRepository(
      targetEntity
    ) as Repository<T>;
    if (transactionalEntityManager !== undefined) {
      this.transactionalEntityManager = transactionalEntityManager;
    }
  }

  private getParentWhereValue(parentEntity: T[K]) {
    if (parentEntity && typeof parentEntity === 'object' && 'id' in parentEntity) {
      return { id: (parentEntity as { id: number | string }).id };
    }
    return parentEntity;
  }

  public async _getAll(parentEntity: T[K], config?: FindManyOptions<T>): Promise<T[]> {
    const parentWhereValue = this.getParentWhereValue(parentEntity);
    const where: FindOptionsWhere<T> = {
      [this.parentEntityKey]: parentWhereValue,
    } as FindOptionsWhere<T>;
    return this.repositoryRead.find({ where, ...config });
  }

  public async _getAllWithCount(
    parentEntity: T[K],
    config?: FindManyOptions<T>
  ): Promise<{ count: number; results: T[] }> {
    const parentWhereValue = this.getParentWhereValue(parentEntity);
    const where: FindOptionsWhere<T> = {
      [this.parentEntityKey]: parentWhereValue,
    } as FindOptionsWhere<T>;
    const [results, count] = await this.repositoryRead.findAndCount({ where, ...config });
    return { count, results };
  }

  public async _get(
    parentEntity: T[K],
    whereKeyValues: Record<string, unknown>,
    config?: FindOneOptions<T>
  ): Promise<T | null> {
    const parentWhereValue = this.getParentWhereValue(parentEntity);
    const where: FindOptionsWhere<T> = {
      [this.parentEntityKey]: parentWhereValue,
      ...whereKeyValues,
    } as FindOptionsWhere<T>;
    return this.repositoryRead.findOne({ where, ...config });
  }

  public async _update(
    parentEntity: T[K],
    whereKeys: (keyof T)[], // If whereKeys is empty, it will always create a new entity
    dto: Partial<T>,
    config?: FindOneOptions<T>,
    existingEntity?: T
  ): Promise<T> {
    const whereObject: Partial<T> = {};
    whereKeys.forEach((key) => {
      if (key in dto) {
        whereObject[key as keyof T] = dto[key];
      }
    });

    let entity: T | null = existingEntity || null;

    if (!entity && Object.keys(whereObject).length > 0) {
      entity = await this._get(parentEntity, whereObject, config);
    }

    if (!entity) {
      entity = new this.targetEntity();
      entity[this.parentEntityKey] = parentEntity;
    } else if (!hasDifferentValues(entity, dto)) {
      return entity;
    }

    entity = applyProperties(entity, dto);
    const loggerService = getLoggerService();
    loggerService.debug(`Updating entity ${JSON.stringify(entity)}`);
    loggerService.debug(`With DTO ${JSON.stringify(dto)}`);

    return ((this.transactionalEntityManager as EntityManager) ?? this.repositoryReadWrite).save(
      entity
    );
  }

  public async _updateMany(
    parentEntity: T[K],
    whereKeys: (keyof T)[],
    dtos: Partial<T>[],
    config?: FindOneOptions<T>
  ): Promise<T[]> {
    const existingEntities = await this._getAll(parentEntity);

    const existingIdentifiers = dtos.map((dto: Partial<T>) => {
      const identifier: Partial<T> = {};
      for (const whereKey of whereKeys) {
        identifier[whereKey] = dto[whereKey];
      }
      return identifier;
    });

    const updatedEntities: T[] = [];

    // This prevents entries with duplicate unique constraint values
    // from attempting to be saved (which would cause a whole transaction to rollback).
    const uniqueIdentifiers = new Set<string>();
    const uniqueDtos = dtos.filter((dto) => {
      const identifier = whereKeys.map((key) => dto[key]).join('|');
      if (uniqueIdentifiers.has(identifier)) {
        return false;
      } else {
        uniqueIdentifiers.add(identifier);
        return true;
      }
    });

    for (const uniqueDto of uniqueDtos) {
      const matchingEntity = existingEntities.find((entity) =>
        whereKeys.every((key) => entity[key] === uniqueDto[key])
      );

      const updatedEntity = await this._update(
        parentEntity,
        whereKeys,
        uniqueDto,
        config,
        matchingEntity
      );
      updatedEntities.push(updatedEntity);
    }

    await ((this.transactionalEntityManager as EntityManager) ?? this.repositoryReadWrite).save(
      updatedEntities
    );

    const entitiesToDelete = existingEntities.filter((existingEntity) => {
      const identifier: Partial<T> = {};
      for (const whereKey of whereKeys) {
        identifier[whereKey] = existingEntity[whereKey];
      }
      return !existingIdentifiers.some(
        (existingIdentifier) => JSON.stringify(existingIdentifier) === JSON.stringify(identifier)
      );
    });

    if (entitiesToDelete.length > 0) {
      await ((this.transactionalEntityManager as EntityManager) ?? this.repositoryReadWrite).remove(
        entitiesToDelete
      );
    }

    return updatedEntities;
  }

  public async _delete(parentEntity: T[K], whereKeyValues: Record<string, unknown>): Promise<void> {
    const where: FindOptionsWhere<T> = {
      [this.parentEntityKey]: parentEntity,
      ...whereKeyValues,
    } as FindOptionsWhere<T>;

    const rowToDelete = await this.repositoryRead.findOne({ where });

    if (rowToDelete) {
      await ((this.transactionalEntityManager as EntityManager) ?? this.repositoryReadWrite).remove(
        rowToDelete
      );
    }
  }

  public async _deleteAll(value: T[K]): Promise<void> {
    const rowsToDelete = await this._getAll(value);
    if (rowsToDelete) {
      await ((this.transactionalEntityManager as EntityManager) ?? this.repositoryReadWrite).remove(
        rowsToDelete
      );
    }
  }
}
