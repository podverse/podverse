import type { EntityManager } from 'typeorm';
import type { Account } from '@orm/entities/account/account.js';
import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { AccountMembershipEnum } from '@podverse/helpers';
import { AccountMembershipService } from './accountMembership.js';

export type AccountMembershipStatusDto = {
  account_membership_id: AccountMembershipEnum;
  membership_expires_at: Date;
};

export class AccountMembershipStatusService extends BaseOneService<
  AccountMembershipStatus,
  'account'
> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountMembershipStatus, 'account', transactionalEntityManager);
  }

  async update(
    account: Account,
    dto: AccountMembershipStatusDto
  ): Promise<AccountMembershipStatus> {
    const accountMembership = new AccountMembershipService();
    const accountMembershipStatus = await accountMembership.get(dto.account_membership_id);
    if (!accountMembershipStatus) {
      throw new Error('AccountMembershipStatus not found');
    }

    const finalDto = {
      account_membership: accountMembershipStatus,
      membership_expires_at: dto.membership_expires_at,
    };

    return super._update(account, finalDto);
  }
}
