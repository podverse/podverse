import { EntityManager, Between, LessThan } from 'typeorm';
import { AppDataSourceReadWrite } from '@orm/db';
import { StatsTrackAccountGuidService } from '@orm/services/stats/statsTrackAccountGuid';

export abstract class BaseStatsTrackEventService<T> {
  protected abstract entity: new () => T;
  protected abstract entityName: string;
  protected abstract entityIdField: string;
  protected abstract entityIdTextField: string;
  protected statsTrackAccountGuidService: StatsTrackAccountGuidService;
  protected readWriteEntityManager: EntityManager;

  constructor() {
    this.statsTrackAccountGuidService = new StatsTrackAccountGuidService();
    this.readWriteEntityManager = AppDataSourceReadWrite.manager;
  }

  // TODO: how to remove this any?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract getEntityByIdText(id_text: string): Promise<any | null | undefined>;

  async _create(account_id: number, entity_id_text: string): Promise<void> {
    const accountGuid = await this.statsTrackAccountGuidService.getByAccountId(account_id);
    if (!accountGuid) {
      throw new Error('Account not found.');
    }

    const entity = await this.getEntityByIdText(entity_id_text);
    if (!entity) {
      throw new Error(`${this.entityName} not found.`);
    }

    const existingEntity = await this.readWriteEntityManager.query(
      `SELECT * FROM ${this.entityName} WHERE account_guid = $1 AND ${this.entityIdField} = $2`,
      [accountGuid.account_guid, entity.id]
    );
    if (existingEntity.length > 0) {
      return;
    }

    const newEntity = {
      account_guid: accountGuid.account_guid,
      [this.entityIdField]: entity.id,
      created_at: new Date(),
    };
    await this.readWriteEntityManager.query(
      `INSERT INTO ${this.entityName} (account_guid, ${this.entityIdField}, created_at) VALUES ($1, $2, $3)`,
      [newEntity.account_guid, newEntity[this.entityIdField], newEntity.created_at]
    );
  }

  async _getCountWithinTimeFrame(entity_id: number, minutes: number): Promise<number> {
    const now = new Date();
    const pastTime = new Date(now.getTime() - minutes * 60 * 1000);
    const count = await this.readWriteEntityManager.count(this.entity, {
      where: {
        [this.entityIdField]: entity_id,
        created_at: Between(pastTime, now),
      },
    });

    return count;
  }

  async _getTopEntitiesByEventCount(limit: number): Promise<number[]> {
    const result = await this.readWriteEntityManager.query(
      `SELECT ${this.entityIdField}, COUNT(*) as event_count
       FROM ${this.entityName}
       GROUP BY ${this.entityIdField}
       ORDER BY event_count DESC
       LIMIT $1`,
      [limit]
    );

    return result.map((row: { [key: string]: number }) => row[this.entityIdField]);
  }

  async _delete(account_id: number, entity_id_text: string): Promise<void> {
    const accountGuid = await this.statsTrackAccountGuidService.getByAccountId(account_id);
    if (!accountGuid) {
      throw new Error('Account not found.');
    }

    const entity = await this.getEntityByIdText(entity_id_text);
    if (!entity) {
      throw new Error(`${this.entityName} not found.`);
    }

    const existingEntity = await this.readWriteEntityManager.query(
      `SELECT * FROM ${this.entityName} WHERE account_guid = $1 AND ${this.entityIdField} = $2`,
      [accountGuid.account_guid, entity.id]
    );
    if (existingEntity.length > 0) {
      await this.readWriteEntityManager.query(
        `DELETE FROM ${this.entityName} WHERE account_guid = $1 AND ${this.entityIdField} = $2`,
        [accountGuid.account_guid, entity.id]
      );
    }
  }

  async _deleteOldEvents(minutes: number): Promise<void> {
    const now = new Date();
    const pastTime = new Date(now.getTime() - minutes * 60 * 1000);

    const oldEvents = await this.readWriteEntityManager.find(this.entity, {
      where: {
        created_at: LessThan(pastTime),
      },
    });

    if (oldEvents.length > 0) {
      await this.readWriteEntityManager.remove(oldEvents);
    }
  }
}
