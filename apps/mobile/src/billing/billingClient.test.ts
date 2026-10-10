import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMobileBillingModeFromEnv } from '../config/billingEnv';
import type { BillingApi } from './billingApi';
import type { BillingStoreProduct } from './BillingClient';
import { billingPurchaseOutcome, BillingUnavailableError } from './BillingClient';
import { isAlreadyOwnedStoreError } from './billingGuards';
import { bindAccountToken } from './bindAccountToken';
import {
  createFakeBillingClient,
  FAKE_BILLING_PRICE_ANNUAL,
  FAKE_BILLING_PRICE_MONTHLY,
  FAKE_BILLING_STOREFRONT,
} from './fakeBillingClient';
import { listStorePrices, localizedPricesFromStoreProducts } from './localizedPrices';
import { normalizeStorefrontCode } from './normalizeStorefront';
import { isPurchaseFromStore, normalizeStorePurchase } from './normalizeStorePurchase';
import { restoreStorePurchases } from './restoreStorePurchases';
import { selectBillingBackend } from './selectBillingBackend';
import { resolvePrepaidPlayOffer, selectPlayOfferToken } from './selectPlayOfferToken';
import { settleStorePurchase } from './settleStorePurchase';
import {
  playSubscriptionPurchaseRequest,
  storekitInAppPurchaseRequest,
} from './storePurchaseRequest';
import { createUnavailableBillingClient } from './unavailableBillingClient';

const ACCOUNT_REF = '00000000-0000-4000-8000-000000000001';

const originalBilling = process.env.EXPO_PUBLIC_MOBILE_BILLING;
const originalPush = process.env.EXPO_PUBLIC_MOBILE_PUSH_PROVIDER;

afterEach(() => {
  if (originalBilling === undefined) {
    delete process.env.EXPO_PUBLIC_MOBILE_BILLING;
  } else {
    process.env.EXPO_PUBLIC_MOBILE_BILLING = originalBilling;
  }
  if (originalPush === undefined) {
    delete process.env.EXPO_PUBLIC_MOBILE_PUSH_PROVIDER;
  } else {
    process.env.EXPO_PUBLIC_MOBILE_PUSH_PROVIDER = originalPush;
  }
});

const stubBillingApi = (overrides: Partial<BillingApi>): BillingApi => ({
  getCheckoutOptions: () => Promise.reject(new Error('unused')),
  getMembershipStatus: () => Promise.reject(new Error('unused')),
  getStatus: () => Promise.reject(new Error('unused')),
  postAppleTransaction: () => Promise.reject(new Error('unused')),
  postGooglePurchase: () => Promise.reject(new Error('unused')),
  restore: () => Promise.reject(new Error('unused')),
  simulatePayment: () => Promise.reject(new Error('unused')),
  ...overrides,
});

describe('getMobileBillingModeFromEnv', () => {
  it('defaults to store and treats UnifiedPush as unavailable', () => {
    delete process.env.EXPO_PUBLIC_MOBILE_BILLING;
    delete process.env.EXPO_PUBLIC_MOBILE_PUSH_PROVIDER;
    expect(getMobileBillingModeFromEnv()).toBe('store');

    process.env.EXPO_PUBLIC_MOBILE_BILLING = 'store';
    process.env.EXPO_PUBLIC_MOBILE_PUSH_PROVIDER = 'unifiedpush';
    expect(getMobileBillingModeFromEnv()).toBe('unavailable');

    process.env.EXPO_PUBLIC_MOBILE_PUSH_PROVIDER = 'fcm';
    process.env.EXPO_PUBLIC_MOBILE_BILLING = 'unavailable';
    expect(getMobileBillingModeFromEnv()).toBe('unavailable');
  });
});

