import type {
  BillingSubscriptionStatus,
  DTOBillingStatus,
  DTOBillingSubscription,
} from '@podverse/helpers';
import type { BillingSubscription } from '@podverse/orm';
import { AccountService, BillingSubscriptionService } from '@podverse/orm';

/** Statuses whose subscription still governs renewal or access. */
const GOVERNING_STATUSES: readonly BillingSubscriptionStatus[] = [
  'active',
  'in_grace_period',
  'cancelled_active',
];

const toIsoOrNull = (value: Date | null | undefined): string | null =>
  value === null || value === undefined ? null : value.toISOString();

export function toBillingSubscriptionDto(
  subscription: BillingSubscription
): DTOBillingSubscription {
  return {
    id: subscription.id,
    processor_id: subscription.processor_id,
    status: subscription.status,
    purchase_kind: subscription.purchase_kind,
    cadence: subscription.billing_processor_product?.billing_cadence ?? null,
    external_subscription_id: subscription.external_subscription_id,
    current_period_start: toIsoOrNull(subscription.current_period_start),
    current_period_end: toIsoOrNull(subscription.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    grace_period_ends_at: toIsoOrNull(subscription.grace_period_ends_at),
    banked_seconds: subscription.banked_seconds,
    created_at: subscription.created_at.toISOString(),
    updated_at: subscription.updated_at.toISOString(),
  };
}

/**
 * The subscription that governs renewal: one still charging on its own wins over one that was
 * cancelled and is running out. The list arrives latest period first.
 */
export function selectActiveSubscription(
  subscriptions: BillingSubscription[]
): BillingSubscription | null {
  const governing = subscriptions.filter((subscription) =>
    GOVERNING_STATUSES.includes(subscription.status)
  );
  return (
    governing.find((subscription) => subscription.status !== 'cancelled_active') ??
    governing[0] ??
    null
  );
}

/** Null when the account does not exist. */
export async function getBillingStatus(
  accountId: number,
  now: Date = new Date()
): Promise<DTOBillingStatus | null> {
  const account = await new AccountService().getWithMembershipStatusFromPrimary(accountId);
  if (account === null) {
    return null;
  }
  const subscriptions = await new BillingSubscriptionService().listForAccount(accountId);
  const activeSubscription = selectActiveSubscription(subscriptions);
  const membershipStatus = account.account_membership_status;
  const expiresAt = membershipStatus?.membership_expires_at ?? null;

  return {
    tier: membershipStatus?.account_membership?.tier ?? null,
    is_entitled: expiresAt !== null && expiresAt.getTime() > now.getTime(),
    membership_expires_at: toIsoOrNull(expiresAt),
    in_grace_period: activeSubscription?.status === 'in_grace_period',
    active_auto_renew: membershipStatus?.auto_renew_mode === 'on',
    billing_cadence: membershipStatus?.billing_cadence ?? null,
    billing_customer_ref: account.billing_customer_ref,
    active_subscription:
      activeSubscription === null ? null : toBillingSubscriptionDto(activeSubscription),
  };
}
