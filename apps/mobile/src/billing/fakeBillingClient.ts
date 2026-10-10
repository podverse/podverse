import type { BillingApi } from './billingApi';
import type {
  BillingClient,
  BillingLocalizedPrice,
  BillingPurchaseOutcome,
  BillingStoreProduct,
} from './BillingClient';
import { BillingAccountTokenError, billingPurchaseOutcome } from './BillingClient';
import { billingErrorCode } from './billingGuards';
import { bindAccountToken } from './bindAccountToken';

/** Storefront the fake client reports so checkout-options queries stay deterministic. */
export const FAKE_BILLING_STOREFRONT = 'US';

/** Deterministic display prices for the fake client. Annual ids use the annual string. */
export const FAKE_BILLING_PRICE_MONTHLY = '$10.00';
export const FAKE_BILLING_PRICE_ANNUAL = '$99.00';

type PendingFakePurchase = {
  product: BillingStoreProduct;
  externalTransactionId: string;
};

const cadenceForProduct = (productId: string): 'annual' | 'monthly' =>
  productId.includes('annual') ? 'annual' : 'monthly';

/**
 * In-memory store for Maestro. A purchase posts a test-processor `payment_settled` event and
 * reports confirmed when that event is recorded. Any product id is accepted. There is no store
 * transaction to finish.
 */
export const createFakeBillingClient = (api: BillingApi): BillingClient => {
  let accountRef: string | null = null;
  let sequence = 0;
  const pending: PendingFakePurchase[] = [];

  const bindAccount = async (): Promise<string> => {
    if (accountRef !== null) {
      return accountRef;
    }
    const status = await api.getStatus();
    const bound = bindAccountToken(status.billing_customer_ref);
    if (bound === null) {
      throw new BillingAccountTokenError();
    }
    accountRef = bound.appAccountToken;
    return accountRef;
  };

  const confirm = async (purchase: PendingFakePurchase): Promise<BillingPurchaseOutcome> => {
    try {
      const result = await api.simulatePayment({
        cadence: cadenceForProduct(purchase.product.productId),
        externalProductId: purchase.product.productId,
        externalTransactionId: purchase.externalTransactionId,
      });
      if (result.outcome.status === 'failed') {
        return billingPurchaseOutcome(
          'unconfirmed',
          purchase.product.productId,
          purchase.externalTransactionId
        );
      }
      const index = pending.indexOf(purchase);
      if (index >= 0) {
        pending.splice(index, 1);
      }
      return billingPurchaseOutcome(
        'confirmed',
        purchase.product.productId,
        purchase.externalTransactionId
      );
    } catch (error) {
      return billingPurchaseOutcome(
        'failed',
        purchase.product.productId,
        purchase.externalTransactionId,
        billingErrorCode(error)
      );
    }
  };

  const purchase = async (product: BillingStoreProduct): Promise<BillingPurchaseOutcome> => {
    try {
      await bindAccount();
    } catch (error) {
      return billingPurchaseOutcome('failed', product.productId, null, billingErrorCode(error));
    }
    sequence += 1;
    const entry: PendingFakePurchase = {
      externalTransactionId: `fake-${product.productId}-${sequence}`,
      product,
    };
    pending.push(entry);
    return confirm(entry);
  };

  const restore = async (): Promise<BillingPurchaseOutcome> => {
    if (pending.length === 0) {
      return billingPurchaseOutcome('confirmed');
    }
    let outcome = billingPurchaseOutcome('confirmed');
    for (const entry of [...pending]) {
      const next = await confirm(entry);
      if (next.phase === 'failed' || next.phase === 'unconfirmed') {
        outcome = next;
      }
    }
    return outcome;
  };

  return {
    backend: 'fake',
    bindAccount,
    getStorefront: () => Promise.resolve(FAKE_BILLING_STOREFRONT),
    listPrices: (productIds: readonly string[]): Promise<readonly BillingLocalizedPrice[]> =>
      Promise.resolve(
        productIds.map((productId) => ({
          displayPrice: productId.includes('annual')
            ? FAKE_BILLING_PRICE_ANNUAL
            : FAKE_BILLING_PRICE_MONTHLY,
          productId,
        }))
      ),
    purchase,
    restore,
    syncUnfinishedTransactions: async () => {
      await restore();
    },
  };
};
