import { AccountService } from '@orm/services/account/account.js';
import { AccountMembershipStatusService } from '@orm/services/account/accountMembershipStatus.js';

import {
  AccountMembershipEnum,
  type BillingCadence,
  extendMembershipPeriodByCadence,
  extendMembershipPeriodByMonths,
} from '@podverse/helpers';

type ExtendMembershipByCadenceParams = {
  accountId: number;
  cadence: BillingCadence;
  idempotencyKey: string;
  reason: string;
  now?: Date;
};

type ExtendMembershipByMonthsParams = {
  accountId: number;
  monthsToAdd: number;
  idempotencyKey: string;
  reason: string;
  now?: Date;
};

export class BillingMembershipExtensionService {
  private accountService: AccountService;
  private accountMembershipStatusService: AccountMembershipStatusService;

  constructor() {
    this.accountService = new AccountService();
    this.accountMembershipStatusService = new AccountMembershipStatusService();
  }

  async extendByCadence(params: ExtendMembershipByCadenceParams): Promise<{
    applied: boolean;
    membershipExpiresAt: Date | null;
  }> {
    const account = await this.accountService.get(params.accountId, {
      relations: ['account_membership_status', 'account_membership_status.account_membership'],
    });
    if (!account) {
      throw new Error('Account not found');
    }

    const currentStatus = account.account_membership_status;
    if (currentStatus?.last_extension_idempotency_key === params.idempotencyKey) {
      return {
        applied: false,
        membershipExpiresAt: currentStatus.membership_expires_at ?? null,
      };
    }

    const newExpirationDate = extendMembershipPeriodByCadence({
      membershipExpiresAt: currentStatus?.membership_expires_at,
      cadence: params.cadence,
      now: params.now,
    });

    await this.accountMembershipStatusService.update(account, {
      account_membership_id: currentStatus?.account_membership?.id ?? AccountMembershipEnum.Premium,
      membership_expires_at: newExpirationDate,
      billing_cadence: params.cadence,
      last_extension_idempotency_key: params.idempotencyKey,
      last_renewal_idempotency_key:
        currentStatus?.last_renewal_idempotency_key ??
        currentStatus?.last_extension_idempotency_key,
      last_renewal_status: currentStatus?.last_renewal_status ?? 'none',
      next_renewal_attempt_at: currentStatus?.next_renewal_attempt_at ?? null,
      last_renewal_attempt_at: currentStatus?.last_renewal_attempt_at ?? null,
      auto_renew_mode: currentStatus?.auto_renew_mode ?? 'off',
      renewal_retry_count: currentStatus?.renewal_retry_count ?? 0,
      renewal_retry_backoff_until: currentStatus?.renewal_retry_backoff_until ?? null,
    });

    return { applied: true, membershipExpiresAt: newExpirationDate };
  }

  async extendByMonths(params: ExtendMembershipByMonthsParams): Promise<{
    applied: boolean;
    membershipExpiresAt: Date | null;
  }> {
    const account = await this.accountService.get(params.accountId, {
      relations: ['account_membership_status', 'account_membership_status.account_membership'],
    });
    if (!account) {
      throw new Error('Account not found');
    }

    const currentStatus = account.account_membership_status;
    if (currentStatus?.last_extension_idempotency_key === params.idempotencyKey) {
      return {
        applied: false,
        membershipExpiresAt: currentStatus.membership_expires_at ?? null,
      };
    }

    const newExpirationDate = extendMembershipPeriodByMonths({
      membershipExpiresAt: currentStatus?.membership_expires_at,
      monthsToAdd: params.monthsToAdd,
      now: params.now,
    });

    await this.accountMembershipStatusService.update(account, {
      account_membership_id: currentStatus?.account_membership?.id ?? AccountMembershipEnum.Premium,
      membership_expires_at: newExpirationDate,
      last_extension_idempotency_key: params.idempotencyKey,
      last_renewal_idempotency_key:
        currentStatus?.last_renewal_idempotency_key ??
        currentStatus?.last_extension_idempotency_key,
      last_renewal_status: currentStatus?.last_renewal_status ?? 'none',
      next_renewal_attempt_at: currentStatus?.next_renewal_attempt_at ?? null,
      last_renewal_attempt_at: currentStatus?.last_renewal_attempt_at ?? null,
      auto_renew_mode: currentStatus?.auto_renew_mode ?? 'off',
      renewal_retry_count: currentStatus?.renewal_retry_count ?? 0,
      renewal_retry_backoff_until: currentStatus?.renewal_retry_backoff_until ?? null,
    });

    return { applied: true, membershipExpiresAt: newExpirationDate };
  }
}
