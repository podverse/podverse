import type { Purchase } from 'expo-iap';
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  getStorefront as getStorefrontFromStore,
  initConnection,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap';

import type { BillingApi } from './billingApi';
import { externalProductIdsForProcessor } from './billingApi';
import type {
  BillingClient,
  BillingLocalizedPrice,
  BillingPurchaseOutcome,
  BillingStoreProduct,
} from './BillingClient';
import { BillingAccountTokenError, billingPurchaseOutcome } from './BillingClient';
import {
  billingErrorCode,
  isAlreadyOwnedStoreError,
  isCancelledStoreError,
  isRecord,
  isWaitingStoreError,
} from './billingGuards';
import { bindAccountToken } from './bindAccountToken';
import { createFinishOnce } from './inflight';
import { listStorePrices } from './localizedPrices';
import { normalizeStorefrontCode } from './normalizeStorefront';
import { isPurchaseFromStore, normalizeStorePurchase } from './normalizeStorePurchase';
import type { RestoreStoreRecord } from './restoreStorePurchases';
import { restoreStorePurchases } from './restoreStorePurchases';
import { resolvePrepaidPlayOffer } from './selectPlayOfferToken';
import { settleStorePurchase } from './settleStorePurchase';
import { playSubscriptionPurchaseRequest } from './storePurchaseRequest';

/** Returned when checkout asks for a Google base plan Play does not offer to this client. */
export const BILLING_PRODUCT_UNAVAILABLE = 'billing.product_unavailable';

const isStorePurchase = (value: unknown): value is Purchase => isPurchaseFromStore(value, 'google');

const isAndroidSubscriptionProduct = (
  value: unknown
): value is { id: string; platform: 'android'; subscriptionOffers?: readonly unknown[] | null } => {
  return (
    isRecord(value) &&
    value.platform === 'android' &&
    typeof value.id === 'string' &&
    value.id !== ''
  );
};

/**
 * Play Billing purchases. Every membership product is a subscription charged with the prepaid
 * base plan's offer token. Buying while prepaid time is still active is a new purchase token.
 * When the store reports the product is already owned, restore runs once and its outcome is
 * returned. Transactions are acknowledged only after the API confirms.
 */
export const createPlayBillingClient = (api: BillingApi): BillingClient => {
  const finishOnce = createFinishOnce();
  let accountId: string | null = null;
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
    if (accountId !== null) {
      return accountId;
    }
    const status = await api.getStatus();
    const bound = bindAccountToken(status.billing_customer_ref);
    if (bound === null) {
      throw new BillingAccountTokenError();
    }
    accountId = bound.obfuscatedAccountId;
    return accountId;
  };

  const getStorefront = async (): Promise<string | null> => {
    await start();
    try {
      return normalizeStorefrontCode(await getStorefrontFromStore());
    } catch {
      return null;
    }
  };

  const offerTokenFor = async (sku: string, basePlanId: string | null): Promise<string | null> => {
    if (basePlanId === null || basePlanId === '') {
      return null;
    }
    const products = await fetchProducts({ skus: [sku], type: 'subs' });
    if (products === null) {
      return null;
    }
    for (const product of products) {
      if (!isAndroidSubscriptionProduct(product) || product.id !== sku) {
        continue;
      }
      const token = resolvePrepaidPlayOffer(product.subscriptionOffers ?? [], basePlanId);
      if (token !== null) {
        return token;
      }
    }
    return null;
  };

  const finishPurchase = (purchase: Purchase, externalId: string): Promise<void> =>
    finishOnce(externalId, async () => {
      await finishTransaction({ isConsumable: false, purchase });
    });

  const settleIncoming = async (purchase: Purchase): Promise<BillingPurchaseOutcome> => {
    const normalized = normalizeStorePurchase(purchase);
    if (normalized === null || normalized.purchaseToken === null) {
      return billingPurchaseOutcome('failed', normalized?.productId ?? null);
    }
    const externalId = normalized.purchaseToken;
    if (normalized.pending) {
      return billingPurchaseOutcome('waiting', normalized.productId, externalId);
    }
    const settled = await settleStorePurchase({
      finish: () => finishPurchase(purchase, externalId),
      pending: false,
      post: () =>
        api.postGooglePurchase({
          productId: normalized.productId,
          purchaseToken: externalId,
        }),
    });
    return billingPurchaseOutcome(
      settled.phase,
      normalized.productId,
      externalId,
      settled.errorCode
    );
  };

  const restore = async (): Promise<BillingPurchaseOutcome> => {
    await start();
    let productIds: ReadonlySet<string>;
    try {
      const storefront = await getStorefront();
      const catalog = await api.getCheckoutOptions({ platform: 'android', storefront });
      productIds = externalProductIdsForProcessor(catalog, 'google_play');
    } catch (error) {
      return billingPurchaseOutcome('failed', null, null, billingErrorCode(error));
    }
    const available = await getAvailablePurchases();
    const records: RestoreStoreRecord[] = [];
    let pendingCount = 0;
    for (const purchaseRecord of available) {
      const normalized = normalizeStorePurchase(purchaseRecord);
      if (normalized === null || normalized.purchaseToken === null) {
        continue;
      }
      if (!productIds.has(normalized.productId)) {
        continue;
      }
      if (normalized.pending) {
        pendingCount += 1;
        continue;
      }
      const externalId = normalized.purchaseToken;
      records.push({
        externalId,
        externalProductId: normalized.productId,
        finish: () => finishPurchase(purchaseRecord, externalId),
      });
    }
    return restoreStorePurchases({
      pendingCount,
      records,
      restore: (purchases) => api.restore({ processor: 'google_play', purchases }),
    });
  };

  const purchase = async (product: BillingStoreProduct): Promise<BillingPurchaseOutcome> => {
    let obfuscatedAccountId: string;
    try {
      obfuscatedAccountId = await bindAccount();
      await start();
    } catch (error) {
      return billingPurchaseOutcome('failed', product.productId, null, billingErrorCode(error));
    }

    try {
      const offerToken = await offerTokenFor(product.productId, product.basePlanId);
      if (offerToken === null) {
        return billingPurchaseOutcome(
          'failed',
          product.productId,
          null,
          BILLING_PRODUCT_UNAVAILABLE
        );
      }
      const requested = await requestPurchase(
        playSubscriptionPurchaseRequest(product.productId, offerToken, obfuscatedAccountId)
      );
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
      if (isAlreadyOwnedStoreError(error)) {
        try {
          return await restore();
        } catch (restoreError) {
          return billingPurchaseOutcome(
            'failed',
            product.productId,
            null,
            billingErrorCode(restoreError)
          );
        }
      }
      return billingPurchaseOutcome('failed', product.productId, null, billingErrorCode(error));
    }
  };

  void start().catch(() => undefined);

  return {
    backend: 'play',
    bindAccount,
    getStorefront,
    listPrices: async (
      productIds: readonly string[]
    ): Promise<readonly BillingLocalizedPrice[]> => {
      await start();
      return listStorePrices(productIds, fetchProducts);
    },
    purchase,
    restore,
    syncUnfinishedTransactions: async () => {
      await restore();
    },
  };
};
