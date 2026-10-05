import { getDataSourceReadWrite } from '@orm/context.js';
import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus.js';
import { BillingMembershipGrant } from '@orm/entities/billingMembershipGrant.js';
import { BillingSubscription } from '@orm/entities/billingSubscription.js';
import type { DataSource, EntityManager } from 'typeorm';

import type { AccountMembershipEnum, BillingCadence, MembershipAccess } from '@podverse/helpers';
import { computeMembershipAccess, parseExpirationEnvValue } from '@podverse/helpers';

const DEFAULT_RENEWAL_ENTITLEMENT_BUFFER_EXPIRATION = 172800;
const DEFAULT_PAYMENT_FAILURE_GRACE_EXPIRATION = 604800;

type BillingEntitlementServiceParams = {
  dataSourceReadWrite?: DataSource;
  renewalEntitlementBufferExpiration?: number;
  paymentFailureGraceExpiration?: number;
};

function resolveExpirationSeconds(params: {
  fromParams: number | undefined;
  envKey: string;
  fallback: number;
}): number {
  if (params.fromParams !== undefined) {
    return params.fromParams;
  }
  const parsed = parseExpirationEnvValue(process.env[params.envKey]);
  if (parsed === null) {
    return params.fallback;
  }
  return parsed;
}

type BillingEntitlementRecomputeResult = MembershipAccess & {
  billingCadence: BillingCadence | null;
};

export class BillingEntitlementService {
  private dataSourceReadWrite: DataSource;
  private renewalEntitlementBufferExpiration: number;
  private paymentFailureGraceExpiration: number;

  constructor(params?: BillingEntitlementServiceParams) {
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();

    this.renewalEntitlementBufferExpiration = resolveExpirationSeconds({
      fromParams: params?.renewalEntitlementBufferExpiration,
      envKey: 'BILLING_RENEWAL_ENTITLEMENT_BUFFER_EXPIRATION',
      fallback: DEFAULT_RENEWAL_ENTITLEMENT_BUFFER_EXPIRATION,
    });

    this.paymentFailureGraceExpiration = resolveExpirationSeconds({
      fromParams: params?.paymentFailureGraceExpiration,
      envKey: 'BILLING_PAYMENT_FAILURE_GRACE_EXPIRATION',
      fallback: DEFAULT_PAYMENT_FAILURE_GRACE_EXPIRATION,
    });
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

  private async loadLedgerWithManager(
    transactionalEntityManager: EntityManager,
    accountId: number
  ): Promise<{ grants: BillingMembershipGrant[]; subscriptions: BillingSubscription[] }> {
    const grants = await transactionalEntityManager.getRepository(BillingMembershipGrant).find({
      where: { account_id: accountId },
    });

    const subscriptions = await transactionalEntityManager.getRepository(BillingSubscription).find({
      where: { account_id: accountId },
      relations: { billing_processor_product: true },
      order: { current_period_end: 'DESC', id: 'DESC' },
    });

    return { grants, subscriptions };
  }

  private computeAccess(
    ledger: { grants: BillingMembershipGrant[]; subscriptions: BillingSubscription[] },
    now: Date
  ): MembershipAccess {
    return computeMembershipAccess({
      now,
      grants: ledger.grants.map((grant) => ({
        source: grant.source,
        startsAt: grant.starts_at,
        endsAt: grant.ends_at,
        revokedAt: grant.revoked_at,
      })),
      subscriptions: ledger.subscriptions.map((subscription) => ({
        status: subscription.status,
        purchaseKind: subscription.purchase_kind,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })),
      renewalEntitlementBufferExpiration: this.renewalEntitlementBufferExpiration,
      paymentFailureGraceExpiration: this.paymentFailureGraceExpiration,
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
    const ledger = await this.loadLedgerWithManager(transactionalEntityManager, accountId);
    return this.computeAccess(ledger, now);
  }

  async recomputeWithManager(
    transactionalEntityManager: EntityManager,
    accountId: number,
    now = new Date()
  ): Promise<BillingEntitlementRecomputeResult> {
    const statusRepository = transactionalEntityManager.getRepository(AccountMembershipStatus);
    const lockedStatus = await this.lockStatusWithManager(transactionalEntityManager, accountId);

    const ledger = await this.loadLedgerWithManager(transactionalEntityManager, accountId);
    const { subscriptions } = ledger;
    const access = this.computeAccess(ledger, now);

    const activeSubscription = subscriptions.find((subscription) => {
      if (
        subscription.status !== 'active' &&
        subscription.status !== 'in_grace_period' &&
        subscription.status !== 'cancelled_active'
      ) {
        return false;
      }
      return subscription.billing_processor_product?.billing_cadence !== undefined;
    });

    const billingCadence =
      activeSubscription?.billing_processor_product?.billing_cadence ??
      lockedStatus.billing_cadence ??
      null;

    await statusRepository.update(
      { account: { id: accountId } },
      {
        membership_expires_at: access.membershipExpiresAt,
        auto_renew_mode: access.activeAutoRenew ? 'on' : 'off',
        billing_cadence: billingCadence,
      }
    );

    return {
      ...access,
      billingCadence,
    };
  }

  getPaymentFailureGraceExpiration(): number {
    return this.paymentFailureGraceExpiration;
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
