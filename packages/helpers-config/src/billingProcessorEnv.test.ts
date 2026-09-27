import { describe, expect, it } from 'vitest';

import {
  readBillingProcessorEnv,
  validateAppleProcessorEnv,
  validateBillingExpirationEnv,
  validateBillingSandboxAllowlistEnv,
  validateGooglePlayProcessorEnv,
  validatePayPalProcessorEnv,
} from './billingProcessorEnv.js';

const PAYPAL_ENV = {
  PAYPAL_CLIENT_ID: 'client',
  PAYPAL_CLIENT_SECRET: 'secret',
  PAYPAL_WEBHOOK_ID: 'webhook',
  PAYPAL_ENVIRONMENT: 'sandbox',
};

describe('readBillingProcessorEnv', () => {
  it('leaves every processor off when no credentials are set, despite template defaults', () => {
    expect(
      readBillingProcessorEnv({
        APPLE_IAP_BUNDLE_ID: 'com.podverse.app.next',
        GOOGLE_PLAY_PACKAGE_NAME: 'com.podverse.app.next',
      })
    ).toEqual({ paypal: null, apple: null, googlePlay: null });
  });

  it('reads a processor only when every required key is set', () => {
    expect(readBillingProcessorEnv(PAYPAL_ENV).paypal).toEqual({
      clientId: 'client',
      clientSecret: 'secret',
      webhookId: 'webhook',
      environment: 'sandbox',
    });
    expect(readBillingProcessorEnv({ ...PAYPAL_ENV, PAYPAL_WEBHOOK_ID: '  ' }).paypal).toBeNull();
  });
});

describe('processor validation', () => {
  it('passes when a processor is not enabled', () => {
    const results = [
      ...validatePayPalProcessorEnv({}),
      ...validateAppleProcessorEnv({ APPLE_IAP_BUNDLE_ID: 'com.podverse.app.next' }),
      ...validateGooglePlayProcessorEnv({ GOOGLE_PLAY_PACKAGE_NAME: 'com.podverse.app.next' }),
    ];
    expect(results.every((result) => result.isValid)).toBe(true);
  });

  it('requires the remaining keys once one credential is set', () => {
    const results = validatePayPalProcessorEnv({ PAYPAL_CLIENT_ID: 'client' });
    const invalid = results.filter((result) => !result.isValid).map((result) => result.name);
    expect(invalid).toEqual(['PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID']);
  });

  it('rejects an unknown PayPal environment', () => {
    const results = validatePayPalProcessorEnv({ ...PAYPAL_ENV, PAYPAL_ENVIRONMENT: 'staging' });
    expect(results.find((result) => result.name === 'PAYPAL_ENVIRONMENT')?.isValid).toBe(false);
  });
});

describe('billing policy validation', () => {
  it('accepts whole seconds and rejects anything else', () => {
    const key = 'BILLING_PAYMENT_FAILURE_GRACE_EXPIRATION';
    expect(validateBillingExpirationEnv({ [key]: '604800' }, key, 604800).isValid).toBe(true);
    expect(validateBillingExpirationEnv({ [key]: '7d' }, key, 604800).isValid).toBe(false);
    expect(validateBillingExpirationEnv({}, key, 604800).isValid).toBe(true);
  });

  it('accepts account ids and id_text values in the sandbox allowlist', () => {
    const key = 'BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS';
    expect(validateBillingSandboxAllowlistEnv({ [key]: '12, abc_DEF-9' }).isValid).toBe(true);
    expect(validateBillingSandboxAllowlistEnv({ [key]: '12;13' }).isValid).toBe(false);
  });
});
