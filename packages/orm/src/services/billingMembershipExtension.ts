import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { Account } from '@orm/entities/account/account.js';
import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus.js';
import { BillingEntitlementService } from '@orm/services/billingEntitlement.js';
import { BillingMembershipGrantService } from '@orm/services/billingMembershipGrant.js';
import type { DataSource, QueryDeepPartialEntity } from 'typeorm';

import type { BillingCadence, MembershipGrantSource } from '@podverse/helpers';
import {
  AccountMembershipEnum,
  extendMembershipPeriodByCadence,
  extendMembershipPeriodByMonths,
} from '@podverse/helpers';

type ExtendMembershipByCadenceParams = {
  accountId: number;
  cadence: BillingCadence;
  idempotencyKey: string;
  source?: MembershipGrantSource;
  accountMembershipId?: AccountMembershipEnum;
  billingSubscriptionId?: number | null;
  billingTransactionId?: number | null;
  membershipClaimTokenId?: string | null;
  now?: Date;
};

type ExtendMembershipByMonthsParams = {
  accountId: number;
  monthsToAdd: number;
  idempotencyKey: string;
  source?: MembershipGrantSource;
  accountMembershipId?: AccountMembershipEnum;
  billingSubscriptionId?: number | null;
  billingTransactionId?: number | null;
  membershipClaimTokenId?: string | null;
  now?: Date;
};

type ExtendMembershipToDateParams = {
  accountId: number;
  expiresAt: Date;
  idempotencyKey: string;
  source?: MembershipGrantSource;
  accountMembershipId?: AccountMembershipEnum;
  billingSubscriptionId?: number | null;
  billingTransactionId?: number | null;
  membershipClaimTokenId?: string | null;
  now?: Date;
};

type BillingMembershipExtensionServiceParams = {
  dataSourceRead?: DataSource;
  dataSourceReadWrite?: DataSource;
};

function resolveMembershipGrantStart(
  membershipExpiresAt: Date | null | undefined,
  now: Date
): Date {
  if (
    membershipExpiresAt !== null &&
    membershipExpiresAt !== undefined &&
    membershipExpiresAt > now
  ) {
    return membershipExpiresAt;
  }
  return now;
}

export class BillingMembershipExtensionService {
  private dataSourceRead: DataSource;
  private dataSourceReadWrite: DataSource;
  private billingMembershipGrantService: BillingMembershipGrantService;

  constructor(params?: BillingMembershipExtensionServiceParams) {
    this.dataSourceRead = params?.dataSourceRead ?? getDataSourceRead();
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();
    const billingEntitlementService = new BillingEntitlementService({
      dataSourceReadWrite: this.dataSourceReadWrite,
    });
    this.billingMembershipGrantService = new BillingMembershipGrantService({
      dataSourceRead: this.dataSourceRead,
      dataSourceReadWrite: this.dataSourceReadWrite,
      billingEntitlementService,
    });
  }

  private async getAccountMembershipStatusContext(accountId: number) {
    const accountRepository = this.dataSourceReadWrite.getRepository(Account);
    const account = await accountRepository.findOne({
      where: { id: accountId },
      relations: {
        account_membership_status: { account_membership: true },
      },
    });
    if (account === null) {
      throw new Error('Account not found');
    }
    if (
      account.account_membership_status === null ||
      account.account_membership_status === undefined
    ) {
      throw new Error('AccountMembershipStatus not found');
    }
    return { account, currentStatus: account.account_membership_status };
  }

