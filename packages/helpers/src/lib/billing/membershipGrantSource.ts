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

/**
 * Sources an operator may shorten or revoke from the management portal. Time a processor or a
 * claim token paid for is never among them: it is cancelled or refunded with the processor.
 */
export const ADMIN_EDITABLE_GRANT_SOURCES = [
  'admin',
  'trial',
  'legacy_import',
  'migration_baseline',
] as const satisfies readonly MembershipGrantSource[];

type AdminEditableGrantSource = (typeof ADMIN_EDITABLE_GRANT_SOURCES)[number];

function isAdminEditableGrantSource(source: string): source is AdminEditableGrantSource {
  return ADMIN_EDITABLE_GRANT_SOURCES.some((editableSource) => editableSource === source);
}

/**
 * True when the portal may shorten or revoke this grant: an admin-editable source with no
 * subscription, transaction, or claim token behind it.
 */
export function isAdminEditableGrant(grant: {
  source: string;
  billing_subscription_id: number | null;
  billing_transaction_id: number | null;
  membership_claim_token_id: string | null;
}): boolean {
  return (
    isAdminEditableGrantSource(grant.source) &&
    grant.billing_subscription_id === null &&
    grant.billing_transaction_id === null &&
    grant.membership_claim_token_id === null
  );
}
