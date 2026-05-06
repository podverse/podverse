import type { Account } from '@orm/entities/account/account.js';
import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

import type { AccountMembershipEnum, BillingCadence } from '@podverse/helpers';

import { AccountMembershipService } from './accountMembership.js';

export type AccountMembershipStatusDto = {
  account_membership_id: AccountMembershipEnum;
  membership_expires_at: Date | null;
  billing_cadence?: BillingCadence | null;
  auto_renew_mode?: 'off' | 'on';
  next_renewal_attempt_at?: Date | null;
  last_renewal_attempt_at?: Date | null;
  last_renewal_status?: 'none' | 'succeeded' | 'failed';
  last_extension_idempotency_key?: string | null;
  last_renewal_idempotency_key?: string | null;
  renewal_retry_count?: number;
  renewal_retry_backoff_until?: Date | null;
  allow_directory_add_by_rss?: boolean | null;
  max_add_by_rss_feeds?: number | null;
  max_manual_refreshes_per_hour?: number | null;
  track_stats?: boolean | null;
  allow_notifications?: boolean | null;
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

    const previousMembershipId = account.account_membership_status?.account_membership?.id;
    const membershipChanged =
      previousMembershipId !== undefined && previousMembershipId !== dto.account_membership_id;
    const finalDto = {
      account_membership: accountMembershipStatus,
      membership_expires_at: dto.membership_expires_at,
      billing_cadence:
        dto.billing_cadence !== undefined
          ? dto.billing_cadence
          : (account.account_membership_status?.billing_cadence ?? null),
      auto_renew_mode:
        dto.auto_renew_mode !== undefined
          ? dto.auto_renew_mode
          : (account.account_membership_status?.auto_renew_mode ?? 'off'),
      next_renewal_attempt_at:
        dto.next_renewal_attempt_at !== undefined
          ? dto.next_renewal_attempt_at
          : (account.account_membership_status?.next_renewal_attempt_at ?? null),
      last_renewal_attempt_at:
        dto.last_renewal_attempt_at !== undefined
          ? dto.last_renewal_attempt_at
          : (account.account_membership_status?.last_renewal_attempt_at ?? null),
      last_renewal_status:
        dto.last_renewal_status !== undefined
          ? dto.last_renewal_status
          : (account.account_membership_status?.last_renewal_status ?? 'none'),
      last_extension_idempotency_key:
        dto.last_extension_idempotency_key !== undefined
          ? dto.last_extension_idempotency_key
          : (account.account_membership_status?.last_extension_idempotency_key ?? null),
      last_renewal_idempotency_key:
        dto.last_renewal_idempotency_key !== undefined
          ? dto.last_renewal_idempotency_key
          : (account.account_membership_status?.last_renewal_idempotency_key ?? null),
      renewal_retry_count:
        dto.renewal_retry_count !== undefined
          ? dto.renewal_retry_count
          : (account.account_membership_status?.renewal_retry_count ?? 0),
      renewal_retry_backoff_until:
        dto.renewal_retry_backoff_until !== undefined
          ? dto.renewal_retry_backoff_until
          : (account.account_membership_status?.renewal_retry_backoff_until ?? null),
      allow_directory_add_by_rss:
        dto.allow_directory_add_by_rss !== undefined
          ? dto.allow_directory_add_by_rss
          : membershipChanged
            ? null
            : (account.account_membership_status?.allow_directory_add_by_rss ?? null),
      max_add_by_rss_feeds:
        dto.max_add_by_rss_feeds !== undefined
          ? dto.max_add_by_rss_feeds
          : membershipChanged
            ? null
            : (account.account_membership_status?.max_add_by_rss_feeds ?? null),
      max_manual_refreshes_per_hour:
        dto.max_manual_refreshes_per_hour !== undefined
          ? dto.max_manual_refreshes_per_hour
          : membershipChanged
            ? null
            : (account.account_membership_status?.max_manual_refreshes_per_hour ?? null),
      track_stats:
        dto.track_stats !== undefined
          ? dto.track_stats
          : membershipChanged
            ? null
            : (account.account_membership_status?.track_stats ?? null),
      allow_notifications:
        dto.allow_notifications !== undefined
          ? dto.allow_notifications
          : membershipChanged
            ? null
            : (account.account_membership_status?.allow_notifications ?? null),
    };

    return super._update(account, finalDto);
  }
}
