import { EntityManager } from 'typeorm';
import { Account } from '@orm/entities/account/account';
import { AccountResetPassword } from '@orm/entities/account/accountResetPassword';
import { BaseOneService } from '@orm/services/base/baseOneService';

export type AccountResetPasswordDto = {
  reset_token: string;
  reset_token_expires_at: Date;
};

export class AccountResetPasswordService extends BaseOneService<AccountResetPassword, 'account'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountResetPassword, 'account', transactionalEntityManager);
  }

  async get(account: Account): Promise<AccountResetPassword | null> {
    return super._get(account);
  }

  async getByToken(reset_token: string): Promise<AccountResetPassword | null> {
    return this.repositoryRead.findOne({
      where: { reset_token },
      relations: ['account'],
    });
  }

  async update(account: Account, dto: AccountResetPasswordDto): Promise<AccountResetPasswordDto> {
    return super._update(account, dto);
  }

  async deleteByAccountId(account_id: number): Promise<void> {
    await this.repositoryReadWrite.delete({ account: { id: account_id } });
  }
}
