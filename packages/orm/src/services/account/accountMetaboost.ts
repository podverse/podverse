import { AppDataSourceRead } from '@orm/db/index.js';
import { AccountMetaboost } from '@orm/entities/account/accountMetaboost.js';
import type { Repository } from 'typeorm';

export class AccountMetaboostService {
  protected repositoryRead: Repository<AccountMetaboost>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(AccountMetaboost);
  }

  async getSenderGuidByAccountId(accountId: number): Promise<string | null> {
    const row = await this.repositoryRead.findOne({ where: { account_id: accountId } });
    return row?.sender_guid ?? null;
  }
}
