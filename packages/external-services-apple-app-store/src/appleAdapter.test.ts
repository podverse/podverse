import {
  APIException,
  Environment,
  NotificationTypeV2,
  Type,
} from '@apple/app-store-server-library';
import { describe, expect, it, vi } from 'vitest';

import { BillingProcessorRecordNotFoundError } from '@podverse/helpers';

import { createAppleAdapter } from './appleAdapter.js';
import { AppStoreServerClient } from './AppStoreServerClient.js';

describe('createAppleAdapter', () => {
  it('maps DID_RENEW notifications to subscription_renewed events', async () => {
    const sandboxClient = {
      getAllSubscriptionStatuses: async () => ({ data: [] }),
      getTransactionInfo: async () => ({ signedTransactionInfo: 'signed-transaction' }),
      requestTestNotification: async () => ({ testNotificationToken: 'token' }),
    };
    const sandboxVerifier = {
      verifyAndDecodeNotification: async () => ({
        notificationType: NotificationTypeV2.DID_RENEW,
        notificationUUID: 'notification-1',
        signedDate: 1_727_100_000_000,
        data: {
          signedTransactionInfo: 'signed-transaction',
          signedRenewalInfo: 'signed-renewal',
        },
      }),
      verifyAndDecodeTransaction: async () => ({
        appAccountToken: '9f3028f8-8442-457e-9f89-8d123f3e68d7',
        currency: 'USD',
        environment: Environment.SANDBOX,
        expiresDate: 1_727_359_200_000,
        originalTransactionId: '1000000999999000',
        price: 3000,
        productId: 'com.podverse.app.next.premium.monthly',
        purchaseDate: 1_727_100_000_000,
        transactionId: '1000000999999001',
        type: Type.AUTO_RENEWABLE_SUBSCRIPTION,
      }),
      verifyAndDecodeRenewalInfo: async () => ({
        autoRenewProductId: 'com.podverse.app.next.premium.monthly',
        autoRenewStatus: 1,
        environment: Environment.SANDBOX,
        originalTransactionId: '1000000999999000',
        renewalDate: 1_727_359_200_000,
      }),
    };

    const client = new AppStoreServerClient({
      issuerId: 'issuer-id',
      keyId: 'ABC123DEF4',
      privateKey: 'private-key',
      bundleId: 'com.podverse.app.next',
      runtimeEnvironment: 'sandbox',
      sandboxClient,
      sandboxVerifier,
    });

    const adapter = createAppleAdapter({
      issuerId: 'issuer-id',
      keyId: 'ABC123DEF4',
      privateKeyPath: '/tmp/example.p8',
      bundleId: 'com.podverse.app.next',
      client,
    });

    const result = await adapter.verifyAndParseWebhook({
      rawBody: JSON.stringify({ signedPayload: 'header.payload.signature' }),
      headers: {},
    });

    expect(result.schemaVersion).toBe('apple-asn-v2');
    expect(result.events).toEqual([
      {
        type: 'subscription_renewed',
        processor: 'apple',
        processorEventId: 'notification-1:renewed',
        accountBillingCustomerRef: '9f3028f8-8442-457e-9f89-8d123f3e68d7',
        accountId: null,
        occurredAt: '2024-09-23T14:00:00.000Z',
        isSandbox: true,
        externalSubscriptionId: '1000000999999000',
        externalProductId: 'com.podverse.app.next.premium.monthly',
        externalBasePlanId: null,
        externalTransactionId: '1000000999999001',
        periodStart: '2024-09-23T14:00:00.000Z',
        periodEnd: '2024-09-26T14:00:00.000Z',
        amount: {
          value: '3',
          currencyCode: 'USD',
        },
      },
    ]);
  });

  it('maps REVOKE notifications to refund_or_revoke store revocations', async () => {
    const sandboxClient = {
      getAllSubscriptionStatuses: async () => ({ data: [] }),
      getTransactionInfo: async () => ({ signedTransactionInfo: 'signed-transaction' }),
      requestTestNotification: async () => ({ testNotificationToken: 'token' }),
    };
    const sandboxVerifier = {
      verifyAndDecodeNotification: async () => ({
        notificationType: NotificationTypeV2.REVOKE,
        notificationUUID: 'notification-2',
        signedDate: 1_727_100_000_000,
        data: {
          signedTransactionInfo: 'signed-transaction',
          signedRenewalInfo: 'signed-renewal',
        },
      }),
      verifyAndDecodeTransaction: async () => ({
        appAccountToken: 'a2aa4ad7-013f-424d-a91a-c26b1f9cc8d4',
        environment: Environment.SANDBOX,
        originalTransactionId: '1000000999999100',
        productId: 'com.podverse.app.next.premium.annual',
        revocationDate: 1_727_100_050_000,
        transactionId: '1000000999999101',
        type: Type.AUTO_RENEWABLE_SUBSCRIPTION,
      }),
      verifyAndDecodeRenewalInfo: async () => ({
        autoRenewStatus: 1,
        environment: Environment.SANDBOX,
        originalTransactionId: '1000000999999100',
      }),
    };

    const client = new AppStoreServerClient({
      issuerId: 'issuer-id',
      keyId: 'ABC123DEF4',
      privateKey: 'private-key',
      bundleId: 'com.podverse.app.next',
      runtimeEnvironment: 'sandbox',
      sandboxClient,
      sandboxVerifier,
    });

    const adapter = createAppleAdapter({
      issuerId: 'issuer-id',
      keyId: 'ABC123DEF4',
      privateKeyPath: '/tmp/example.p8',
      bundleId: 'com.podverse.app.next',
      client,
    });

    const result = await adapter.verifyAndParseWebhook({
      rawBody: JSON.stringify({ signedPayload: 'header.payload.signature' }),
      headers: {},
    });

    expect(result.events).toEqual([
      {
        type: 'refund_or_revoke',
        processor: 'apple',
        processorEventId: 'notification-2:revoke',
        accountBillingCustomerRef: 'a2aa4ad7-013f-424d-a91a-c26b1f9cc8d4',
        accountId: null,
        occurredAt: '2024-09-23T14:00:00.000Z',
        isSandbox: true,
        reason: 'store_revoke',
        revokedAt: '2024-09-23T14:00:00.000Z',
        externalTransactionId: '1000000999999101',
        externalSubscriptionId: '1000000999999100',
      },
    ]);
  });
});

