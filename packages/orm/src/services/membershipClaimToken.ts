import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { MembershipClaimToken } from '@orm/entities/membershipClaimToken.js';
import { AccountService } from '@orm/services/account/account.js';
import { AccountMembershipService } from '@orm/services/account/accountMembership.js';
import { BillingMembershipExtensionService } from '@orm/services/billingMembershipExtension.js';
import { assertValidMonthsToAdd } from '@orm/services/membershipClaimToken.helpers.js';
import type { Repository } from 'typeorm';

import type { AccountMembershipEnum } from '@podverse/helpers';

export class MembershipClaimTokenService {
  protected repositoryRead: Repository<MembershipClaimToken>;
  protected repositoryReadWrite: Repository<MembershipClaimToken>;
  protected accountMembershipService: AccountMembershipService;
  protected accountService: AccountService;
  protected billingMembershipExtensionService: BillingMembershipExtensionService;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(MembershipClaimToken);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(MembershipClaimToken);
    this.accountMembershipService = new AccountMembershipService();
    this.accountService = new AccountService();
    this.billingMembershipExtensionService = new BillingMembershipExtensionService();
  }

  async create(
    account_membership_id: AccountMembershipEnum,
    months_to_add: number
  ): Promise<MembershipClaimToken> {
    assertValidMonthsToAdd(months_to_add);

    const accountMembership = await this.accountMembershipService.get(account_membership_id);

    if (!accountMembership) {
      throw new Error('AccountMembership not found');
    }

    const membershipClaimToken = this.repositoryReadWrite.create({
      account_membership_id,
      months_to_add,
      claimed: false,
    });

    return this.repositoryReadWrite.save(membershipClaimToken);
  }

  async claim(account_id: number, membership_claim_token_id: string): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found');
    }

    const membershipClaimToken = await this.repositoryReadWrite.findOneBy({
      id: membership_claim_token_id,
    });
    if (!membershipClaimToken) {
      throw new Error('MembershipClaimToken not found');
    }

    if (membershipClaimToken.claimed) {
      throw new Error('MembershipClaimToken has already been claimed');
    }

    await this.billingMembershipExtensionService.extendByMonths({
      accountId: account.id,
      monthsToAdd: membershipClaimToken.months_to_add,
      accountMembershipId: membershipClaimToken.account_membership_id,
      idempotencyKey: `claim:${membershipClaimToken.id}`,
      source: 'claim_token',
      membershipClaimTokenId: membershipClaimToken.id,
    });

    membershipClaimToken.claimed = true;
    await this.repositoryReadWrite.save(membershipClaimToken);
  }
}
