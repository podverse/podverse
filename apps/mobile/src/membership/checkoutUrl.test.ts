import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCheckoutUrl } from './checkoutUrl';

const mocks = vi.hoisted(() => ({ webBaseUrl: 'https://example.test' }));

vi.mock('../config', () => ({
  getMobileConfig: () => ({ webBaseUrl: mocks.webBaseUrl }),
}));

describe('buildCheckoutUrl', () => {
  afterEach(() => {
    mocks.webBaseUrl = 'https://example.test';
  });

  it('builds the sign-up URL for logged-out sign-up', () => {
    expect(buildCheckoutUrl('sign_up')).toBe('https://example.test/sign-up');
  });

  it('builds the checkout URL for logged-in extend', () => {
    expect(buildCheckoutUrl('extend')).toBe('https://example.test/checkout');
  });

  it('trims a trailing slash on the base URL so the path is not doubled', () => {
    mocks.webBaseUrl = 'https://example.test/';
    expect(buildCheckoutUrl('extend')).toBe('https://example.test/checkout');
  });
});
