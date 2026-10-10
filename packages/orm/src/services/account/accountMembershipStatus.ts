import type { Account } from '@orm/entities/account/account.js';
import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

import type { AccountMembershipEnum, BillingCadence } from '@podverse/helpers';

import { AccountMembershipService } from './accountMembership.js';

export type AccountMembershipStatusDto = {
  account_membership_id: AccountMembershipEnum;
  membership_expires_at?: Date | null;
  billing_cadence?: BillingCadence | null;
  last_extension_idempotency_key?: string | null;
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
    const finalDto: Partial<AccountMembershipStatus> = {
      account_membership: accountMembershipStatus,
    };
    if (dto.membership_expires_at !== undefined) {
      finalDto.membership_expires_at = dto.membership_expires_at;
    }
    if (dto.billing_cadence !== undefined) {
      finalDto.billing_cadence = dto.billing_cadence;
    }
    if (dto.last_extension_idempotency_key !== undefined) {
      finalDto.last_extension_idempotency_key = dto.last_extension_idempotency_key;
    }
    if (dto.allow_directory_add_by_rss !== undefined) {
      finalDto.allow_directory_add_by_rss = dto.allow_directory_add_by_rss;
    } else if (membershipChanged) {
      finalDto.allow_directory_add_by_rss = null;
    }
    if (dto.max_add_by_rss_feeds !== undefined) {
      finalDto.max_add_by_rss_feeds = dto.max_add_by_rss_feeds;
    } else if (membershipChanged) {
      finalDto.max_add_by_rss_feeds = null;
    }
    if (dto.max_manual_refreshes_per_hour !== undefined) {
      finalDto.max_manual_refreshes_per_hour = dto.max_manual_refreshes_per_hour;
    } else if (membershipChanged) {
      finalDto.max_manual_refreshes_per_hour = null;
    }
    if (dto.track_stats !== undefined) {
      finalDto.track_stats = dto.track_stats;
    } else if (membershipChanged) {
      finalDto.track_stats = null;
    }
    if (dto.allow_notifications !== undefined) {
      finalDto.allow_notifications = dto.allow_notifications;
    } else if (membershipChanged) {
      finalDto.allow_notifications = null;
    }

    return super._update(account, finalDto);
  }
}