describe('selectBillingBackend', () => {
  it('selects the fake client only for a dev E2E run, then the store or unavailable', () => {
    expect(
      selectBillingBackend({ billingMode: 'store', isDev: true, isE2e: true, platform: 'ios' })
    ).toBe('fake');
    expect(
      selectBillingBackend({
        billingMode: 'unavailable',
        isDev: true,
        isE2e: true,
        platform: 'android',
      })
    ).toBe('fake');
    expect(
      selectBillingBackend({ billingMode: 'store', isDev: false, isE2e: true, platform: 'ios' })
    ).toBe('storekit');
    expect(
      selectBillingBackend({
        billingMode: 'unavailable',
        isDev: false,
        isE2e: false,
        platform: 'android',
      })
    ).toBe('unavailable');
    expect(
      selectBillingBackend({ billingMode: 'store', isDev: true, isE2e: false, platform: 'ios' })
    ).toBe('storekit');
    expect(
      selectBillingBackend({
        billingMode: 'store',
        isDev: false,
        isE2e: false,
        platform: 'android',
      })
    ).toBe('play');
    expect(
      selectBillingBackend({ billingMode: 'store', isDev: false, isE2e: false, platform: 'other' })
    ).toBe('unavailable');
  });
});

describe('bindAccountToken', () => {
  it('passes a UUID through as both store account ids', () => {
    expect(bindAccountToken(`  ${ACCOUNT_REF}  `)).toEqual({
      appAccountToken: ACCOUNT_REF,
      obfuscatedAccountId: ACCOUNT_REF,
    });
    expect(bindAccountToken('not-a-uuid')).toBeNull();
  });
});

describe('normalizeStorefrontCode', () => {
  it('keeps a two-letter country code', () => {
    expect(normalizeStorefrontCode(' us ')).toBe('US');
    expect(normalizeStorefrontCode('USA')).toBeNull();
  });
});

describe('normalizeStorePurchase', () => {
  it('reads the product id and treats Play pending as unfinished', () => {
    expect(
      normalizeStorePurchase({
        id: 'premium.monthly',
        purchaseStateAndroid: 2,
        purchaseTokenAndroid: 'token-1',
      })
    ).toEqual({
      pending: true,
      productId: 'premium.monthly',
      purchaseToken: 'token-1',
      signedTransaction: null,
      transactionId: null,
    });
    expect(normalizeStorePurchase({ id: '' })).toBeNull();
  });

  it('keeps the StoreKit JWS so the API can read an Xcode purchase', () => {
    expect(
      normalizeStorePurchase({
        id: 'premium.monthly',
        jwsRepresentationIos: 'header.payload.signature',
        transactionId: '2000000000000001',
      })
    ).toMatchObject({
      signedTransaction: 'header.payload.signature',
      transactionId: '2000000000000001',
    });
  });
});

describe('isPurchaseFromStore', () => {
  const playPurchase = {
    __typename: 'PurchaseAndroid',
    currentPlanId: 'prepaid-monthly',
    id: 'GPA.0000-0000-0000-00000',
    productId: 'premium',
    purchaseState: 'purchased',
    purchaseToken: 'token-1',
    store: 'google',
  };

  it('accepts a requestPurchase result by its store, which carries no platform field', () => {
    expect(isPurchaseFromStore(playPurchase, 'google')).toBe(true);
    expect(isPurchaseFromStore({ ...playPurchase, store: 'apple' }, 'apple')).toBe(true);
  });

  it('rejects another store and records that only carry a product platform', () => {
    expect(isPurchaseFromStore(playPurchase, 'apple')).toBe(false);
    expect(isPurchaseFromStore({ id: 'premium', platform: 'android' }, 'google')).toBe(false);
  });
});

describe('settleStorePurchase', () => {
  it('finishes only after the API confirms', async () => {
    const finish = vi.fn(() => Promise.resolve());
    const post = vi.fn(() => Promise.resolve({ confirmed: true }));
    await expect(settleStorePurchase({ finish, pending: false, post })).resolves.toEqual({
      errorCode: null,
      phase: 'confirmed',
    });
    expect(finish).toHaveBeenCalledTimes(1);

    finish.mockClear();
    await settleStorePurchase({
      finish,
      pending: false,
      post: () => Promise.resolve({ confirmed: false }),
    });
    expect(finish).not.toHaveBeenCalled();

    const pendingPost = vi.fn(() => Promise.resolve({ confirmed: true }));
    await settleStorePurchase({ finish, pending: true, post: pendingPost });
    expect(pendingPost).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
  });

  it('leaves the transaction unfinished when finish throws', async () => {
    const result = await settleStorePurchase({
      finish: () => Promise.reject(new Error('finish failed')),
      pending: false,
      post: () => Promise.resolve({ confirmed: true }),
    });
    expect(result.phase).toBe('failed');
  });
});

