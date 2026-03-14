import type { Account } from '@orm/entities/account/account.js';
import { AccountVerification } from '@orm/entities/account/accountVerification.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

export type AccountVerificationDto = {
  verification_token: string;
  verification_token_expires_at: Date;
};

export class AccountVerificationService extends BaseOneService<AccountVerification, 'account'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountVerification, 'account', transactionalEntityManager);
  }

  async get(account: Account): Promise<AccountVerification | null> {
    return super._get(account);
  }

  async getByToken(verification_token: string): Promise<AccountVerification | null> {
    return this.repositoryRead.findOne({
      where: { verification_token },
      relations: ['account'],
    });
  }

  async update(account: Account, dto: AccountVerificationDto): Promise<AccountVerificationDto> {
    return super._update(account, dto);
  }

  async deleteByAccountId(account_id: number): Promise<void> {
    await this.repositoryReadWrite.delete({ account: { id: account_id } });
  }
}