  private async applyGrant(params: {
    accountId: number;
    endsAt: Date;
    idempotencyKey: string;
    source: MembershipGrantSource;
    accountMembershipId: AccountMembershipEnum;
    billingCadence?: BillingCadence | null;
    billingSubscriptionId?: number | null;
    billingTransactionId?: number | null;
    membershipClaimTokenId?: string | null;
    now: Date;
  }): Promise<{ applied: boolean; membershipExpiresAt: Date | null }> {
    const { account, currentStatus } = await this.getAccountMembershipStatusContext(
      params.accountId
    );
    if (currentStatus.last_extension_idempotency_key === params.idempotencyKey) {
      return { applied: false, membershipExpiresAt: currentStatus.membership_expires_at ?? null };
    }

    const startsAt = resolveMembershipGrantStart(currentStatus.membership_expires_at, params.now);
    if (params.endsAt < startsAt) {
      return { applied: false, membershipExpiresAt: currentStatus.membership_expires_at ?? null };
    }

    const grantResult = await this.billingMembershipGrantService.createGrant({
      accountId: params.accountId,
      source: params.source,
      startsAt,
      endsAt: params.endsAt,
      billingSubscriptionId: params.billingSubscriptionId,
      billingTransactionId: params.billingTransactionId,
      membershipClaimTokenId: params.membershipClaimTokenId,
      now: params.now,
    });

    const membershipChanged = currentStatus.account_membership?.id !== params.accountMembershipId;
    const updatePayload: QueryDeepPartialEntity<AccountMembershipStatus> = {
      last_extension_idempotency_key: params.idempotencyKey,
      account_membership: { id: params.accountMembershipId },
      billing_cadence: params.billingCadence ?? null,
    };
    if (membershipChanged) {
      updatePayload.allow_directory_add_by_rss = null;
      updatePayload.max_add_by_rss_feeds = null;
      updatePayload.max_manual_refreshes_per_hour = null;
      updatePayload.track_stats = null;
      updatePayload.allow_notifications = null;
    }

    await this.dataSourceReadWrite
      .getRepository(AccountMembershipStatus)
      .update({ account: { id: account.id } }, updatePayload);

    return {
      applied: true,
      membershipExpiresAt: grantResult.entitlement.membershipExpiresAt,
    };
  }

  async extendByCadence(params: ExtendMembershipByCadenceParams): Promise<{
    applied: boolean;
    membershipExpiresAt: Date | null;
  }> {
    const now = params.now ?? new Date();
    const { currentStatus } = await this.getAccountMembershipStatusContext(params.accountId);
    const endsAt = extendMembershipPeriodByCadence({
      membershipExpiresAt: currentStatus.membership_expires_at,
      cadence: params.cadence,
      now,
    });

    return this.applyGrant({
      accountId: params.accountId,
      endsAt,
      idempotencyKey: params.idempotencyKey,
      source: params.source ?? 'admin',
      accountMembershipId:
        params.accountMembershipId ??
        currentStatus.account_membership?.id ??
        AccountMembershipEnum.Premium,
      billingCadence: params.cadence,
      billingSubscriptionId: params.billingSubscriptionId,
      billingTransactionId: params.billingTransactionId,
      membershipClaimTokenId: params.membershipClaimTokenId,
      now,
    });
  }

  async extendByMonths(params: ExtendMembershipByMonthsParams): Promise<{
    applied: boolean;
    membershipExpiresAt: Date | null;
  }> {
    const now = params.now ?? new Date();
    const { currentStatus } = await this.getAccountMembershipStatusContext(params.accountId);
    const endsAt = extendMembershipPeriodByMonths({
      membershipExpiresAt: currentStatus.membership_expires_at,
      monthsToAdd: params.monthsToAdd,
      now,
    });

    return this.applyGrant({
      accountId: params.accountId,
      endsAt,
      idempotencyKey: params.idempotencyKey,
      source: params.source ?? 'admin',
      accountMembershipId:
        params.accountMembershipId ??
        currentStatus.account_membership?.id ??
        AccountMembershipEnum.Premium,
      billingCadence: currentStatus.billing_cadence ?? null,
      billingSubscriptionId: params.billingSubscriptionId,
      billingTransactionId: params.billingTransactionId,
      membershipClaimTokenId: params.membershipClaimTokenId,
      now,
    });
  }

  async extendToDate(params: ExtendMembershipToDateParams): Promise<{
    applied: boolean;
    membershipExpiresAt: Date | null;
  }> {
    const now = params.now ?? new Date();
    const { currentStatus } = await this.getAccountMembershipStatusContext(params.accountId);
    return this.applyGrant({
      accountId: params.accountId,
      endsAt: params.expiresAt,
      idempotencyKey: params.idempotencyKey,
      source: params.source ?? 'admin',
      accountMembershipId:
        params.accountMembershipId ??
        currentStatus.account_membership?.id ??
        AccountMembershipEnum.Premium,
      billingCadence: currentStatus.billing_cadence ?? null,
      billingSubscriptionId: params.billingSubscriptionId,
      billingTransactionId: params.billingTransactionId,
      membershipClaimTokenId: params.membershipClaimTokenId,
      now,
    });
  }
}
