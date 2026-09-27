import type { BillingRevocationReason } from '../../lib/billing/normalizedEvents.js';
import type { PurchaseKind } from '../../lib/billing/purchaseKind.js';

/**
 * A settled payment. A refund, chargeback, or store revocation marks the payment revoked rather
 * than adding a second row, so each payment reads as one line with its outcome.
 */
export interface DTOBillingTransaction {
  id: number;
  account_id: number;
  /** A `PaymentProcessorId`; narrow with `isPaymentProcessorId` and treat other ids as unknown. */
  processor_id: string;
  /** The PayPal capture id, the Apple transaction id, or the Google Play order id. */
  external_transaction_id: string;
  /** Set when the payment belongs to a subscription. */
  billing_subscription_id: number | null;
  purchase_kind: PurchaseKind;
  /** Decimal string in major units (`"4.99"`). Null when the processor did not report the price. */
  amount: string | null;
  /** ISO 4217 code; null together with `amount`. */
  currency_code: string | null;
  /** When the processor settled the payment. */
  settled_at: string;
  revoked_at: string | null;
  revocation_reason: BillingRevocationReason | null;
  is_sandbox: boolean;
  created_at: string;
}
