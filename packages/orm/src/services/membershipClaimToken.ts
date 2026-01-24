import { AccountMembershipEnum } from '@podverse/helpers';
import { Repository } from 'typeorm';
import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db';
import { MembershipClaimToken } from '@orm/entities/membershipClaimToken';
import { AccountMembershipService } from '@orm/services/account/accountMembership';
import { AccountService } from '@orm/services/account/account';
import { AccountMembershipStatusService } from '@orm/services/account/accountMembershipStatus';

export class MembershipClaimTokenService {
  protected repositoryRead: Repository<MembershipClaimToken>;
  protected repositoryReadWrite: Repository<MembershipClaimToken>;
  protected accountMembershipService: AccountMembershipService;
  protected accountService: AccountService;
  protected accountMembershipStatusService: AccountMembershipStatusService;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(MembershipClaimToken);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(MembershipClaimToken);
    this.accountMembershipService = new AccountMembershipService();
    this.accountService = new AccountService();
    this.accountMembershipStatusService = new AccountMembershipStatusService();
  }

  async create(account_membership_id: AccountMembershipEnum, months_to_add: number): Promise<MembershipClaimToken> {
    if (!Number.isInteger(months_to_add) || months_to_add < 1) {
      throw new Error('months_to_add must be an integer 1 or larger');
    }

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

    const membershipClaimToken = await this.repositoryReadWrite.findOneBy({ id: membership_claim_token_id });
    if (!membershipClaimToken) {
      throw new Error('MembershipClaimToken not found');
    }

    if (membershipClaimToken.claimed) {
      throw new Error('MembershipClaimToken has already been claimed');
    }

    const accountMembershipStatus = await this.accountMembershipStatusService._get(account);
    const currentDate = new Date();
    const newExpirationDate = accountMembershipStatus?.membership_expires_at 
      ? new Date(accountMembershipStatus.membership_expires_at)
      : currentDate;

    newExpirationDate.setMonth(newExpirationDate.getMonth() + membershipClaimToken.months_to_add);

    await this.accountMembershipStatusService.update(account, {
      account_membership_id: membershipClaimToken.account_membership_id,
      membership_expires_at: newExpirationDate,
    });

    membershipClaimToken.claimed = true;
    await this.repositoryReadWrite.save(membershipClaimToken);
  }
}