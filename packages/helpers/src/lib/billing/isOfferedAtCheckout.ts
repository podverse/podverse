import type { PaymentProcessorId } from './paymentProcessorId.js';
import type { PurchaseKind } from './purchaseKind.js';

/**
 * Store processors sell auto-renew subscriptions only. PayPal still offers one-time purchases.
 * Product rows for past prepaid store purchases stay mapped so refunds and voids can match them.
 */
export function isOfferedAtCheckout(
  processorId: PaymentProcessorId,
  purchaseKind: PurchaseKind
): boolean {
  if (processorId === 'paypal') {
    return true;
  }
  return purchaseKind === 'auto_renew';
}
