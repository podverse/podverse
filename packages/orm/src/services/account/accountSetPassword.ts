import type { Account } from '@orm/entities/account/account.js';
import { AccountSetPassword } from '@orm/entities/account/accountSetPassword.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

export type AccountSetPasswordDto = {
  set_password_token: string;
  set_password_token_expires_at: Date;
};

export class AccountSetPasswordService extends BaseOneService<AccountSetPassword, 'account'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountSetPassword, 'account', transactionalEntityManager);
  }

  async get(account: Account): Promise<AccountSetPassword | null> {
    return super._get(account);
  }

  async getByToken(set_password_token: string): Promise<AccountSetPassword | null> {
    return this.repositoryRead.findOne({
      where: { set_password_token },
      relations: {
        account: true,
      },
    });
  }

  async update(account: Account, dto: AccountSetPasswordDto): Promise<AccountSetPasswordDto> {
    return super._update(account, dto);
  }

  async deleteByAccountId(account_id: number): Promise<void> {
    await this.repositoryReadWrite.delete({ account: { id: account_id } });
  }
}
