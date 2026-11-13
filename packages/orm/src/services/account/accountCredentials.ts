import type { Account } from '@orm/entities/account/account.js';
import { AccountCredentials } from '@orm/entities/account/accountCredentials.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

import { normalizeEmail } from '@podverse/helpers-validation';

export type AccountCredentialsDto = {
  email?: string | null;
  username?: string | null;
  password?: string;
};

export class AccountCredentialsService extends BaseOneService<AccountCredentials, 'account'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountCredentials, 'account', transactionalEntityManager);
  }

  /** The stored address is trimmed and lowercase. The lookup normalizes the typed address first. */
  async getByEmail(email: string): Promise<AccountCredentials | null> {
    const normalized = normalizeEmail(email);
    if (normalized === '') {
      return null;
    }
    return this.repositoryRead.findOne({ where: { email: normalized } });
  }

  async getByUsername(username: string): Promise<AccountCredentials | null> {
    return this.repositoryRead.findOne({ where: { username } });
  }

  async getByIdentifier(identifier: string): Promise<AccountCredentials | null> {
    if (identifier.includes('@')) {
      return this.getByEmail(identifier);
    }
    return this.getByUsername(identifier);
  }

  async update(account: Account, dto: AccountCredentialsDto): Promise<AccountCredentials> {
    const email =
      dto.email === undefined || dto.email === null ? dto.email : normalizeEmail(dto.email);
    return super._update(account, email === undefined ? dto : { ...dto, email });
  }
}