describe('selectPlayOfferToken', () => {
  const offers = [
    { basePlanId: 'monthly', offerId: null, offerToken: 'token-monthly' },
    { basePlanId: 'annual', offerId: 'intro', offerToken: 'token-annual-intro' },
    { basePlanId: 'annual', offerId: null, offerToken: 'token-annual' },
    { basePlanId: 'prepaid-annual', offerId: null, offerToken: 'token-prepaid-annual' },
  ];

  it('selects the base-plan offer for the requested annual and prepaid-annual plans', () => {
    expect(selectPlayOfferToken(offers, 'annual')).toBe('token-annual');
    expect(selectPlayOfferToken(offers, 'prepaid-annual')).toBe('token-prepaid-annual');
  });

  it('returns null when the base plan is unknown so purchase can fail closed', () => {
    expect(selectPlayOfferToken(offers, 'missing-plan')).toBeNull();
    expect(resolvePrepaidPlayOffer(offers, 'missing-plan')).toBeNull();
    expect(resolvePrepaidPlayOffer(offers, null)).toBeNull();
    expect(resolvePrepaidPlayOffer(offers, '')).toBeNull();
  });

  it('falls back to the first token when no base plan is requested', () => {
    expect(selectPlayOfferToken(offers, null)).toBe('token-monthly');
  });

  it('selects the prepaid base-plan offer and ignores a missing plan', () => {
    expect(resolvePrepaidPlayOffer(offers, 'prepaid-annual')).toBe('token-prepaid-annual');
  });
});

describe('store purchase requests', () => {
  it('buys Apple memberships as in-app products', () => {
    expect(storekitInAppPurchaseRequest('premium.monthly', ACCOUNT_REF)).toEqual({
      request: {
        apple: {
          andDangerouslyFinishTransactionAutomatically: false,
          appAccountToken: ACCOUNT_REF,
          sku: 'premium.monthly',
        },
      },
      type: 'in-app',
    });
  });

  it('buys Play memberships as subscriptions with the prepaid offer token', () => {
    const request = playSubscriptionPurchaseRequest(
      'premium.monthly',
      'token-prepaid',
      ACCOUNT_REF
    );
    expect(request.type).toBe('subs');
    expect(request.request.google.subscriptionOffers).toEqual([
      { offerToken: 'token-prepaid', sku: 'premium.monthly' },
    ]);
    expect(request.request.google).not.toHaveProperty('purchaseToken');
    expect(request.request.google).not.toHaveProperty('subscriptionProductReplacementParams');
  });
});

describe('isAlreadyOwnedStoreError', () => {
  it('recognizes the Play already-owned codes', () => {
    expect(isAlreadyOwnedStoreError({ code: 'E_ALREADY_OWNED' })).toBe(true);
    expect(isAlreadyOwnedStoreError({ code: 'already-owned' })).toBe(true);
    expect(isAlreadyOwnedStoreError({ code: '7' })).toBe(true);
    expect(isAlreadyOwnedStoreError({ code: 'E_USER_CANCELLED' })).toBe(false);
  });
});

describe('restoreStorePurchases', () => {
  const product: BillingStoreProduct = {
    basePlanId: 'prepaid-monthly',
    productId: 'premium.monthly',
  };

  it('finishes a confirmed batch and skips an unconfirmed one', async () => {
    const finishConfirmed = vi.fn(() => Promise.resolve());
    const finishUnconfirmed = vi.fn(() => Promise.resolve());
    const outcome = await restoreStorePurchases({
      batchSize: 1,
      pendingCount: 1,
      records: [
        {
          externalId: 'tx-1',
          externalProductId: product.productId,
          finish: finishConfirmed,
        },
        {
          externalId: 'tx-2',
          externalProductId: product.productId,
          finish: finishUnconfirmed,
        },
      ],
      restore: (purchases) => Promise.resolve({ confirmed: purchases[0]?.externalId === 'tx-1' }),
    });
    expect(finishConfirmed).toHaveBeenCalledTimes(1);
    expect(finishUnconfirmed).not.toHaveBeenCalled();
    expect(outcome.phase).toBe('unconfirmed');
  });

  it('reports waiting when the only purchases are still pending', async () => {
    await expect(
      restoreStorePurchases({
        pendingCount: 1,
        records: [],
        restore: () => Promise.resolve({ confirmed: true }),
      })
    ).resolves.toEqual(billingPurchaseOutcome('waiting'));
  });

  it('sends each signed transaction with its purchase', async () => {
    const restore = vi.fn(() => Promise.resolve({ confirmed: true }));
    await restoreStorePurchases({
      pendingCount: 0,
      records: [
        {
          externalId: 'tx-1',
          externalProductId: product.productId,
          finish: () => Promise.resolve(),
          signedTransaction: 'header.payload.signature',
        },
      ],
      restore,
    });
    expect(restore).toHaveBeenCalledWith([
      {
        externalId: 'tx-1',
        externalProductId: product.productId,
        signedTransaction: 'header.payload.signature',
      },
    ]);
  });
});

