import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCheckoutUrl, buildWebPathUrl } from './checkoutUrl';

const mocks = vi.hoisted(() => ({
  customApiBaseUrl: null as string | null,
  customApiWebOrigin: null as string | null,
  webBaseUrl: 'https://example.test' as string | null,
}));

vi.mock('../config', () => ({
  getMobileConfig: () => ({
    customApiBaseUrl: mocks.customApiBaseUrl,
    customApiWebOrigin: mocks.customApiWebOrigin,
    webBaseUrl: mocks.webBaseUrl,
  }),
}));

describe('buildCheckoutUrl', () => {
  afterEach(() => {
    mocks.customApiBaseUrl = null;
    mocks.customApiWebOrigin = null;
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

  it('builds an absolute URL for a web path', () => {
    expect(buildWebPathUrl('/terms')).toBe('https://example.test/terms');
    expect(buildWebPathUrl('terms')).toBe('https://example.test/terms');
  });

  it('returns null when this build has no web host', () => {
    mocks.webBaseUrl = null;
    expect(buildCheckoutUrl('sign_up')).toBeNull();
    expect(buildWebPathUrl('/terms')).toBeNull();
  });

  it('uses the custom API website when one is stored', () => {
    mocks.customApiBaseUrl = 'https://pv.example/api/v2';
    mocks.customApiWebOrigin = 'https://pv.example';
    expect(buildCheckoutUrl('extend')).toBe('https://pv.example/checkout');
    expect(buildWebPathUrl('/terms')).toBe('https://pv.example/terms');
  });

  it('returns null when a custom API did not report a website', () => {
    mocks.customApiBaseUrl = 'https://pv.example/api/v2';
    mocks.customApiWebOrigin = null;
    expect(buildCheckoutUrl('sign_up')).toBeNull();
    expect(buildWebPathUrl('/terms')).toBeNull();
  });
});
