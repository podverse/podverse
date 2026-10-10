import { describe, expect, it } from 'vitest';

import {
  addedMembershipWindow,
  availableCadences,
  checkoutProduct,
  isClientUpdateRequired,
  mapCheckoutProcessors,
  offersProcessor,
  PLAY_PACKAGE_NAME,
  resolveStoreCheckoutMode,
  storeListingUrl,
  storeProcessorId,
} from './storeCheckout';

const options = mapCheckoutProcessors({
  processors: [
    {
      processor_id: 'test',
      products: [
        {
          cadence: 'monthly',
          external_base_plan_id: null,
          external_product_id: 'e2e-test-monthly',
          id: 1,
        },
        {
          cadence: 'monthly',
          external_base_plan_id: 'prepaid-monthly',
          external_product_id: 'e2e-test-monthly-extra',
          id: 3,
        },
        {
          cadence: 'weekly',
          external_base_plan_id: null,
          external_product_id: 'ignored',
          id: 4,
        },
        {
          cadence: 'annual',
          external_base_plan_id: 'prepaid-annual',
          external_product_id: 'premium',
          id: 5,
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
  it('maps the fake client onto the test processor and keeps the first product for a cadence', () => {
    expect(storeProcessorId('fake')).toBe('test');
    expect(storeProcessorId('unavailable')).toBeNull();
    expect(options[0]?.products).toHaveLength(3);
    expect(checkoutProduct(options, 'test', 'monthly')).toMatchObject({
      externalProductId: 'e2e-test-monthly',
    });
    expect(checkoutProduct(options, 'test', 'annual')).toMatchObject({
      basePlanId: 'prepaid-annual',
      externalProductId: 'premium',
    });
    expect(availableCadences(options, 'test')).toEqual(['monthly', 'annual']);
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

  it('describes added time only while membership time is still ahead', () => {
    const later = Date.parse('2026-09-01T00:00:00.000Z');
    const window = addedMembershipWindow({
      cadence: 'monthly',
      membershipExpiresAt: '2026-10-01T00:00:00.000Z',
      nowMs: later,
    });
    expect(window?.start.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(window?.end.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(
      addedMembershipWindow({
        cadence: 'monthly',
        membershipExpiresAt: '2026-08-01T00:00:00.000Z',
        nowMs: later,
      })
    ).toBeNull();
    expect(
      addedMembershipWindow({
        cadence: 'annual',
        membershipExpiresAt: null,
        nowMs: later,
      })
    ).toBeNull();
  });

  it('treats the update-required code as the store-update prompt', () => {
    expect(isClientUpdateRequired('billing.client_update_required')).toBe(true);
    expect(isClientUpdateRequired('billing.purchase_failed')).toBe(false);
    expect(isClientUpdateRequired(null)).toBe(false);
  });

  it('points update links at the store for that platform', () => {
    expect(storeListingUrl('ios')).toContain('apps.apple.com');
    expect(storeListingUrl('android')).toContain(PLAY_PACKAGE_NAME);
  });
});
