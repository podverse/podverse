import type { RefundOrRevokeEvent } from '@podverse/helpers';

import type {
  GooglePlayClient,
  GooglePlayVoidedPurchase,
  GooglePlayVoidedPurchasesPage,
  ListVoidedPurchasesParams,
} from './PlayDeveloperClient.js';

export async function pollGooglePlayVoidedPurchases(
  client: GooglePlayClient,
  params: ListVoidedPurchasesParams = {}
): Promise<GooglePlayVoidedPurchasesPage> {
  return client.listVoidedPurchases(params);
}

/**
 * A voided purchase as a `refund_or_revoke` event keyed by order id. A one-time purchase without
 * an order id uses its purchase token. The event id comes from that id, so a void seen on several
 * polls is recorded once.
 *
 * The voided list does not say whether a purchase was made in the sandbox, so `isSandbox` is
 * false. Null when the purchase names nothing to revoke.
 */
export function voidedPurchaseToRevokeEvent(
  purchase: GooglePlayVoidedPurchase,
  nowIso: string
): RefundOrRevokeEvent | null {
  const externalTransactionId =
    purchase.orderId ?? (purchase.productType === 'one_time' ? purchase.purchaseToken : null);
  if (externalTransactionId === null) {
    return null;
  }
  const revokedAt = purchase.voidedAt ?? nowIso;
  return {
    type: 'refund_or_revoke',
    processor: 'google_play',
    processorEventId: `voided:${externalTransactionId}`,
    accountBillingCustomerRef: null,
    accountId: null,
    occurredAt: revokedAt,
    isSandbox: false,
    reason: purchase.reason,
    revokedAt,
    externalTransactionId,
  };
}
