import type { BillingAccountIdentity } from './ledgerStore.js';

/**
 * Store review and staff testing use sandbox purchases against production. Outside production any
 * sandbox purchase counts; in production only the accounts in
 * `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS` get access from one. Adapters only report `isSandbox`, so
 * this is the one place the allowlist is enforced.
 */
export interface BillingSandboxPolicy {
  isProduction: boolean;
  /** Account ids or `id_text` values. */
  allowedAccountIds: ReadonlySet<string>;
}

/** Parses the comma-separated `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS` value. */
export function parseSandboxAllowedAccountIds(value: string | undefined): Set<string> {
  if (value === undefined) {
    return new Set();
  }
  return new Set(
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry !== '')
  );
}

export function isSandboxPurchaseAllowed(
  policy: BillingSandboxPolicy,
  account: BillingAccountIdentity
): boolean {
  if (!policy.isProduction) {
    return true;
  }
  return (
    policy.allowedAccountIds.has(String(account.id)) || policy.allowedAccountIds.has(account.idText)
  );
}
