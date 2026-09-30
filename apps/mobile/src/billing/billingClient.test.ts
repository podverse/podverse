import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMobileBillingModeFromEnv } from '../config/billingEnv';
import type { BillingApi } from './billingApi';
import type { BillingStoreProduct } from './BillingClient';
import { billingPurchaseOutcome, BillingUnavailableError } from './BillingClient';
import { bindAccountToken } from './bindAccountToken';
import {
  createFakeBillingClient,
  FAKE_BILLING_PRICE_ANNUAL,
  FAKE_BILLING_PRICE_MONTHLY,
  FAKE_BILLING_STOREFRONT,
} from './fakeBillingClient';
import { listStorePrices, localizedPricesFromStoreProducts } from './localizedPrices';
import { normalizeStorefrontCode } from './normalizeStorefront';
import { normalizeStorePurchase } from './normalizeStorePurchase';
import { mergeCatalogKinds } from './purchaseKinds';
import { restoreStorePurchases } from './restoreStorePurchases';
import { selectBillingBackend } from './selectBillingBackend';
import { settleStorePurchase } from './settleStorePurchase';
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

describe('restoreStorePurchases', () => {
  const product: BillingStoreProduct = {
    productId: 'premium.monthly',
    purchaseKind: 'auto_renew',
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
          purchaseKind: product.purchaseKind,
        },
        {
          externalId: 'tx-2',
          externalProductId: product.productId,
          finish: finishUnconfirmed,
          purchaseKind: product.purchaseKind,
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
          purchaseKind: product.purchaseKind,
          signedTransaction: 'header.payload.signature',
        },
      ],
      restore,
    });
    expect(restore).toHaveBeenCalledWith([
      {
        externalId: 'tx-1',
        externalProductId: product.productId,
        purchaseKind: product.purchaseKind,
        signedTransaction: 'header.payload.signature',
      },
    ]);
  });
});

describe('mergeCatalogKinds', () => {
  it('keeps a kind already chosen for the purchase', () => {
    const kinds = new Map([['premium.monthly', 'auto_renew' as const]]);
    mergeCatalogKinds(kinds, {
      processors: [
        {
          processor_id: 'test',
          products: [
            {
              cadence: 'monthly',
              external_product_id: 'premium.monthly',
              id: 1,
              purchase_kind: 'one_time',
            },
          ],
        },
      ],
    });
    expect(kinds.get('premium.monthly')).toBe('auto_renew');
  });
});

describe('createFakeBillingClient', () => {
  it('confirms a purchase after the test processor records it', async () => {
    const client = createFakeBillingClient(
      stubBillingApi({
        getStatus: () => Promise.resolve({ billing_customer_ref: ACCOUNT_REF }),
        simulatePayment: () => Promise.resolve({ outcome: { status: 'processed' } }),
      })
    );
    await expect(client.getStorefront()).resolves.toBe(FAKE_BILLING_STOREFRONT);
    const outcome = await client.purchase({
      productId: 'e2e-test-monthly-renew',
      purchaseKind: 'auto_renew',
    });
    expect(outcome.phase).toBe('confirmed');
    expect(outcome.externalId).toBe('fake-e2e-test-monthly-renew-1');
    await expect(
      client.listPrices(['e2e-test-monthly-renew', 'e2e-test-annual-renew'])
    ).resolves.toEqual([
      { displayPrice: FAKE_BILLING_PRICE_MONTHLY, productId: 'e2e-test-monthly-renew' },
      { displayPrice: FAKE_BILLING_PRICE_ANNUAL, productId: 'e2e-test-annual-renew' },
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
      productId: 'e2e-test-monthly-once',
      purchaseKind: 'one_time',
    });
    expect(outcome.phase).toBe('unconfirmed');
    await expect(client.syncUnfinishedTransactions()).resolves.toBeUndefined();
  });
});

describe('createUnavailableBillingClient', () => {
  it('rejects every store method', async () => {
    const client = createUnavailableBillingClient();
    await expect(
      client.purchase({ productId: 'premium.monthly', purchaseKind: 'auto_renew' })
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
      listStorePrices(
        ['monthly'],
        () => Promise.reject(new Error('products unavailable')),
        () => Promise.resolve([{ displayPrice: '$10.00', id: 'monthly' }])
      )
    ).resolves.toEqual([{ displayPrice: '$10.00', productId: 'monthly' }]);
  });
});
