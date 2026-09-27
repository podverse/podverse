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
 * A voided purchase as a `refund_or_revoke` event, naming the same ids the purchase was recorded
 * under: a subscription by its purchase token, a payment by its order id (a one-time purchase
 * without an order id falls back to its token). The event id comes from those ids, so a void seen
 * on several polls is recorded once.
 *
 * The voided list does not say whether a purchase was made in the sandbox, so `isSandbox` is
 * false; a caller holding the recorded purchase sets it from that record. Null when the purchase
 * names nothing to revoke.
 */
export function voidedPurchaseToRevokeEvent(
  purchase: GooglePlayVoidedPurchase,
  nowIso: string
): RefundOrRevokeEvent | null {
  const externalSubscriptionId =
    purchase.productType === 'subscription' ? purchase.purchaseToken : null;
  const externalTransactionId =
    purchase.orderId ?? (purchase.productType === 'one_time' ? purchase.purchaseToken : null);
  const revokedAt = purchase.voidedAt ?? nowIso;
  const base = {
    type: 'refund_or_revoke' as const,
    processor: 'google_play' as const,
    accountBillingCustomerRef: null,
    accountId: null,
    occurredAt: revokedAt,
    isSandbox: false,
    reason: purchase.reason,
    revokedAt,
  };

  if (externalTransactionId !== null) {
    return {
      ...base,
      processorEventId: `voided:${externalTransactionId}`,
      externalTransactionId,
      externalSubscriptionId,
    };
  }
  if (externalSubscriptionId !== null) {
    return {
      ...base,
      processorEventId: `voided:${externalSubscriptionId}`,
      externalTransactionId: null,
      externalSubscriptionId,
    };
  }
  return null;
}
