/**
 * What created a membership grant. Every way of getting membership time writes a grant, and
 * `computeMembershipAccess` derives access from the grants rather than from any single timestamp.
 *
 * - `subscription_period` — one paid period of a subscription.
 * - `one_time_purchase` — a one-time purchase.
 * - `claim_token` — a redeemed membership claim token.
 * - `admin` — granted by an operator.
 * - `trial` — the free trial.
 * - `legacy_import` — membership carried over from the previous Podverse app.
 * - `migration_baseline` — the membership an account already had when grants were introduced.
 */
export const MEMBERSHIP_GRANT_SOURCES = [
  'subscription_period',
  'one_time_purchase',
  'claim_token',
  'admin',
  'trial',
  'legacy_import',
  'migration_baseline',
] as const;

export type MembershipGrantSource = (typeof MEMBERSHIP_GRANT_SOURCES)[number];
