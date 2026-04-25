import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { StatsTrackAccountGuidService } from '@orm/services/stats/statsTrackAccountGuid.js';
import type { EntityManager, EntityMetadata, FindOptionsWhere, ObjectLiteral } from 'typeorm';
import { Between, LessThan } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';

export abstract class BaseStatsTrackEventService<T extends ObjectLiteral> {
  protected abstract entity: new () => T;
  /** Must match the entity column property holding the tracked foreign id (e.g. item_id). */
  protected abstract entityIdField: string;
  protected statsTrackAccountGuidService: StatsTrackAccountGuidService;
  protected readWriteEntityManager: EntityManager;

  constructor() {
    this.statsTrackAccountGuidService = new StatsTrackAccountGuidService();
    this.readWriteEntityManager = AppDataSourceReadWrite.manager;
  }

  protected entityMetadata(): EntityMetadata {
    return this.readWriteEntityManager.connection.getMetadata(this.entity);
  }

  protected targetEntityIdColumnPropertyPath(): string {
    const meta = this.entityMetadata();
    const col = meta.findColumnWithPropertyPath(String(this.entityIdField));
    if (!col) {
      throw new Error(
        `stats track event: unknown entity id property ${String(this.entityIdField)}`
      );
    }

    return col.propertyPath;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract getEntityByIdText(id_text: string): Promise<any | null | undefined>;

  async _create(account_id: number, entity_id_text: string): Promise<void> {
    const accountGuid = await this.statsTrackAccountGuidService.getByAccountId(account_id);
    if (!accountGuid) {
      throw new Error('Account not found.');
    }

    const entity = await this.getEntityByIdText(entity_id_text);
    if (!entity) {
      throw new Error('Entity not found.');
    }

    const repo = this.readWriteEntityManager.getRepository(this.entity);

    const insertValues = {
      account_guid: accountGuid.account_guid,
      [this.entityIdField]: entity.id,
      created_at: new Date(),
    } as unknown as QueryDeepPartialEntity<T>;

    await repo.createQueryBuilder().insert().values(insertValues).orIgnore().execute();
  }

  async _getCountWithinTimeFrame(entity_id: number, minutes: number): Promise<number> {
    const now = new Date();
    const pastTime = new Date(now.getTime() - minutes * 60 * 1000);
    const count = await this.readWriteEntityManager.count(this.entity, {
      where: {
        [this.entityIdField]: entity_id,
        created_at: Between(pastTime, now),
      } as unknown as FindOptionsWhere<T>,
    });

    return count;
  }

  async _getTopEntitiesByEventCount(limit: number): Promise<number[]> {
    const idPath = this.targetEntityIdColumnPropertyPath();
    const alias = 'e';

    const rows = await this.readWriteEntityManager
      .createQueryBuilder(this.entity, alias)
      .select(`${alias}.${idPath}`, 'tid')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy(`${alias}.${idPath}`)
      .orderBy('cnt', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((row: { tid: string | number }) => Number(row.tid));
  }

  async _delete(account_id: number, entity_id_text: string): Promise<void> {
    const accountGuid = await this.statsTrackAccountGuidService.getByAccountId(account_id);
    if (!accountGuid) {
      throw new Error('Account not found.');
    }

    const entity = await this.getEntityByIdText(entity_id_text);
    if (!entity) {
      throw new Error('Entity not found.');
    }

    const repo = this.readWriteEntityManager.getRepository(this.entity);

    await repo.delete({
      account_guid: accountGuid.account_guid,
      [this.entityIdField]: entity.id,
    } as unknown as FindOptionsWhere<T>);
  }

  async _deleteOldEvents(minutes: number): Promise<void> {
    const now = new Date();
    const pastTime = new Date(now.getTime() - minutes * 60 * 1000);

    const oldEvents = await this.readWriteEntityManager.find(this.entity, {
      where: {
        created_at: LessThan(pastTime),
      } as unknown as FindOptionsWhere<T>,
    });

    if (oldEvents.length > 0) {
      await this.readWriteEntityManager.remove(oldEvents);
    }
  }
}
