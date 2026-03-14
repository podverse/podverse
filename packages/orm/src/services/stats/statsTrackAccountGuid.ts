import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { StatsTrackAccountGuid } from '@orm/entities/stats/statsTrackAccountGuid.js';
import { AccountService } from '@orm/services/account/account.js';
import type { Repository } from 'typeorm';

import { generateGuidV4 } from '@podverse/helpers';

export class StatsTrackAccountGuidService {
  private repositoryRead: Repository<StatsTrackAccountGuid>;
  private repositoryReadWrite: Repository<StatsTrackAccountGuid>;
  private accountService: AccountService;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(StatsTrackAccountGuid);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(StatsTrackAccountGuid);
    this.accountService = new AccountService();
  }

  async getByAccountId(account_id: number): Promise<StatsTrackAccountGuid | null> {
    let entity = await this.repositoryRead.findOne({ where: { account: { id: account_id } } });
    if (!entity) {
      entity = await this.create(account_id);
    } else if (
      entity &&
      new Date().getTime() - new Date(entity.updated_at).getTime() > 7 * 24 * 60 * 60 * 1000
    ) {
      entity.account_guid = generateGuidV4();
      entity = await this.repositoryReadWrite.save(entity);
    }
    return entity;
  }

  async create(account_id: number): Promise<StatsTrackAccountGuid> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }
    const account_guid = generateGuidV4();
    const newEntity = this.repositoryReadWrite.create({ account, account_guid });
    return this.repositoryReadWrite.save(newEntity);
  }

  async delete(account_id: number): Promise<void> {
    const entity = await this.repositoryReadWrite.findOne({
      where: { account: { id: account_id } },
    });
    if (entity) {
      await this.repositoryReadWrite.remove(entity);
    }
  }
}
