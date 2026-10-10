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

const SOLD_PRODUCTS = [{ externalProductId: 'premium', externalBasePlanId: 'prepaid-monthly' }];

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

function adapterConfig(client: GooglePlayClient) {
  return {
    packageName: 'com.podverse.app.next',
    serviceAccountJsonPath: '/tmp/not-used-in-test.json',
    rtdnPushAudience: 'podverse-local-rtdn',
    rtdnPushServiceAccountEmail:
      'podverse-google-play-billing@podverse-app.iam.gserviceaccount.com',
    client,
    soldProducts: SOLD_PRODUCTS,
  };
}

function prepaidPurchase(orderId: string) {
  return {
    acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
    externalAccountIdentifiers: {
      obfuscatedExternalAccountId: 'customer-ref-1',
    },
    lineItems: [
      {
        expiryTime: '2026-10-01T00:00:00.000Z',
        latestSuccessfulOrderId: orderId,
        offerDetails: {
          basePlanId: 'prepaid-monthly',
        },
        prepaidPlan: {},
        productId: 'premium',
        startTime: '2026-09-01T00:00:00.000Z',
      },
    ],
    testPurchase: {},
  };
}

function purchasedNotification(purchaseToken: string) {
  return {
    eventTimeMillis: '1790812800000',
    packageName: 'com.podverse.app.next',
    subscriptionNotification: {
      notificationType: 4,
      purchaseToken,
      subscriptionId: 'premium',
      version: '1.0',
    },
    version: '1.0',
  };
}

describe('createGooglePlayAdapter', () => {
  it('maps a prepaid purchase to payment_settled keyed by the order id', async () => {
    const acknowledgeSubscriptionPurchase = vi.fn(
      async (_subscriptionId: string, _purchaseToken: string) => undefined
    );
    const adapter = createGooglePlayAdapter(
      adapterConfig(
        createClient({
          acknowledgeSubscriptionPurchase,
          getSubscriptionPurchase: async (token) =>
            token === 'token-1' ? prepaidPurchase('GPA.1234-5678-9012-34567') : null,
        })
      )
    );

    const result = await adapter.verifyAndParseWebhook(
      buildWebhookRequest(purchasedNotification('token-1'))
    );

    expect(result.events).toEqual([
      {
        type: 'payment_settled',
        processor: 'google_play',
        processorEventId: 'message-1:purchased',
        accountBillingCustomerRef: 'customer-ref-1',
        accountId: null,
        occurredAt: '2026-10-01T00:00:00.000Z',
        isSandbox: true,
        externalTransactionId: 'GPA.1234-5678-9012-34567',
        externalProductId: 'premium',
        externalBasePlanId: 'prepaid-monthly',
        periodStart: '2026-09-01T00:00:00.000Z',
        periodEnd: '2026-10-01T00:00:00.000Z',
        amount: null,
      },
    ]);
    expect(acknowledgeSubscriptionPurchase).toHaveBeenCalledTimes(1);
    expect(acknowledgeSubscriptionPurchase).toHaveBeenCalledWith('premium', 'token-1');
  });

  it('emits a second event for a second prepaid purchase on the same account', async () => {
    const adapter = createGooglePlayAdapter(
      adapterConfig(
        createClient({
          getSubscriptionPurchase: async (token) => {
            if (token === 'token-1') {
              return prepaidPurchase('GPA.1234-5678-9012-34567');
            }
            if (token === 'token-2') {
              return prepaidPurchase('GPA.9999-8888-7777-66666');
            }
            return null;
          },
        })
      )
    );

    const first = await adapter.verifyAndParseWebhook(
      buildWebhookRequest(purchasedNotification('token-1'), 'message-1')
    );
    const second = await adapter.verifyAndParseWebhook(
      buildWebhookRequest(purchasedNotification('token-2'), 'message-2')
    );

    expect(first.events.map((event) => event.externalTransactionId)).toEqual([
      'GPA.1234-5678-9012-34567',
    ]);
    expect(second.events.map((event) => event.externalTransactionId)).toEqual([
      'GPA.9999-8888-7777-66666',
    ]);
    expect(second.events[0]).toMatchObject({
      type: 'payment_settled',
      accountBillingCustomerRef: 'customer-ref-1',
      processorEventId: 'message-2:purchased',
    });
  });

  it('returns no events for a line item Play bills on its own', async () => {
    const renewingPlanKey = 'auto' + 'RenewingPlan';
    const adapter = createGooglePlayAdapter(
      adapterConfig(
        createClient({
          getSubscriptionPurchase: async () => ({
            lineItems: [
              {
                [renewingPlanKey]: {},
                offerDetails: { basePlanId: 'monthly' },
                productId: 'premium',
                latestSuccessfulOrderId: 'GPA.0000-0000-0000-00000',
              },
            ],
          }),
        })
      )
    );

    const result = await adapter.verifyAndParseWebhook(
      buildWebhookRequest(purchasedNotification('token-renewing'))
    );

    expect(result.events).toEqual([]);
  });

  it('maps REVOKED to refund_or_revoke keyed by the order id', async () => {
    const adapter = createGooglePlayAdapter(
      adapterConfig(
        createClient({
          getSubscriptionPurchase: async () => prepaidPurchase('GPA.1234-5678-9012-34567'),
        })
      )
    );

    const result = await adapter.verifyAndParseWebhook(
      buildWebhookRequest({
        eventTimeMillis: '1790812800000',
        packageName: 'com.podverse.app.next',
        subscriptionNotification: {
          notificationType: 12,
          purchaseToken: 'token-1',
          subscriptionId: 'premium',
          version: '1.0',
        },
        version: '1.0',
      })
    );

    expect(result.events).toEqual([
      {
        type: 'refund_or_revoke',
        processor: 'google_play',
        processorEventId: 'message-1:revoked',
        accountBillingCustomerRef: 'customer-ref-1',
        accountId: null,
        occurredAt: '2026-10-01T00:00:00.000Z',
        isSandbox: true,
        reason: 'store_revoke',
        revokedAt: '2026-10-01T00:00:00.000Z',
        externalTransactionId: 'GPA.1234-5678-9012-34567',
      },
    ]);
  });

  it('acknowledges a pending purchase once', async () => {
    const acknowledgeSubscriptionPurchase = vi.fn(
      async (_subscriptionId: string, _purchaseToken: string) => undefined
    );
    const acknowledgeProductPurchase = vi.fn(
      async (_productId: string, _purchaseToken: string) => undefined
    );

    const adapter = createGooglePlayAdapter(
      adapterConfig(
        createClient({
          acknowledgeProductPurchase,
          acknowledgeSubscriptionPurchase,
          getSubscriptionPurchase: async () => ({
            acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
            lineItems: [{ productId: 'premium', prepaidPlan: {} }],
          }),
        })
      )
    );

    await adapter.acknowledgePurchase?.({
      purchaseToken: 'token-1',
      externalProductId: 'premium',
    });

    expect(acknowledgeSubscriptionPurchase).toHaveBeenCalledTimes(1);
    expect(acknowledgeSubscriptionPurchase).toHaveBeenCalledWith('premium', 'token-1');
    expect(acknowledgeProductPurchase).toHaveBeenCalledTimes(0);
  });
});
