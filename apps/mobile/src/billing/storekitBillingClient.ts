import type { Purchase } from 'expo-iap';
import {
  finishTransaction,
  getAvailablePurchases,
  getProducts,
  getStorefrontIOS,
  getSubscriptions,
  initConnection,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap';

import type { BillingApi } from './billingApi';
import type {
  BillingClient,
  BillingLocalizedPrice,
  BillingPurchaseKind,
  BillingPurchaseOutcome,
  BillingStoreProduct,
} from './BillingClient';
import { BillingAccountTokenError, billingPurchaseOutcome } from './BillingClient';
import {
  billingErrorCode,
  isCancelledStoreError,
  isRecord,
  isWaitingStoreError,
} from './billingGuards';
import { bindAccountToken } from './bindAccountToken';
import { createFinishOnce } from './inflight';
import { listStorePrices } from './localizedPrices';
import { normalizeStorefrontCode } from './normalizeStorefront';
import { normalizeStorePurchase } from './normalizeStorePurchase';
import { mergeCatalogKinds, resolvePurchaseKind } from './purchaseKinds';
import type { RestoreStoreRecord } from './restoreStorePurchases';
import { restoreStorePurchases } from './restoreStorePurchases';
import { settleStorePurchase } from './settleStorePurchase';

const isStorePurchase = (value: unknown): value is Purchase => {
  const normalized = normalizeStorePurchase(value);
  return normalized !== null && isRecord(value) && value.platform === 'ios';
};

/**
 * StoreKit 2 purchases. Membership products are finished only after the API confirms the
 * transaction. `andDangerouslyFinishTransactionAutomaticallyIOS` stays off so StoreKit does not
 * finish before that confirm.
 */
export const createStorekitBillingClient = (api: BillingApi): BillingClient => {
  const finishOnce = createFinishOnce();
  const kinds = new Map<string, BillingPurchaseKind>();
  let accountToken: string | null = null;
  let started: Promise<void> | null = null;
  let listening = false;

  const start = (): Promise<void> => {
    if (started === null) {
      started = Promise.resolve(initConnection())
        .then(() => undefined)
        .catch((error: unknown) => {
          started = null;
          throw error;
        });
    }
    return started.then(() => {
      if (listening) {
        return;
      }
      listening = true;
      purchaseUpdatedListener((purchase) => {
        void settleIncoming(purchase).catch(() => undefined);
      });
    });
  };

  const bindAccount = async (): Promise<string> => {
    if (accountToken !== null) {
      return accountToken;
    }
    const status = await api.getStatus();
    const bound = bindAccountToken(status.billing_customer_ref);
    if (bound === null) {
      throw new BillingAccountTokenError();
    }
    accountToken = bound.appAccountToken;
    return accountToken;
  };

  const getStorefront = async (): Promise<string | null> => {
    await start();
    return normalizeStorefrontCode(await getStorefrontIOS());
  };

  /**
   * expo-iap buys and restores only products its native store has already loaded, and checkout
   * skips `listPrices` when the API supplies prices. Load failures surface from the purchase call.
   */
  const loadStoreProducts = async (productIds: readonly string[]): Promise<void> => {
    await listStorePrices(productIds, getProducts, getSubscriptions);
  };

  const loadCatalogProducts = async (storefront: string | null): Promise<void> => {
    const catalog = await api.getCheckoutOptions({ platform: 'ios', storefront });
    mergeCatalogKinds(kinds, catalog);
    const productIds = catalog.processors
      .filter((processor) => processor.processor_id === 'apple')
      .flatMap((processor) => processor.products.map((product) => product.external_product_id));
    await loadStoreProducts(productIds);
  };

  const finishPurchase = (purchase: Purchase, externalId: string): Promise<void> =>
    finishOnce(externalId, async () => {
      await finishTransaction({ isConsumable: false, purchase });
    });

  const settleIncoming = async (purchase: Purchase): Promise<BillingPurchaseOutcome> => {
    const normalized = normalizeStorePurchase(purchase);
    if (normalized === null || normalized.transactionId === null) {
      return billingPurchaseOutcome('failed', normalized?.productId ?? null);
    }
    const externalId = normalized.transactionId;
    if (normalized.pending) {
      return billingPurchaseOutcome('waiting', normalized.productId, externalId);
    }
    const settled = await settleStorePurchase({
      finish: () => finishPurchase(purchase, externalId),
      pending: false,
      post: () =>
        api.postAppleTransaction({
          productId: normalized.productId,
          signedTransaction: normalized.signedTransaction,
          transactionId: externalId,
        }),
    });
    return billingPurchaseOutcome(
      settled.phase,
      normalized.productId,
      externalId,
      settled.errorCode
    );
  };

  const purchase = async (product: BillingStoreProduct): Promise<BillingPurchaseOutcome> => {
    let appAccountToken: string;
    try {
      appAccountToken = await bindAccount();
      await start();
    } catch (error) {
      return billingPurchaseOutcome('failed', product.productId, null, billingErrorCode(error));
    }
    kinds.set(product.productId, product.purchaseKind);

    try {
      await loadStoreProducts([product.productId]);
      const requested =
        product.purchaseKind === 'auto_renew'
          ? await requestPurchase({
              request: {
                andDangerouslyFinishTransactionAutomaticallyIOS: false,
                appAccountToken,
                sku: product.productId,
              },
              type: 'subs',
            })
          : await requestPurchase({
              request: {
                andDangerouslyFinishTransactionAutomaticallyIOS: false,
                appAccountToken,
                sku: product.productId,
              },
              type: 'inapp',
            });
      const purchases = (Array.isArray(requested) ? requested : [requested]).filter(
        isStorePurchase
      );
      if (purchases.length === 0) {
        return billingPurchaseOutcome('waiting', product.productId);
      }
      let outcome = billingPurchaseOutcome('confirmed', product.productId);
      for (const storePurchase of purchases) {
        const next = await settleIncoming(storePurchase);
        if (next.phase !== 'confirmed') {
          outcome = next;
        }
      }
      return outcome;
    } catch (error) {
      if (isCancelledStoreError(error)) {
        return billingPurchaseOutcome('cancelled', product.productId);
      }
      if (isWaitingStoreError(error)) {
        return billingPurchaseOutcome('waiting', product.productId, null, billingErrorCode(error));
      }
      return billingPurchaseOutcome('failed', product.productId, null, billingErrorCode(error));
    }
  };

  const restore = async (): Promise<BillingPurchaseOutcome> => {
    await start();
    const storefront = await getStorefront();
    await loadCatalogProducts(storefront).catch(() => undefined);
    const available = await getAvailablePurchases({ onlyIncludeActiveItems: true });
    const records: RestoreStoreRecord[] = [];
    let pendingCount = 0;
    for (const purchaseRecord of available) {
      const normalized = normalizeStorePurchase(purchaseRecord);
      if (normalized === null || normalized.transactionId === null) {
        continue;
      }
      if (normalized.pending) {
        pendingCount += 1;
        continue;
      }
      const purchaseKind = await resolvePurchaseKind({
        api,
        kinds,
        platform: 'ios',
        productId: normalized.productId,
        storefront,
      });
      if (purchaseKind === null) {
        continue;
      }
      const externalId = normalized.transactionId;
      records.push({
        externalId,
        externalProductId: normalized.productId,
        finish: () => finishPurchase(purchaseRecord, externalId),
        purchaseKind,
        signedTransaction: normalized.signedTransaction,
      });
    }
    return restoreStorePurchases({
      pendingCount,
      records,
      restore: (purchases) => api.restore({ processor: 'apple', purchases }),
    });
  };

  void start().catch(() => undefined);

  return {
    backend: 'storekit',
    bindAccount,
    getStorefront,
    listPrices: (productIds: readonly string[]): Promise<readonly BillingLocalizedPrice[]> =>
      listStorePrices(productIds, getProducts, getSubscriptions),
    purchase,
    restore,
    syncUnfinishedTransactions: async () => {
      await restore();
    },
  };
};
