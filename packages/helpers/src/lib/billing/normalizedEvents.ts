import type { PaymentProcessorId } from './paymentProcessorId.js';
import type { PurchaseKind } from './purchaseKind.js';

/**
 * Processor notifications translated into one vocabulary. Each processor adapter maps its own
 * webhook or store notification to these events, and everything past the adapter handles only
 * these, so adding a processor does not touch the ledger or the routes.
 *
 * Timestamps are ISO-8601 UTC strings so an event survives a JSON round trip unchanged.
 */

export const BILLING_REVOCATION_REASONS = ['refund', 'chargeback', 'store_revoke'] as const;

export type BillingRevocationReason = (typeof BILLING_REVOCATION_REASONS)[number];

/** An amount in major units as a decimal string (`"4.99"`), so no currency exponent is assumed. */
export interface BillingAmount {
  value: string;
  /** ISO 4217 code. */
  currencyCode: string;
}

interface NormalizedBillingEventBase {
  processor: PaymentProcessorId;
  /** The processor's id for this notification. Unique per processor, so redelivery is a no-op. */
  processorEventId: string;
  /**
   * `account.billing_customer_ref` as echoed back by the processor (Apple `appAccountToken`, Google
   * `obfuscatedExternalAccountId`, PayPal `custom_id`). Null when the processor did not echo it.
   */
  accountBillingCustomerRef: string | null;
  /** Set when the account is already known, as when a signed-in client posts its own purchase. */
  accountId: number | null;
  /**
   * When the processor says the event happened. Compare this, not arrival order, when deciding
   * whether an event is older than the state already recorded.
   */
  occurredAt: string;
  /** A sandbox purchase. In production these grant access only to allowlisted accounts. */
  isSandbox: boolean;
}

/** What was bought. Google Play needs both ids; other processors leave the base plan id null. */
interface BillingProductRefs {
  externalProductId: string | null;
  externalBasePlanId: string | null;
}

/**
 * The processor's subscription id: the PayPal subscription id, the Apple original transaction id,
 * or the Google Play purchase token.
 */
interface BillingSubscriptionRef {
  externalSubscriptionId: string;
}

/**
 * Money arrived for a new purchase: a one-time purchase, or the first charge of a subscription.
 * Later charges on a subscription are `subscription_renewed`.
 */
export interface PaymentSettledEvent extends NormalizedBillingEventBase, BillingProductRefs {
  type: 'payment_settled';
  purchaseKind: PurchaseKind;
  externalTransactionId: string;
  /** Set when this payment starts a subscription. */
  externalSubscriptionId: string | null;
  /** The paid period, when the processor reports one; otherwise it follows from the cadence. */
  periodStart: string | null;
  periodEnd: string | null;
  amount: BillingAmount | null;
}

/**
 * A subscription entered good standing without a charge in this event: approval of a subscription
 * whose first charge is scheduled later, or auto-renew switched back on.
 */
export interface SubscriptionActivatedEvent
  extends NormalizedBillingEventBase, BillingProductRefs, BillingSubscriptionRef {
  type: 'subscription_activated';
  periodStart: string | null;
  periodEnd: string | null;
}

/** A renewal charge succeeded, including a retry that recovers a failed renewal. */
export interface SubscriptionRenewedEvent
  extends NormalizedBillingEventBase, BillingProductRefs, BillingSubscriptionRef {
  type: 'subscription_renewed';
  externalTransactionId: string;
  periodStart: string;
  periodEnd: string;
  amount: BillingAmount | null;
}

/**
 * A renewal charge failed. The subscription moves to `in_grace_period`, and access continues for
 * the payment-failure grace window while the charge is retried.
 */
export interface SubscriptionRenewalFailedEvent
  extends NormalizedBillingEventBase, BillingSubscriptionRef {
  type: 'subscription_renewal_failed';
  /** End of the period that failed to renew, when the processor reports it. */
  periodEnd: string | null;
}

/**
 * The processor put the subscription in its own grace period. Handled like
 * `subscription_renewal_failed`; access follows the Podverse grace window either way.
 */
export interface GraceEnteredEvent extends NormalizedBillingEventBase, BillingSubscriptionRef {
  type: 'grace_entered';
  periodEnd: string | null;
  /** The processor's grace end, when it reports one. Informational only. */
  processorGracePeriodEndsAt: string | null;
}

/**
 * Grace ended. `recovered`: the charge went through, usually alongside `subscription_renewed`.
 * `lapsed`: grace ran out while the processor may keep retrying (`past_due`).
 */
export interface GraceExitedEvent extends NormalizedBillingEventBase, BillingSubscriptionRef {
  type: 'grace_exited';
  outcome: 'recovered' | 'lapsed';
}

/** Auto-renew was turned off. The paid period still runs to its end (`cancelled_active`). */
export interface SubscriptionCancelledEvent
  extends NormalizedBillingEventBase, BillingSubscriptionRef {
  type: 'subscription_cancelled';
  /** End of the paid period, when the processor reports it. */
  periodEnd: string | null;
}

/** The subscription ended without renewing (`expired`). */
export interface SubscriptionExpiredEvent
  extends NormalizedBillingEventBase, BillingSubscriptionRef {
  type: 'subscription_expired';
  expiredAt: string | null;
  /**
   * The processor's id for the subscription that replaced this one. Play sends a new purchase
   * token on a plan change; the banked time moves there instead of becoming a grant.
   */
  replacedByExternalSubscriptionId?: string | null;
}

/** A refund or revocation names the transaction, the subscription, or both. */
type RevocationTarget =
  | { externalTransactionId: string; externalSubscriptionId: string | null }
  | { externalTransactionId: null; externalSubscriptionId: string };

/**
 * Money was returned or the store withdrew the purchase. The grants the purchase created are
 * revoked, and a subscription it names moves to `revoked`.
 */
export type RefundOrRevokeEvent = NormalizedBillingEventBase &
  RevocationTarget & {
    type: 'refund_or_revoke';
    reason: BillingRevocationReason;
    revokedAt: string;
  };

export type NormalizedBillingEvent =
  | PaymentSettledEvent
  | SubscriptionActivatedEvent
  | SubscriptionRenewedEvent
  | SubscriptionRenewalFailedEvent
  | GraceEnteredEvent
  | GraceExitedEvent
  | SubscriptionCancelledEvent
  | SubscriptionExpiredEvent
  | RefundOrRevokeEvent;

export type NormalizedBillingEventType = NormalizedBillingEvent['type'];
