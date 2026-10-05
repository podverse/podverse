/**
 * - `auto_renew` — a processor-managed subscription that charges every period until cancelled.
 * - `one_time` — a single paid period that never charges again: a PayPal order, an Apple
 *   non-renewing subscription, or a Google Play prepaid plan.
 */
export const PURCHASE_KINDS = ['auto_renew', 'one_time'] as const;

export type PurchaseKind = (typeof PURCHASE_KINDS)[number];

export function isPurchaseKind(value: string): value is PurchaseKind {
  return PURCHASE_KINDS.some((kind) => kind === value);
}
