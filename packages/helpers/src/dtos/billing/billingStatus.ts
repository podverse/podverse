import type { MembershipTier } from '../../lib/accountMembership.js';
import type { BillingCadence } from '../../lib/billingDomain.js';

/** The signed-in account's membership and billing standing, for status and manage screens. */
export interface DTOBillingStatus {
  /** Null for an account that has never held a membership. */
  tier: MembershipTier | null;
  is_entitled: boolean;
  /** When access ends, or null for an account that never had membership access. */
  membership_expires_at: string | null;
  /** A payment issue is being retried and access is still active. */
  in_grace_period: boolean;
  billing_cadence: BillingCadence | null;
  /**
   * Opaque id attached to store purchases (Apple `appAccountToken`, Google
   * `obfuscatedExternalAccountId`) so the processor's notifications resolve to this account.
   */
  billing_customer_ref: string;
}
