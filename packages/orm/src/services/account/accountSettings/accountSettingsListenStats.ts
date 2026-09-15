import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { AccountSettings } from '@orm/entities/account/accountSettings/accountSettings.js';
import type { Repository } from 'typeorm';

import type { PopularityTrackingDecision } from '@podverse/helpers';
import { isPopularityTrackingAllowed } from '@podverse/helpers';

type UpdateDto = {
  account_id: number;
  accepted: boolean;
  agreement_version: string;
};

export class AccountSettingsListenStatsService {
  protected repositoryRead: Repository<AccountSettings>;
  protected repositoryReadWrite: Repository<AccountSettings>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(AccountSettings);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(AccountSettings);
  }

  async getDecision(accountId: number): Promise<PopularityTrackingDecision | null> {
    const accountSettings = await this.repositoryRead.findOne({
      where: { account_id: accountId },
    });

    if (accountSettings === null) {
      return null;
    }

    return {
      listen_stats_accepted: accountSettings.listen_stats_accepted,
      listen_stats_agreement_version: accountSettings.listen_stats_agreement_version,
    };
  }

  async isListenStatsAllowed(accountId: number, currentVersion: string): Promise<boolean> {
    const decision = await this.getDecision(accountId);
    return isPopularityTrackingAllowed(decision, currentVersion);
  }

  async update(dto: UpdateDto): Promise<AccountSettings> {
    const accountSettings = await this.repositoryRead.findOne({
      where: { account_id: dto.account_id },
    });

    if (accountSettings === null) {
      throw new Error('AccountSettings not found for account');
    }

    const decidedAt = new Date();
    accountSettings.listen_stats_accepted = dto.accepted;
    accountSettings.listen_stats_agreement_version = dto.agreement_version;
    accountSettings.listen_stats_decided_at = decidedAt;
    accountSettings.allow_listen_stats = dto.accepted;
    return this.repositoryReadWrite.save(accountSettings);
  }
}
