import { describe, expect, it } from 'vitest';

import {
  BILLING_PROCESSOR_PRODUCT_ENV_KEYS,
  PAYPAL_ONE_TIME_PRODUCT_IDS,
  resolveBillingProcessorProductsFromEnv,
} from './processorProductEnv.js';

describe('resolveBillingProcessorProductsFromEnv', () => {
  it('maps only processors whose keys are set, and always maps the PayPal one-time products', () => {
    const { products, skipped } = resolveBillingProcessorProductsFromEnv({
      BILLING_PRODUCT_APPLE_AUTO_RENEW_MONTHLY_ID: 'com.example.monthly',
      BILLING_PRODUCT_GOOGLE_SUBSCRIPTION_ID: 'premium',
      BILLING_PRODUCT_GOOGLE_PREPAID_ANNUAL_BASE_PLAN_ID: ' prepaid-annual ',
      BILLING_PRODUCT_PAYPAL_AUTO_RENEW_MONTHLY_PLAN_ID: '',
    });

    expect(products).toEqual([
      {
        processor: 'paypal',
        cadence: 'monthly',
        purchaseKind: 'one_time',
        externalProductId: PAYPAL_ONE_TIME_PRODUCT_IDS.monthly,
        externalBasePlanId: null,
      },
      {
        processor: 'paypal',
        cadence: 'annual',
        purchaseKind: 'one_time',
        externalProductId: PAYPAL_ONE_TIME_PRODUCT_IDS.annual,
        externalBasePlanId: null,
      },
      {
        processor: 'apple',
        cadence: 'monthly',
        purchaseKind: 'auto_renew',
        externalProductId: 'com.example.monthly',
        externalBasePlanId: null,
      },
      {
        processor: 'google_play',
        cadence: 'annual',
        purchaseKind: 'one_time',
        externalProductId: 'premium',
        externalBasePlanId: 'prepaid-annual',
      },
    ]);
    expect(skipped).toHaveLength(8);
  });

  it('lists the shared Google subscription id once', () => {
    expect(BILLING_PROCESSOR_PRODUCT_ENV_KEYS).toHaveLength(11);
    expect(new Set(BILLING_PROCESSOR_PRODUCT_ENV_KEYS).size).toBe(11);
  });
});
