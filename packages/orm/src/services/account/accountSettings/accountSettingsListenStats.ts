import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { AccountSettings } from '@orm/entities/account/accountSettings/accountSettings.js';
import type { Repository } from 'typeorm';

type UpdateDto = {
  account_id: number;
  allow_listen_stats: boolean;
};

export class AccountSettingsListenStatsService {
  protected repositoryRead: Repository<AccountSettings>;
  protected repositoryReadWrite: Repository<AccountSettings>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(AccountSettings);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(AccountSettings);
  }

  async getAllowListenStats(accountId: number): Promise<boolean> {
    const accountSettings = await this.repositoryRead.findOne({
      where: { account_id: accountId },
    });

    if (accountSettings === null) {
      return true;
    }

    return accountSettings.allow_listen_stats;
  }

  async update(dto: UpdateDto): Promise<AccountSettings> {
    const accountSettings = await this.repositoryRead.findOne({
      where: { account_id: dto.account_id },
    });

    if (accountSettings === null) {
      throw new Error('AccountSettings not found for account');
    }

    accountSettings.allow_listen_stats = dto.allow_listen_stats;
    return this.repositoryReadWrite.save(accountSettings);
  }
}
