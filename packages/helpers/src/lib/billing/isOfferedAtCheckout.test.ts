import { describe, expect, it } from 'vitest';

import { isOfferedAtCheckout } from './isOfferedAtCheckout.js';

describe('isOfferedAtCheckout', () => {
  const channel = {
    enabled: true,
    minClientVersion: null,
    storefrontAllowlist: [] as const,
  };
  const product = { isActive: true };

  it('returns false when the checkout channel is disabled', () => {
    expect(
      isOfferedAtCheckout({
        channel: { ...channel, enabled: false },
        product,
        storefront: null,
        clientVersion: null,
      })
    ).toBe(false);
  });

  it('returns false when the storefront is not on the allowlist', () => {
    expect(
      isOfferedAtCheckout({
        channel: { ...channel, storefrontAllowlist: ['US', 'CA'] },
        product,
        storefront: 'GB',
        clientVersion: null,
      })
    ).toBe(false);
  });

  it('returns false when the client version is below the channel minimum', () => {
    expect(
      isOfferedAtCheckout({
        channel: { ...channel, minClientVersion: '5.5.3' },
        product,
        storefront: null,
        clientVersion: '5.5.2',
      })
    ).toBe(false);
  });

  it('returns false when the product is inactive', () => {
    expect(
      isOfferedAtCheckout({
        channel,
        product: { isActive: false },
        storefront: null,
        clientVersion: null,
      })
    ).toBe(false);
  });

  it('returns true when channel and product checks pass', () => {
    expect(
      isOfferedAtCheckout({
        channel: { ...channel, minClientVersion: '5.5.3', storefrontAllowlist: ['US'] },
        product,
        storefront: 'us',
        clientVersion: '5.5.4',
      })
    ).toBe(true);
  });
});
