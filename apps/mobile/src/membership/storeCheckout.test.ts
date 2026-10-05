import { describe, expect, it } from 'vitest';

import {
  availableCadences,
  checkoutProduct,
  isClientUpdateRequired,
  mapCheckoutProcessors,
  offersProcessor,
  PLAY_PACKAGE_NAME,
  resolveStoreCheckoutMode,
  showsStackingNotice,
  storeListingUrl,
  storeProcessorId,
  subscriptionManagementUrl,
} from './storeCheckout';

const options = mapCheckoutProcessors({
  processors: [
    {
      processor_id: 'test',
      products: [
        {
          cadence: 'monthly',
          external_base_plan_id: null,
          external_product_id: 'e2e-test-monthly-renew',
          id: 1,
          purchase_kind: 'auto_renew',
        },
        {
          cadence: 'annual',
          external_base_plan_id: null,
          external_product_id: 'e2e-test-annual-renew',
          id: 2,
          purchase_kind: 'auto_renew',
        },
        {
          cadence: 'monthly',
          external_base_plan_id: null,
          external_product_id: 'e2e-test-monthly-once',
          id: 3,
          purchase_kind: 'one_time',
        },
        {
          cadence: 'weekly',
          external_base_plan_id: null,
          external_product_id: 'ignored',
          id: 4,
          purchase_kind: 'auto_renew',
        },
        {
          cadence: 'annual',
          external_base_plan_id: 'prepaid-annual',
          external_product_id: 'premium',
          id: 5,
          purchase_kind: 'one_time',
        },
      ],
    },
    {
      processor_id: 'paypal',
      products: [],
    },
  ],
});

describe('store checkout selection', () => {
  it('maps the fake client onto the test processor and ignores an unknown cadence', () => {
    expect(storeProcessorId('fake')).toBe('test');
    expect(storeProcessorId('unavailable')).toBeNull();
    expect(options[0]?.products).toHaveLength(4);
    expect(checkoutProduct(options, 'test', 'annual', 'one_time')).toMatchObject({
      basePlanId: 'prepaid-annual',
      externalProductId: 'premium',
    });
  });

  it('selects auto-renew when the checkbox is on and one-time when it is off', () => {
    expect(checkoutProduct(options, 'test', 'monthly', 'auto_renew')?.externalProductId).toBe(
      'e2e-test-monthly-renew'
    );
    expect(checkoutProduct(options, 'test', 'monthly', 'one_time')?.externalProductId).toBe(
      'e2e-test-monthly-once'
    );
    expect(availableCadences(options, 'test', 'one_time')).toEqual(['monthly', 'annual']);
  });

  it('shows PayPal only when checkout options include that processor', () => {
    expect(offersProcessor(options, 'paypal')).toBe(true);
    expect(offersProcessor(options, 'apple')).toBe(false);
  });

  it('uses contact mode only when this platform has no store processor and no PayPal', () => {
    const none = mapCheckoutProcessors({ processors: [] });
    const storeOnly = mapCheckoutProcessors({
      processors: [{ processor_id: 'test', products: [] }],
    });
    const paypalOnly = mapCheckoutProcessors({
      processors: [{ processor_id: 'paypal', products: [] }],
    });
    const both = mapCheckoutProcessors({
      processors: [
        { processor_id: 'test', products: [] },
        { processor_id: 'paypal', products: [] },
      ],
    });

    expect(resolveStoreCheckoutMode({ backend: 'fake', processors: none })).toBe('contact');
    expect(resolveStoreCheckoutMode({ backend: 'fake', processors: storeOnly })).toBe('purchase');
    expect(resolveStoreCheckoutMode({ backend: 'fake', processors: paypalOnly })).toBe('purchase');
    expect(resolveStoreCheckoutMode({ backend: 'fake', processors: both })).toBe('purchase');
  });

  it('shows the stacking notice only while membership time is still ahead', () => {
    const later = Date.parse('2026-09-01T00:00:00.000Z');
    expect(showsStackingNotice('2026-10-01T00:00:00.000Z', later)).toBe(true);
    expect(showsStackingNotice('2026-08-01T00:00:00.000Z', later)).toBe(false);
    expect(showsStackingNotice(null, later)).toBe(false);
  });

  it('treats the update-required code as the store-update prompt', () => {
    expect(isClientUpdateRequired('billing.client_update_required')).toBe(true);
    expect(isClientUpdateRequired('billing.purchase_failed')).toBe(false);
    expect(isClientUpdateRequired(null)).toBe(false);
  });

  it('points manage and update links at the store for that platform', () => {
    expect(subscriptionManagementUrl('storekit')).toBe(
      'https://apps.apple.com/account/subscriptions'
    );
    expect(subscriptionManagementUrl('play')).toContain(PLAY_PACKAGE_NAME);
    expect(subscriptionManagementUrl('fake')).toBeNull();
    expect(storeListingUrl('ios')).toContain('apps.apple.com');
    expect(storeListingUrl('android')).toContain(PLAY_PACKAGE_NAME);
  });
});
