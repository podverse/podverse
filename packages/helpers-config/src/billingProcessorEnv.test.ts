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
  BILLING_PAYPAL_ENABLED: 'true',
  PAYPAL_CLIENT_ID: 'client',
  PAYPAL_CLIENT_SECRET: 'secret',
  PAYPAL_WEBHOOK_ID: 'webhook',
  PAYPAL_ENVIRONMENT: 'sandbox',
};

function paypalWithoutFlag(): Record<string, string> {
  const credentials: Record<string, string> = { ...PAYPAL_ENV };
  delete credentials.BILLING_PAYPAL_ENABLED;
  return credentials;
}

describe('readBillingProcessorEnv', () => {
  it('leaves every processor off when no credentials are set, despite template defaults', () => {
    expect(
      readBillingProcessorEnv({
        APPLE_IAP_BUNDLE_ID: 'com.podverse.app.next',
        GOOGLE_PLAY_PACKAGE_NAME: 'com.podverse.app.next',
      })
    ).toEqual({ paypal: null, apple: null, googlePlay: null });
  });

  it('reads a processor only when the flag is on and every required key is set', () => {
    expect(readBillingProcessorEnv(PAYPAL_ENV).paypal).toEqual({
      clientId: 'client',
      clientSecret: 'secret',
      webhookId: 'webhook',
      environment: 'sandbox',
    });
    expect(readBillingProcessorEnv({ ...PAYPAL_ENV, PAYPAL_WEBHOOK_ID: '  ' }).paypal).toBeNull();
  });

  it('leaves a processor off when credentials are set and the flag is unset or false', () => {
    expect(readBillingProcessorEnv(paypalWithoutFlag()).paypal).toBeNull();
    expect(
      readBillingProcessorEnv({ ...PAYPAL_ENV, BILLING_PAYPAL_ENABLED: 'false' }).paypal
    ).toBeNull();
  });

  it('accepts an uppercase TRUE flag', () => {
    expect(
      readBillingProcessorEnv({ ...PAYPAL_ENV, BILLING_PAYPAL_ENABLED: 'TRUE' }).paypal
    ).toEqual({
      clientId: 'client',
      clientSecret: 'secret',
      webhookId: 'webhook',
      environment: 'sandbox',
    });
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

  it('names the missing keys when the flag is on and a secret is missing', () => {
    const results = validatePayPalProcessorEnv({
      BILLING_PAYPAL_ENABLED: 'true',
      PAYPAL_CLIENT_ID: 'client',
    });
    const invalid = results.filter((result) => !result.isValid).map((result) => result.name);
    expect(invalid).toEqual(['PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID']);
  });

  it('skips set credentials when the flag is off and mentions the flag', () => {
    const results = validatePayPalProcessorEnv(paypalWithoutFlag());
    expect(results.every((result) => result.isValid)).toBe(true);
    const clientId = results.find((result) => result.name === 'PAYPAL_CLIENT_ID');
    expect(clientId?.message).toContain('BILLING_PAYPAL_ENABLED');
  });

  it('rejects a flag value that is neither true nor false', () => {
    const results = validatePayPalProcessorEnv({ BILLING_PAYPAL_ENABLED: 'yes' });
    expect(results.find((result) => result.name === 'BILLING_PAYPAL_ENABLED')?.isValid).toBe(
      false
    );
  });

  it('needs only the bundle id for Apple in xcode mode, and refuses that mode in production', () => {
    const xcodeEnv = {
      BILLING_APPLE_IAP_ENABLED: 'true',
      APPLE_IAP_BUNDLE_ID: 'com.podverse.app.next',
      APPLE_IAP_ENVIRONMENT: 'xcode',
    };
    expect(readBillingProcessorEnv(xcodeEnv).apple).toMatchObject({
      bundleId: 'com.podverse.app.next',
      environment: 'xcode',
    });
    expect(validateAppleProcessorEnv(xcodeEnv).every((result) => result.isValid)).toBe(true);

    const production = validateAppleProcessorEnv({ ...xcodeEnv, NODE_ENV: 'production' });
    expect(production.find((result) => result.name === 'APPLE_IAP_ENVIRONMENT')?.isValid).toBe(
      false
    );

    const sandbox = validateAppleProcessorEnv({ ...xcodeEnv, APPLE_IAP_ENVIRONMENT: 'sandbox' });
    expect(sandbox.filter((result) => !result.isValid).map((result) => result.name)).toEqual([
      'APPLE_IAP_ISSUER_ID',
      'APPLE_IAP_KEY_ID',
      'APPLE_IAP_PRIVATE_KEY_PATH',
    ]);
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
