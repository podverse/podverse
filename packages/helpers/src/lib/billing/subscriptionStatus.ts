/**
 * Lifecycle of a processor subscription, normalized across processors. Which statuses grant
 * access, and for how long, is decided by `computeMembershipAccess`.
 *
 * - `pending` — created, not yet approved or paid.
 * - `active` — paid and in good standing.
 * - `in_grace_period` — a renewal charge failed; access continues while it is retried.
 * - `past_due` — grace ran out; the processor may still retry, but access has stopped.
 * - `cancelled_active` — auto-renew turned off; the paid period runs to its end.
 * - `expired` — ended without renewing.
 * - `revoked` — refunded, charged back, or withdrawn by the store.
 */
export const BILLING_SUBSCRIPTION_STATUSES = [
  'pending',
  'active',
  'in_grace_period',
  'past_due',
  'cancelled_active',
  'expired',
  'revoked',
] as const;

export type BillingSubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number];