describe('createFakeBillingClient', () => {
  it('confirms a purchase after the test processor records it', async () => {
    const simulatePayment = vi.fn(() => Promise.resolve({ outcome: { status: 'processed' } }));
    const client = createFakeBillingClient(
      stubBillingApi({
        getStatus: () => Promise.resolve({ billing_customer_ref: ACCOUNT_REF }),
        simulatePayment,
      })
    );
    await expect(client.getStorefront()).resolves.toBe(FAKE_BILLING_STOREFRONT);
    const outcome = await client.purchase({
      basePlanId: null,
      productId: 'e2e-test-monthly',
    });
    expect(outcome.phase).toBe('confirmed');
    expect(outcome.externalId).toBe('fake-e2e-test-monthly-1');
    expect(simulatePayment).toHaveBeenCalledWith({
      cadence: 'monthly',
      externalProductId: 'e2e-test-monthly',
      externalTransactionId: 'fake-e2e-test-monthly-1',
    });
    await expect(client.listPrices(['e2e-test-monthly', 'e2e-test-annual'])).resolves.toEqual([
      { displayPrice: FAKE_BILLING_PRICE_MONTHLY, productId: 'e2e-test-monthly' },
      { displayPrice: FAKE_BILLING_PRICE_ANNUAL, productId: 'e2e-test-annual' },
    ]);
    await expect(client.restore()).resolves.toMatchObject({ phase: 'confirmed' });
  });

  it('keeps an unfinished purchase when the test processor fails', async () => {
    const client = createFakeBillingClient(
      stubBillingApi({
        getStatus: () => Promise.resolve({ billing_customer_ref: ACCOUNT_REF }),
        simulatePayment: () => Promise.resolve({ outcome: { status: 'failed' } }),
      })
    );
    const outcome = await client.purchase({
      basePlanId: null,
      productId: 'e2e-test-monthly',
    });
    expect(outcome.phase).toBe('unconfirmed');
    await expect(client.syncUnfinishedTransactions()).resolves.toBeUndefined();
  });
});

describe('createUnavailableBillingClient', () => {
  it('rejects every store method', async () => {
    const client = createUnavailableBillingClient();
    await expect(
      client.purchase({
        basePlanId: null,
        productId: 'premium.monthly',
      })
    ).rejects.toBeInstanceOf(BillingUnavailableError);
    await expect(client.restore()).rejects.toBeInstanceOf(BillingUnavailableError);
    await expect(client.syncUnfinishedTransactions()).rejects.toBeInstanceOf(
      BillingUnavailableError
    );
    await expect(client.listPrices(['premium.monthly'])).rejects.toBeInstanceOf(
      BillingUnavailableError
    );
  });
});

describe('localizedPricesFromStoreProducts', () => {
  it('keeps the first display price for each product id', async () => {
    expect(
      localizedPricesFromStoreProducts([
        { displayPrice: '$10.00', id: 'monthly' },
        { displayPrice: '', id: 'blank' },
        { displayPrice: '$12.00', id: 'monthly' },
        { id: 'missing' },
      ])
    ).toEqual([{ displayPrice: '$10.00', productId: 'monthly' }]);

    await expect(
      listStorePrices(['monthly'], ({ type }) =>
        type === 'in-app'
          ? Promise.reject(new Error('products unavailable'))
          : Promise.resolve([{ displayPrice: '$10.00', id: 'monthly' }])
      )
    ).resolves.toEqual([{ displayPrice: '$10.00', productId: 'monthly' }]);
  });
});
