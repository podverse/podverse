import type { PaymentProcessorId } from './paymentProcessorId.js';

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

/** Money arrived for a purchase. */
export interface PaymentSettledEvent extends NormalizedBillingEventBase, BillingProductRefs {
  type: 'payment_settled';
  externalTransactionId: string;
  /** The paid period, when the processor reports one; otherwise it follows from the cadence. */
  periodStart: string | null;
  periodEnd: string | null;
  amount: BillingAmount | null;
}

/**
 * Money was returned or the store withdrew the purchase. The grants the purchase created are
 * revoked.
 */
export interface RefundOrRevokeEvent extends NormalizedBillingEventBase {
  type: 'refund_or_revoke';
  reason: BillingRevocationReason;
  revokedAt: string;
  externalTransactionId: string;
}

export type NormalizedBillingEvent = PaymentSettledEvent | RefundOrRevokeEvent;

export type NormalizedBillingEventType = NormalizedBillingEvent['type'];
