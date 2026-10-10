import { getDataSourceReadWrite } from '@orm/context.js';
import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus.js';
import { BillingMembershipGrant } from '@orm/entities/billingMembershipGrant.js';
import type { DataSource, EntityManager } from 'typeorm';

import type { AccountMembershipEnum, BillingCadence, MembershipAccess } from '@podverse/helpers';
import { computeMembershipAccess } from '@podverse/helpers';

type BillingEntitlementServiceParams = {
  dataSourceReadWrite?: DataSource;
};

type BillingEntitlementRecomputeResult = MembershipAccess & {
  billingCadence: BillingCadence | null;
};

export class BillingEntitlementService {
  private dataSourceReadWrite: DataSource;

  constructor(params?: BillingEntitlementServiceParams) {
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();
  }

  async recompute(accountId: number, now = new Date()): Promise<BillingEntitlementRecomputeResult> {
    return this.dataSourceReadWrite.transaction(async (transactionalEntityManager) =>
      this.recomputeWithManager(transactionalEntityManager, accountId, now)
    );
  }

  /** Takes the account's membership status row lock for the rest of the transaction. */
  async lockStatusWithManager(
    transactionalEntityManager: EntityManager,
    accountId: number
  ): Promise<AccountMembershipStatus> {
    const lockedStatus = await transactionalEntityManager
      .getRepository(AccountMembershipStatus)
      .createQueryBuilder('status')
      .setLock('pessimistic_write')
      .where('status.account_id = :accountId', { accountId })
      .getOne();
    if (!lockedStatus) {
      throw new Error('AccountMembershipStatus not found');
    }
    return lockedStatus;
  }

  private async loadGrantsWithManager(
    transactionalEntityManager: EntityManager,
    accountId: number
  ): Promise<BillingMembershipGrant[]> {
    return transactionalEntityManager.getRepository(BillingMembershipGrant).find({
      where: { account_id: accountId },
    });
  }

  private computeAccess(grants: BillingMembershipGrant[], now: Date): MembershipAccess {
    return computeMembershipAccess({
      now,
      grants: grants.map((grant) => ({
        source: grant.source,
        startsAt: grant.starts_at,
        endsAt: grant.ends_at,
        revokedAt: grant.revoked_at,
      })),
    });
  }

  /**
   * The access the ledger grants right now, without writing the cache. Callers that need to
   * decide something before committing (for example, whether shortening a membership stuck) read
   * this under the account lock; the cache is still written only by `recomputeWithManager`.
   */
  async computeAccessWithManager(
    transactionalEntityManager: EntityManager,
    accountId: number,
    now = new Date()
  ): Promise<MembershipAccess> {
    const grants = await this.loadGrantsWithManager(transactionalEntityManager, accountId);
    return this.computeAccess(grants, now);
  }

  async recomputeWithManager(
    transactionalEntityManager: EntityManager,
    accountId: number,
    now = new Date()
  ): Promise<BillingEntitlementRecomputeResult> {
    const statusRepository = transactionalEntityManager.getRepository(AccountMembershipStatus);
    const lockedStatus = await this.lockStatusWithManager(transactionalEntityManager, accountId);
    const grants = await this.loadGrantsWithManager(transactionalEntityManager, accountId);
    const access = this.computeAccess(grants, now);

    await statusRepository.update(
      { account: { id: accountId } },
      { membership_expires_at: access.membershipExpiresAt }
    );

    return {
      membershipExpiresAt: access.membershipExpiresAt,
      isEntitled: access.isEntitled,
      billingCadence: lockedStatus.billing_cadence ?? null,
    };
  }

  /**
   * Runs `work` in one transaction that holds the account's membership status row lock, then
   * recomputes the entitlement cache before committing. Every ledger write for an account goes
   * through here, so two events for the same account cannot interleave their reads and writes.
   */
  async withAccountLock<T>(
    accountId: number,
    work: (transactionalEntityManager: EntityManager) => Promise<T>,
    now = new Date()
  ): Promise<{ result: T; entitlement: BillingEntitlementRecomputeResult }> {
    return this.dataSourceReadWrite.transaction(async (transactionalEntityManager) => {
      await this.lockStatusWithManager(transactionalEntityManager, accountId);

      const result = await work(transactionalEntityManager);
      const entitlement = await this.recomputeWithManager(
        transactionalEntityManager,
        accountId,
        now
      );
      return { result, entitlement };
    });
  }

  /**
   * Moves the account to `accountMembershipId`. Changing tier clears the per-account overrides,
   * which were set against the previous tier's limits.
   */
  async setAccountMembershipWithManager(
    transactionalEntityManager: EntityManager,
    accountId: number,
    accountMembershipId: AccountMembershipEnum
  ): Promise<void> {
    const statusRepository = transactionalEntityManager.getRepository(AccountMembershipStatus);
    const status = await statusRepository
      .createQueryBuilder('status')
      .leftJoinAndSelect('status.account_membership', 'account_membership')
      .where('status.account_id = :accountId', { accountId })
      .getOne();
    if (!status) {
      throw new Error('AccountMembershipStatus not found');
    }
    if (status.account_membership?.id === accountMembershipId) {
      return;
    }

    await statusRepository.update(
      { account: { id: accountId } },
      {
        account_membership: { id: accountMembershipId },
        allow_directory_add_by_rss: null,
        max_add_by_rss_feeds: null,
        max_manual_refreshes_per_hour: null,
        track_stats: null,
        allow_notifications: null,
      }
    );
  }
}

export type { BillingEntitlementRecomputeResult };
