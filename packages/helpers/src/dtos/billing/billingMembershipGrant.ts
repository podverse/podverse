import type { MembershipGrantSource } from '../../lib/billing/membershipGrantSource.js';

/** One row of the membership grant ledger, which `computeMembershipAccess` derives access from. */
export interface DTOBillingMembershipGrant {
  id: number;
  account_id: number;
  source: MembershipGrantSource;
  starts_at: string;
  ends_at: string;
  /** Revoked grants stay in the ledger as history and grant no access. */
  revoked_at: string | null;
  /** The settled payment that created this grant (`one_time_purchase`). */
  billing_transaction_id: number | null;
  /** The redeemed claim token (`claim_token`). */
  membership_claim_token_id: string | null;
  created_at: string;
}
