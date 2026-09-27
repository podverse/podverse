import type { PurchaseKind } from '../../lib/billing/purchaseKind.js';
import type { BillingSubscriptionStatus } from '../../lib/billing/subscriptionStatus.js';
import type { BillingCadence } from '../../lib/billingDomain.js';

export interface DTOBillingSubscription {
  id: number;
  /** A `PaymentProcessorId`; narrow with `isPaymentProcessorId` and treat other ids as unknown. */
  processor_id: string;
  status: BillingSubscriptionStatus;
  purchase_kind: PurchaseKind;
  cadence: BillingCadence | null;
  /**
   * The processor's subscription id: the PayPal subscription id, the Apple original transaction
   * id, or the Google Play purchase token.
   */
  external_subscription_id: string;
  current_period_start: string | null;
  /**
   * End of the paid period: the date to show as "Renews on" while auto-renewing, or "Expires on"
   * otherwise. Access can run past it through the renewal buffer or grace; that later instant is
   * the account's `membership_expires_at`.
   */
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  /** When grace ends, while `status` is `in_grace_period`. */
  grace_period_ends_at: string | null;
  /** Membership time the account already held when this subscription started; it runs first. */
  banked_seconds: number;
  created_at: string;
  updated_at: string;
}
