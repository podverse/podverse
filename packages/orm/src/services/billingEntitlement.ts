import { getDataSourceReadWrite } from '@orm/context.js';
import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus.js';
import { BillingMembershipGrant } from '@orm/entities/billingMembershipGrant.js';
import { BillingSubscription } from '@orm/entities/billingSubscription.js';
import type { DataSource, EntityManager } from 'typeorm';

import { computeMembershipAccess, parseExpirationEnvValue } from '@podverse/helpers';
import type { BillingCadence, MembershipAccess } from '@podverse/helpers';

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

  async recomputeWithManager(
    transactionalEntityManager: EntityManager,
    accountId: number,
    now = new Date()
  ): Promise<BillingEntitlementRecomputeResult> {
    const statusRepository = transactionalEntityManager.getRepository(AccountMembershipStatus);
    const lockedStatus = await statusRepository
      .createQueryBuilder('status')
      .setLock('pessimistic_write')
      .where('status.account_id = :accountId', { accountId })
      .getOne();
    if (!lockedStatus) {
      throw new Error('AccountMembershipStatus not found');
    }

    const grants = await transactionalEntityManager.getRepository(BillingMembershipGrant).find({
      where: { account_id: accountId },
    });

    const subscriptions = await transactionalEntityManager.getRepository(BillingSubscription).find({
      where: { account_id: accountId },
      relations: { billing_processor_product: true },
      order: { current_period_end: 'DESC', id: 'DESC' },
    });

    const access = computeMembershipAccess({
      now,
      grants: grants.map((grant) => ({
        source: grant.source,
        startsAt: grant.starts_at,
        endsAt: grant.ends_at,
        revokedAt: grant.revoked_at,
      })),
      subscriptions: subscriptions.map((subscription) => ({
        status: subscription.status,
        purchaseKind: subscription.purchase_kind,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })),
      renewalEntitlementBufferExpiration: this.renewalEntitlementBufferExpiration,
      paymentFailureGraceExpiration: this.paymentFailureGraceExpiration,
    });

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
      { account_id: accountId },
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
}

export type { BillingEntitlementRecomputeResult };
