import type { AppValueRecipient } from '@podverse/helpers';

/**
 * Resolves the app's value recipient for Boost (Value4Value) from configured
 * Lightning node OR LNAddress. Prefer node if both are set.
 *
 * TODO: Implement by reading runtime config:
 * - Node: NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_NAME, _ADDRESS, _CUSTOM_KEY, _CUSTOM_VALUE
 * - LNAddress: NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_NAME, _ADDRESS
 * Return AppValueRecipient with type 'node' or 'lnurl', address, name,
 * custom_key/custom_value (node only), normalized_split: 100, final_amount.
 * Return null if neither node nor lnaddress is configured.
 */
export function getAppValueRecipientFromNodeOrLnaddress(
  _final_amount: number
): AppValueRecipient | null {
  // TODO: Read config.public.app_value.lightning_node and lightning_lnaddress
  // (once added to web config from env). Prefer node; fallback to lnaddress.
  return null;
}
