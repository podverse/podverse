import { EntityManager } from 'typeorm';
import { Account } from '@orm/entities/account/account';
import { AccountEmailChangeVerification } from '@orm/entities/account/accountEmailChangeVerification';
import { BaseOneService } from '@orm/services/base/baseOneService';

export type AccountEmailChangeVerificationDto = {
  verification_token: string;
  verification_token_expires_at: Date;
  pending_email_address: string;
};

export class AccountEmailChangeVerificationService extends BaseOneService<AccountEmailChangeVerification, 'account'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountEmailChangeVerification, 'account', transactionalEntityManager);
  }

  async get(account: Account): Promise<AccountEmailChangeVerification | null> {
    return super._get(account);
  }

  async getByToken(verification_token: string): Promise<AccountEmailChangeVerification | null> {
    return this.repositoryRead.findOne({
      where: { verification_token },
      relations: ['account'],
    });
  }

  async create(account: Account, dto: AccountEmailChangeVerificationDto): Promise<AccountEmailChangeVerification> {
    const accountEmailChangeVerification = this.repositoryReadWrite.create(dto);
    return super._update(account, accountEmailChangeVerification);
  }

  async deleteByAccountId(account_id: number): Promise<void> {
    await this.repositoryReadWrite.delete({ account: { id: account_id } });
  }
}