describe('createAppleAdapter with APPLE_IAP_ENVIRONMENT=xcode', () => {
  const BUNDLE_ID = 'com.podverse.app.next';
  const DAY_MS = 86_400_000;

  const unsignedJws = (payload: Record<string, unknown>): string => {
    const encode = (value: Record<string, unknown>): string =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({ alg: 'ES256', typ: 'JWT' })}.${encode(payload)}.`;
  };

  const xcodeAdapter = () =>
    createAppleAdapter({
      issuerId: '',
      keyId: '',
      privateKeyPath: '/nonexistent/AuthKey.p8',
      bundleId: BUNDLE_ID,
      appleEnvironment: 'xcode',
      nodeEnv: 'development',
    });

  const now = Date.now();
  const oneTime = {
    bundleId: BUNDLE_ID,
    environment: Environment.XCODE,
    expiresDate: now + 30 * DAY_MS,
    productId: 'com.podverse.app.next.premium.onetime.monthly',
    purchaseDate: now,
    signedDate: now,
    transactionId: '0',
    type: Type.NON_RENEWING_SUBSCRIPTION,
  };

  it('reads a one-time purchase from the signed transaction without the key file', async () => {
    const snapshot = await xcodeAdapter().fetchTransaction({
      externalId: '0',
      externalProductId: oneTime.productId,
      signedTransaction: unsignedJws(oneTime),
    });
    expect(snapshot.purchaseKind).toBe('one_time');
    expect(snapshot.isSandbox).toBe(true);
    expect(snapshot.externalProductId).toBe(oneTime.productId);
    expect(snapshot.periodEnd).toBe(new Date(oneTime.expiresDate).toISOString());
  });

  it('reports an unexpired subscription as active', async () => {
    const snapshot = await xcodeAdapter().fetchSubscription({
      externalId: '1',
      externalProductId: 'com.podverse.app.next.premium.monthly',
      signedTransaction: unsignedJws({
        ...oneTime,
        originalTransactionId: '1',
        productId: 'com.podverse.app.next.premium.monthly',
        transactionId: '1',
        type: Type.AUTO_RENEWABLE_SUBSCRIPTION,
      }),
    });
    expect(snapshot.status).toBe('active');
    expect(snapshot.purchaseKind).toBe('auto_renew');
    expect(snapshot.externalSubscriptionId).toBe('1');
  });

  it('finds no record without a signed transaction, for another id, or from another app', async () => {
    const adapter = xcodeAdapter();
    await expect(
      adapter.fetchTransaction({ externalId: '0', externalProductId: null })
    ).rejects.toThrow(BillingProcessorRecordNotFoundError);
    await expect(
      adapter.fetchTransaction({
        externalId: '99',
        externalProductId: null,
        signedTransaction: unsignedJws(oneTime),
      })
    ).rejects.toThrow(BillingProcessorRecordNotFoundError);
    await expect(
      adapter.fetchTransaction({
        externalId: '0',
        externalProductId: null,
        signedTransaction: unsignedJws({ ...oneTime, bundleId: 'com.example.other' }),
      })
    ).rejects.toThrow(BillingProcessorRecordNotFoundError);
    await expect(
      adapter.fetchTransaction({
        externalId: '0',
        externalProductId: null,
        signedTransaction: unsignedJws({ ...oneTime, environment: Environment.SANDBOX }),
      })
    ).rejects.toThrow(BillingProcessorRecordNotFoundError);
  });

  it('is refused in production', () => {
    expect(() =>
      createAppleAdapter({
        issuerId: '',
        keyId: '',
        privateKeyPath: '',
        bundleId: BUNDLE_ID,
        appleEnvironment: 'xcode',
        nodeEnv: 'production',
      })
    ).toThrow('APPLE_IAP_ENVIRONMENT=xcode is refused when NODE_ENV is production');
  });
});

describe('AppStoreServerClient', () => {
  it('falls back from production to sandbox on transaction not found', async () => {
    const productionClient = {
      getAllSubscriptionStatuses: async () => ({ data: [] }),
      getTransactionInfo: vi.fn(async () => {
        throw new APIException(404, 4040010, 'not found');
      }),
      requestTestNotification: async () => ({ testNotificationToken: 'token-prod' }),
    };
    const sandboxClient = {
      getAllSubscriptionStatuses: async () => ({ data: [] }),
      getTransactionInfo: vi.fn(async () => ({ signedTransactionInfo: 'signed-sandbox' })),
      requestTestNotification: async () => ({ testNotificationToken: 'token-sandbox' }),
    };
    const productionVerifier = {
      verifyAndDecodeNotification: async () => ({
        notificationUUID: 'production-verifier',
      }),
      verifyAndDecodeTransaction: async () => ({
        transactionId: 'transaction-id',
      }),
      verifyAndDecodeRenewalInfo: async () => ({
        originalTransactionId: 'original-transaction-id',
      }),
    };
    const sandboxVerifier = {
      verifyAndDecodeNotification: async () => ({
        notificationUUID: 'sandbox-verifier',
      }),
      verifyAndDecodeTransaction: async () => ({
        transactionId: 'transaction-id',
      }),
      verifyAndDecodeRenewalInfo: async () => ({
        originalTransactionId: 'original-transaction-id',
      }),
    };

    const client = new AppStoreServerClient({
      issuerId: 'issuer-id',
      keyId: 'ABC123DEF4',
      privateKey: 'private-key',
      bundleId: 'com.podverse.app.next',
      runtimeEnvironment: 'production',
      productionClient,
      sandboxClient,
      productionVerifier,
      sandboxVerifier,
    });

    const result = await client.getTransactionInfoWithFallback('1000000111111111');

    expect(result.environment).toBe(Environment.SANDBOX);
    expect(result.response.signedTransactionInfo).toBe('signed-sandbox');
    expect(productionClient.getTransactionInfo).toHaveBeenCalledWith('1000000111111111');
    expect(sandboxClient.getTransactionInfo).toHaveBeenCalledWith('1000000111111111');
  });
});
