import type { Account } from '@orm/entities/account/account.js';
import { AccountCredentials } from '@orm/entities/account/accountCredentials.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

export type AccountCredentialsDto = {
  email?: string;
  password?: string;
};

export class AccountCredentialsService extends BaseOneService<AccountCredentials, 'account'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountCredentials, 'account', transactionalEntityManager);
  }

  async getByEmail(email: string): Promise<AccountCredentials | null> {
    return this.repositoryRead.findOne({ where: { email } });
  }

  async update(account: Account, dto: AccountCredentialsDto): Promise<AccountCredentials> {
    return super._update(account, dto);
  }
}
