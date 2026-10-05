/**
 * `account.billing_customer_ref` is a UUID. StoreKit's `appAccountToken` accepts only a UUID, and
 * Play's obfuscated account id carries the same value so processor notifications resolve to the
 * account.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BoundAccountToken = {
  appAccountToken: string;
  obfuscatedAccountId: string;
};

export const bindAccountToken = (billingCustomerRef: string): BoundAccountToken | null => {
  const ref = billingCustomerRef.trim();
  if (!UUID_PATTERN.test(ref)) {
    return null;
  }
  return {
    appAccountToken: ref,
    obfuscatedAccountId: ref,
  };
};
