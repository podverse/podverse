import { APIException, Environment, NotificationTypeV2 } from '@apple/app-store-server-library';
import { describe, expect, it, vi } from 'vitest';

import {
  BillingProcessorRecordNotFoundError,
  BillingWebhookVerificationError,
} from '@podverse/helpers';

import { createAppleAdapter } from './appleAdapter.js';
import { AppStoreServerClient } from './AppStoreServerClient.js';
import { appleSoldTransactionType, appleUnsoldTransactionType } from './verifyNotification.js';

const SOLD_PRODUCT_ID = 'com.podverse.app.next.premium.monthly';

function soldProducts() {
  return [{ externalProductId: SOLD_PRODUCT_ID, externalBasePlanId: null }];
}

function createSandboxAdapter(params: {
  notification: Record<string, unknown>;
  transaction: Record<string, unknown>;
}) {
  const sandboxClient = {
    getTransactionInfo: async () => ({ signedTransactionInfo: 'signed-transaction' }),
    requestTestNotification: async () => ({ testNotificationToken: 'token' }),
  };
  const sandboxVerifier = {
    verifyAndDecodeNotification: async () => params.notification,
    verifyAndDecodeTransaction: async () => params.transaction,
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
  return createAppleAdapter({
    issuerId: 'issuer-id',
    keyId: 'ABC123DEF4',
    privateKeyPath: '/tmp/example.p8',
    bundleId: 'com.podverse.app.next',
    client,
    soldProducts: soldProducts(),
  });
}

describe('createAppleAdapter', () => {
  it('maps ONE_TIME_CHARGE to payment_settled', async () => {
    const adapter = createSandboxAdapter({
      notification: {
        notificationType: NotificationTypeV2.ONE_TIME_CHARGE,
        notificationUUID: 'notification-1',
        signedDate: 1_727_100_000_000,
        data: {
          signedTransactionInfo: 'signed-transaction',
        },
      },
      transaction: {
        appAccountToken: '9f3028f8-8442-457e-9f89-8d123f3e68d7',
        currency: 'USD',
        environment: Environment.SANDBOX,
        expiresDate: 1_727_359_200_000,
        price: 3000,
        productId: SOLD_PRODUCT_ID,
        purchaseDate: 1_727_100_000_000,
        transactionId: '1000000999999001',
        type: appleSoldTransactionType(),
      },
    });

    const result = await adapter.verifyAndParseWebhook({
      rawBody: JSON.stringify({ signedPayload: 'header.payload.signature' }),
      headers: {},
    });

    expect(result.schemaVersion).toBe('apple-asn-v2');
    expect(result.events).toEqual([
      {
        type: 'payment_settled',
        processor: 'apple',
        processorEventId: 'notification-1:payment_settled',
        accountBillingCustomerRef: '9f3028f8-8442-457e-9f89-8d123f3e68d7',
        accountId: null,
        occurredAt: '2024-09-23T14:00:00.000Z',
        isSandbox: true,
        externalProductId: SOLD_PRODUCT_ID,
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

  it('maps REFUND to refund_or_revoke', async () => {
    const adapter = createSandboxAdapter({
      notification: {
        notificationType: NotificationTypeV2.REFUND,
        notificationUUID: 'notification-refund',
        signedDate: 1_727_100_000_000,
        data: {
          signedTransactionInfo: 'signed-transaction',
        },
      },
      transaction: {
        appAccountToken: 'a2aa4ad7-013f-424d-a91a-c26b1f9cc8d4',
        environment: Environment.SANDBOX,
        productId: SOLD_PRODUCT_ID,
        transactionId: '1000000999999101',
        type: appleSoldTransactionType(),
      },
    });

    const result = await adapter.verifyAndParseWebhook({
      rawBody: JSON.stringify({ signedPayload: 'header.payload.signature' }),
      headers: {},
    });

    expect(result.events).toEqual([
      {
        type: 'refund_or_revoke',
        processor: 'apple',
        processorEventId: 'notification-refund:refund',
        accountBillingCustomerRef: 'a2aa4ad7-013f-424d-a91a-c26b1f9cc8d4',
        accountId: null,
        occurredAt: '2024-09-23T14:00:00.000Z',
        isSandbox: true,
        reason: 'refund',
        revokedAt: '2024-09-23T14:00:00.000Z',
        externalTransactionId: '1000000999999101',
      },
    ]);
  });

  it('maps REVOKE to refund_or_revoke', async () => {
    const adapter = createSandboxAdapter({
      notification: {
        notificationType: NotificationTypeV2.REVOKE,
        notificationUUID: 'notification-2',
        signedDate: 1_727_100_000_000,
        data: {
          signedTransactionInfo: 'signed-transaction',
        },
      },
      transaction: {
        appAccountToken: 'a2aa4ad7-013f-424d-a91a-c26b1f9cc8d4',
        environment: Environment.SANDBOX,
        productId: SOLD_PRODUCT_ID,
        transactionId: '1000000999999101',
        type: appleSoldTransactionType(),
      },
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
      },
    ]);
  });

  it('returns no events for an unsold transaction type', async () => {
    const adapter = createSandboxAdapter({
      notification: {
        notificationType: NotificationTypeV2.ONE_TIME_CHARGE,
        notificationUUID: 'notification-unsold',
        signedDate: 1_727_100_000_000,
        data: { signedTransactionInfo: 'signed-transaction' },
      },
      transaction: {
        environment: Environment.SANDBOX,
        productId: SOLD_PRODUCT_ID,
        transactionId: '1000000999999001',
        type: appleUnsoldTransactionType(),
      },
    });

    const result = await adapter.verifyAndParseWebhook({
      rawBody: JSON.stringify({ signedPayload: 'header.payload.signature' }),
      headers: {},
    });

    expect(result.events).toEqual([]);
  });

  it('returns no events for a product that is not mapped', async () => {
    const adapter = createSandboxAdapter({
      notification: {
        notificationType: NotificationTypeV2.ONE_TIME_CHARGE,
        notificationUUID: 'notification-unknown',
        signedDate: 1_727_100_000_000,
        data: { signedTransactionInfo: 'signed-transaction' },
      },
      transaction: {
        environment: Environment.SANDBOX,
        productId: 'com.example.other',
        transactionId: '1000000999999001',
        type: appleSoldTransactionType(),
      },
    });

    const result = await adapter.verifyAndParseWebhook({
      rawBody: JSON.stringify({ signedPayload: 'header.payload.signature' }),
      headers: {},
    });

    expect(result.events).toEqual([]);
  });

  it('rejects a webhook with no signed payload', async () => {
    const adapter = createSandboxAdapter({
      notification: {},
      transaction: {},
    });

    await expect(
      adapter.verifyAndParseWebhook({
        rawBody: JSON.stringify({}),
        headers: {},
      })
    ).rejects.toBeInstanceOf(BillingWebhookVerificationError);
  });

  it('rejects a webhook whose signature does not verify', async () => {
    const sandboxVerifier = {
      verifyAndDecodeNotification: async () => {
        throw new Error('signature rejected');
      },
      verifyAndDecodeTransaction: async () => ({}),
    };
    const client = new AppStoreServerClient({
      issuerId: 'issuer-id',
      keyId: 'ABC123DEF4',
      privateKey: 'private-key',
      bundleId: 'com.podverse.app.next',
      runtimeEnvironment: 'sandbox',
      sandboxClient: {
        getTransactionInfo: async () => ({ signedTransactionInfo: 'signed-transaction' }),
        requestTestNotification: async () => ({ testNotificationToken: 'token' }),
      },
      sandboxVerifier,
    });
    const adapter = createAppleAdapter({
      issuerId: 'issuer-id',
      keyId: 'ABC123DEF4',
      privateKeyPath: '/tmp/example.p8',
      bundleId: 'com.podverse.app.next',
      client,
      soldProducts: soldProducts(),
    });

    await expect(
      adapter.verifyAndParseWebhook({
        rawBody: JSON.stringify({ signedPayload: 'header.payload.signature' }),
        headers: {},
      })
    ).rejects.toThrow('signature rejected');
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
      soldProducts: soldProducts(),
    });

  const now = Date.now();
  const oneTime = {
    bundleId: BUNDLE_ID,
    environment: Environment.XCODE,
    expiresDate: now + 30 * DAY_MS,
    productId: SOLD_PRODUCT_ID,
    purchaseDate: now,
    signedDate: now,
    transactionId: '0',
    type: appleSoldTransactionType(),
  };

  it('reads a purchase from the signed transaction without the key file', async () => {
    const snapshot = await xcodeAdapter().fetchTransaction({
      externalId: '0',
      externalProductId: oneTime.productId,
      signedTransaction: unsignedJws(oneTime),
    });
    expect(snapshot.isSandbox).toBe(true);
    expect(snapshot.externalProductId).toBe(oneTime.productId);
    expect(snapshot.externalTransactionId).toBe('0');
    expect(snapshot.periodEnd).toBe(new Date(oneTime.expiresDate).toISOString());
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
      getTransactionInfo: vi.fn(async () => {
        throw new APIException(404, 4040010, 'not found');
      }),
      requestTestNotification: async () => ({ testNotificationToken: 'token-prod' }),
    };
    const sandboxClient = {
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
    };
    const sandboxVerifier = {
      verifyAndDecodeNotification: async () => ({
        notificationUUID: 'sandbox-verifier',
      }),
      verifyAndDecodeTransaction: async () => ({
        transactionId: 'transaction-id',
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
