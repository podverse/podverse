import type { MembershipTier } from '../../lib/accountMembership.js';
import type { BillingCadence } from '../../lib/billingDomain.js';
import type { DTOBillingSubscription } from './billingSubscription.js';

/** The signed-in account's membership and billing standing, for status and manage screens. */
export interface DTOBillingStatus {
  /** Null for an account that has never held a membership. */
  tier: MembershipTier | null;
  is_entitled: boolean;
  /**
   * When access ends, including the renewal buffer and any grace, so it can fall after the paid
   * period. Show `active_subscription.current_period_end` as the "Renews on" / "Expires on" date.
   */
  membership_expires_at: string | null;
  /** A failed renewal is being retried; access is running on the grace window. */
  in_grace_period: boolean;
  /**
   * A subscription in good standing will charge again on its own. Pass it with `is_entitled` to
   * `shouldSuppressExpiryReminder`.
   */
  active_auto_renew: boolean;
  billing_cadence: BillingCadence | null;
  /**
   * Opaque id attached to store purchases (Apple `appAccountToken`, Google
   * `obfuscatedExternalAccountId`) so the processor's notifications resolve to this account.
   */
  billing_customer_ref: string;
  /** The subscription that governs renewal, or null when none is active. */
  active_subscription: DTOBillingSubscription | null;
}
