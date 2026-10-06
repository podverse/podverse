import { Buffer } from 'node:buffer';

import { describe, expect, it, vi } from 'vitest';

import type { BillingWebhookRequest } from '@podverse/helpers';

import { createGooglePlayAdapter } from './googlePlayAdapter.js';
import type {
  GoogleIdTokenPayload,
  GoogleIdTokenTicket,
  GoogleIdTokenVerifier,
  GooglePlayClient,
  GooglePlayVoidedPurchasesPage,
  ListVoidedPurchasesParams,
} from './PlayDeveloperClient.js';

class StaticIdTokenTicket implements GoogleIdTokenTicket {
  private readonly payload: GoogleIdTokenPayload;

  constructor(payload: GoogleIdTokenPayload) {
    this.payload = payload;
  }

  getPayload(): GoogleIdTokenPayload {
    return this.payload;
  }
}

class StaticIdTokenVerifier implements GoogleIdTokenVerifier {
  private readonly payload: GoogleIdTokenPayload;

  constructor(payload: GoogleIdTokenPayload) {
    this.payload = payload;
  }

  async verifyIdToken(): Promise<GoogleIdTokenTicket> {
    return new StaticIdTokenTicket(this.payload);
  }
}

function buildWebhookRequest(
  developerNotification: Record<string, unknown>,
  messageId = 'message-1'
): BillingWebhookRequest {
  const body = {
    message: {
      data: Buffer.from(JSON.stringify(developerNotification)).toString('base64'),
      messageId,
    },
    subscription: 'projects/podverse-app/subscriptions/play-rtdn-push',
  };
  return {
    rawBody: JSON.stringify(body),
    headers: {
      authorization: 'Bearer signed.jwt.token',
    },
  };
}

function createClient(overrides: Partial<GooglePlayClient>): GooglePlayClient {
  const emptyPage: GooglePlayVoidedPurchasesPage = {
    purchases: [],
    nextPageToken: null,
  };
  return {
    getIdTokenVerifier: () =>
      new StaticIdTokenVerifier({
        email: 'podverse-google-play-billing@podverse-app.iam.gserviceaccount.com',
        email_verified: true,
      }),
    getSubscriptionPurchase: async () => null,
    acknowledgeSubscriptionPurchase: async () => undefined,
    getProductPurchase: async () => null,
    acknowledgeProductPurchase: async () => undefined,
    listVoidedPurchases: async (_params: ListVoidedPurchasesParams = {}) => emptyPage,
    ...overrides,
  };
}

describe('createGooglePlayAdapter', () => {
  it('maps RTDN subscription purchases and emits linked-token supersede events', async () => {
    const subscriptionPurchase = {
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
      externalAccountIdentifiers: {
        obfuscatedExternalAccountId: 'customer-ref-1',
      },
      lineItems: [
        {
          expiryTime: '2026-10-01T00:00:00.000Z',
          latestSuccessfulOrderId: 'GPA.1234-5678-9012-34567',
          offerDetails: {
            basePlanId: 'prepaid-monthly',
          },
          prepaidPlan: {},
          productId: 'premium',
          startTime: '2026-09-01T00:00:00.000Z',
        },
      ],
      linkedPurchaseToken: 'old-token-1',
      testPurchase: {},
    };

    const adapter = createGooglePlayAdapter({
      packageName: 'com.podverse.app.next',
      serviceAccountJsonPath: '/tmp/not-used-in-test.json',
      rtdnPushAudience: 'podverse-local-rtdn',
      rtdnPushServiceAccountEmail:
        'podverse-google-play-billing@podverse-app.iam.gserviceaccount.com',
      client: createClient({
        getSubscriptionPurchase: async (token) =>
          token === 'new-token-1' ? subscriptionPurchase : null,
      }),
    });

    const result = await adapter.verifyAndParseWebhook(
      buildWebhookRequest({
        eventTimeMillis: '1790812800000',
        packageName: 'com.podverse.app.next',
        subscriptionNotification: {
          notificationType: 4,
          purchaseToken: 'new-token-1',
          subscriptionId: 'premium',
          version: '1.0',
        },
        version: '1.0',
      })
    );

    expect(result.events).toEqual([
      {
        type: 'payment_settled',
        processor: 'google_play',
        processorEventId: 'message-1:subscription_purchased',
        accountBillingCustomerRef: 'customer-ref-1',
        accountId: null,
        occurredAt: '2026-10-01T00:00:00.000Z',
        isSandbox: true,
        purchaseKind: 'one_time',
        externalTransactionId: 'GPA.1234-5678-9012-34567',
        externalSubscriptionId: 'new-token-1',
        externalProductId: 'premium',
        externalBasePlanId: 'prepaid-monthly',
        periodStart: '2026-09-01T00:00:00.000Z',
        periodEnd: '2026-10-01T00:00:00.000Z',
        amount: null,
      },
      {
        type: 'subscription_expired',
        processor: 'google_play',
        processorEventId: 'message-1:superseded_old-token-1',
        accountBillingCustomerRef: 'customer-ref-1',
        accountId: null,
        occurredAt: '2026-10-01T00:00:00.000Z',
        isSandbox: true,
        externalSubscriptionId: 'old-token-1',
        expiredAt: '2026-09-01T00:00:00.000Z',
        replacedByExternalSubscriptionId: 'new-token-1',
      },
    ]);
  });

  it('acknowledges subscription purchases exactly once when pending', async () => {
    const acknowledgeSubscriptionPurchase = vi.fn(
      async (_subscriptionId: string, _purchaseToken: string) => undefined
    );
    const acknowledgeProductPurchase = vi.fn(
      async (_productId: string, _purchaseToken: string) => undefined
    );

    const adapter = createGooglePlayAdapter({
      packageName: 'com.podverse.app.next',
      serviceAccountJsonPath: '/tmp/not-used-in-test.json',
      rtdnPushAudience: 'podverse-local-rtdn',
      rtdnPushServiceAccountEmail:
        'podverse-google-play-billing@podverse-app.iam.gserviceaccount.com',
      client: createClient({
        acknowledgeProductPurchase,
        acknowledgeSubscriptionPurchase,
        getSubscriptionPurchase: async () => ({
          acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
          lineItems: [{ productId: 'premium' }],
        }),
      }),
    });

    await adapter.acknowledgePurchase?.({
      purchaseKind: 'auto_renew',
      purchaseToken: 'token-1',
      externalProductId: 'premium',
    });

    expect(acknowledgeSubscriptionPurchase).toHaveBeenCalledTimes(1);
    expect(acknowledgeSubscriptionPurchase).toHaveBeenCalledWith('premium', 'token-1');
    expect(acknowledgeProductPurchase).toHaveBeenCalledTimes(0);
  });
});
