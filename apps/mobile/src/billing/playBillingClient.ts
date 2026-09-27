import type { Purchase } from 'expo-iap';
import {
  finishTransaction,
  getAvailablePurchases,
  getProducts,
  getSubscriptions,
  initConnection,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap';
import ExpoIapModule from 'expo-iap/build/ExpoIapModule';

import type { BillingApi } from './billingApi';
import type {
  BillingClient,
  BillingLocalizedPrice,
  BillingPurchaseKind,
  BillingPurchaseOutcome,
  BillingStoreProduct,
} from './BillingClient';
import {
  BillingAccountTokenError,
  BillingPurchaseError,
  billingPurchaseOutcome,
} from './BillingClient';
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
import { resolvePurchaseKind } from './purchaseKinds';
import type { RestoreStoreRecord } from './restoreStorePurchases';
import { restoreStorePurchases } from './restoreStorePurchases';
import { settleStorePurchase } from './settleStorePurchase';

const isZeroArg = (value: unknown): value is () => unknown => typeof value === 'function';

const isStorePurchase = (value: unknown): value is Purchase => {
  const normalized = normalizeStorePurchase(value);
  return normalized !== null && isRecord(value) && value.platform === 'android';
};

const readPlayCountryCode = async (): Promise<string | null> => {
  const mod: unknown = ExpoIapModule;
  if (!isRecord(mod) || !isZeroArg(mod.getStorefront)) {
    return null;
  }
  const result: unknown = await mod.getStorefront();
  return typeof result === 'string' ? normalizeStorefrontCode(result) : null;
};

/**
 * Play Billing purchases. A prepaid one-time membership is a subscription base plan when Play
 * returns an offer token; otherwise it is an in-app product. Transactions are acknowledged only
 * after the API confirms. The server acknowledges the same purchase.
 */
export const createPlayBillingClient = (api: BillingApi): BillingClient => {
  const finishOnce = createFinishOnce();
  const kinds = new Map<string, BillingPurchaseKind>();
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
        void settleIncoming(purchase, null).catch(() => undefined);
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
    return readPlayCountryCode();
  };

  const offerTokenFor = async (sku: string): Promise<string | null> => {
    const products = await getSubscriptions([sku]);
    for (const product of products) {
      if (product.platform !== 'android' || product.id !== sku) {
        continue;
      }
      const offer = product.subscriptionOfferDetails[0];
      if (offer !== undefined && offer.offerToken !== '') {
        return offer.offerToken;
      }
    }
    return null;
  };

  const finishPurchase = (purchase: Purchase, externalId: string): Promise<void> =>
    finishOnce(externalId, async () => {
      await finishTransaction({ isConsumable: false, purchase });
    });

  const settleIncoming = async (
    purchase: Purchase,
    explicitKind: BillingPurchaseKind | null
  ): Promise<BillingPurchaseOutcome> => {
    const normalized = normalizeStorePurchase(purchase);
    if (normalized === null || normalized.purchaseToken === null) {
      return billingPurchaseOutcome('failed', normalized?.productId ?? null);
    }
    const externalId = normalized.purchaseToken;
    if (normalized.pending) {
      return billingPurchaseOutcome('waiting', normalized.productId, externalId);
    }
    const storefront = await getStorefront();
    const purchaseKind =
      explicitKind ??
      (await resolvePurchaseKind({
        api,
        kinds,
        platform: 'android',
        productId: normalized.productId,
        storefront,
      }));
    if (purchaseKind === null) {
      return billingPurchaseOutcome('unconfirmed', normalized.productId, externalId);
    }
    const settled = await settleStorePurchase({
      finish: () => finishPurchase(purchase, externalId),
      pending: false,
      post: () =>
        api.postGooglePurchase({
          productId: normalized.productId,
          purchaseKind,
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

  const purchase = async (product: BillingStoreProduct): Promise<BillingPurchaseOutcome> => {
    let obfuscatedAccountId: string;
    try {
      obfuscatedAccountId = await bindAccount();
      await start();
    } catch (error) {
      return billingPurchaseOutcome('failed', product.productId, null, billingErrorCode(error));
    }
    kinds.set(product.productId, product.purchaseKind);

    try {
      const offerToken = await offerTokenFor(product.productId);
      const useSubscription = product.purchaseKind === 'auto_renew' || offerToken !== null;
      if (useSubscription && offerToken === null) {
        throw new BillingPurchaseError('missing_offer');
      }
      const requested =
        useSubscription && offerToken !== null
          ? await requestPurchase({
              request: {
                obfuscatedAccountIdAndroid: obfuscatedAccountId,
                skus: [product.productId],
                subscriptionOffers: [{ offerToken, sku: product.productId }],
              },
              type: 'subs',
            })
          : await requestPurchase({
              request: {
                obfuscatedAccountIdAndroid: obfuscatedAccountId,
                skus: [product.productId],
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
        const next = await settleIncoming(storePurchase, product.purchaseKind);
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
    const available = await getAvailablePurchases({ onlyIncludeActiveItems: true });
    const records: RestoreStoreRecord[] = [];
    let pendingCount = 0;
    for (const purchaseRecord of available) {
      const normalized = normalizeStorePurchase(purchaseRecord);
      if (normalized === null || normalized.purchaseToken === null) {
        continue;
      }
      if (normalized.pending) {
        pendingCount += 1;
        continue;
      }
      const purchaseKind = await resolvePurchaseKind({
        api,
        kinds,
        platform: 'android',
        productId: normalized.productId,
        storefront,
      });
      if (purchaseKind === null) {
        continue;
      }
      const externalId = normalized.purchaseToken;
      records.push({
        externalId,
        externalProductId: normalized.productId,
        finish: () => finishPurchase(purchaseRecord, externalId),
        purchaseKind,
      });
    }
    return restoreStorePurchases({
      pendingCount,
      records,
      restore: (purchases) => api.restore({ processor: 'google_play', purchases }),
    });
  };

  void start().catch(() => undefined);

  return {
    backend: 'play',
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
