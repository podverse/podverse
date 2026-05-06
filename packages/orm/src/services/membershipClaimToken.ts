import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { MembershipClaimToken } from '@orm/entities/membershipClaimToken.js';
import { AccountService } from '@orm/services/account/account.js';
import { AccountMembershipService } from '@orm/services/account/accountMembership.js';
import { AccountMembershipStatusService } from '@orm/services/account/accountMembershipStatus.js';
import { BillingRenewalOrchestratorService } from '@orm/services/billingRenewalOrchestrator.js';
import {
  assertValidMonthsToAdd,
  calculateMembershipExpirationDate,
} from '@orm/services/membershipClaimToken.helpers.js';
import type { Repository } from 'typeorm';

import type { AccountMembershipEnum } from '@podverse/helpers';

export class MembershipClaimTokenService {
  protected repositoryRead: Repository<MembershipClaimToken>;
  protected repositoryReadWrite: Repository<MembershipClaimToken>;
  protected accountMembershipService: AccountMembershipService;
  protected accountService: AccountService;
  protected accountMembershipStatusService: AccountMembershipStatusService;
  protected billingRenewalOrchestratorService: BillingRenewalOrchestratorService;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(MembershipClaimToken);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(MembershipClaimToken);
    this.accountMembershipService = new AccountMembershipService();
    this.accountService = new AccountService();
    this.accountMembershipStatusService = new AccountMembershipStatusService();
    this.billingRenewalOrchestratorService = new BillingRenewalOrchestratorService();
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

    const accountMembershipStatus = await this.accountMembershipStatusService._get(account);
    if (!accountMembershipStatus) {
      throw new Error('AccountMembershipStatus not found');
    }

    const newExpirationDate = calculateMembershipExpirationDate(
      accountMembershipStatus.membership_expires_at,
      membershipClaimToken.months_to_add
    );

    await this.accountMembershipStatusService.update(account, {
      account_membership_id: membershipClaimToken.account_membership_id,
      membership_expires_at: newExpirationDate,
    });

    await this.billingRenewalOrchestratorService.handlePayOnDemandExtensionRequested({
      accountId: account.id,
      monthsToAdd: 0,
      idempotencyKey: `claim:${membershipClaimToken.id}`,
      source: 'membership_claim_token',
    });

    membershipClaimToken.claimed = true;
    await this.repositoryReadWrite.save(membershipClaimToken);
  }
}
