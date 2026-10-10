import type { CapturedPayment } from '@paypal/paypal-server-sdk';
import { describe, expect, it } from 'vitest';

import { BillingWebhookVerificationError, PAYPAL_ONE_TIME_PRODUCT_IDS } from '@podverse/helpers';

import { createPayPalAdapter } from './payPalAdapter.js';
import { PayPalService } from './payPalService.js';

const WEBHOOK_HEADERS = {
  'paypal-auth-algo': 'SHA256withRSA',
  'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs/example',
  'paypal-transmission-id': 'abc123',
  'paypal-transmission-sig': 'signature',
  'paypal-transmission-time': '2026-02-01T00:00:00Z',
};

function createMockService(params: {
  isValidSignature: boolean;
  capture?: CapturedPayment | null;
}): PayPalService {
  return new PayPalService({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    webhookId: 'WH-1234567890ABCDE',
    fetchImpl: async (url) => {
      const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (href.endsWith('/v1/oauth2/token')) {
        return new Response(JSON.stringify({ access_token: 'test-access-token' }), {
          status: 200,
        });
      }
      return new Response(
        JSON.stringify({
          verification_status: params.isValidSignature ? 'SUCCESS' : 'FAILURE',
        }),
        { status: 200 }
      );
    },
    ordersController: {
      createOrder: async () => ({ result: { id: 'ORDER-1' } }),
      captureOrder: async () => ({ result: { id: 'ORDER-1' } }),
    },
    paymentsController: {
      getAuthorizedPayment: async () => ({ result: null }),
      getCapturedPayment: async () => ({ result: params.capture ?? null }),
    },
  });
}

function createAdapter(service: PayPalService) {
  return createPayPalAdapter({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    paypalEnvironment: 'sandbox',
    webhookId: 'WH-1234567890ABCDE',
    service,
  });
}

describe('createPayPalAdapter', () => {
  it('rejects a webhook whose signature does not verify', async () => {
    const adapter = createAdapter(createMockService({ isValidSignature: false }));

    await expect(
      adapter.verifyAndParseWebhook({
        rawBody: JSON.stringify({ id: 'WH-EVENT-1', event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
        headers: WEBHOOK_HEADERS,
      })
    ).rejects.toBeInstanceOf(BillingWebhookVerificationError);
  });

  it('maps capture webhooks to normalized payment_settled events', async () => {
    const adapter = createAdapter(createMockService({ isValidSignature: true }));

    const result = await adapter.verifyAndParseWebhook({
      rawBody: JSON.stringify({
        id: 'WH-EVENT-2',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        event_time: '2026-02-01T00:00:00Z',
        resource: {
          id: 'CAPTURE-1',
          custom_id: 'customer-ref-1',
          invoice_id: PAYPAL_ONE_TIME_PRODUCT_IDS.monthly,
          create_time: '2026-02-01T00:00:00Z',
          amount: {
            value: '4.99',
            currency_code: 'USD',
          },
        },
      }),
      headers: WEBHOOK_HEADERS,
    });

    expect(result.events).toEqual([
      {
        type: 'payment_settled',
        processor: 'paypal',
        processorEventId: 'WH-EVENT-2',
        accountBillingCustomerRef: 'customer-ref-1',
        accountId: null,
        occurredAt: '2026-02-01T00:00:00Z',
        isSandbox: true,
        externalTransactionId: 'CAPTURE-1',
        externalProductId: PAYPAL_ONE_TIME_PRODUCT_IDS.monthly,
        externalBasePlanId: null,
        periodStart: null,
        periodEnd: null,
        amount: {
          value: '4.99',
          currencyCode: 'USD',
        },
      },
    ]);
  });

  it('maps a refunded capture to refund_or_revoke', async () => {
    const adapter = createAdapter(createMockService({ isValidSignature: true }));

    const result = await adapter.verifyAndParseWebhook({
      rawBody: JSON.stringify({
        id: 'WH-EVENT-REFUND',
        event_type: 'PAYMENT.CAPTURE.REFUNDED',
        resource: {
          id: 'CAPTURE-1',
          custom_id: 'customer-ref-1',
          invoice_id: PAYPAL_ONE_TIME_PRODUCT_IDS.monthly,
          create_time: '2026-02-02T00:00:00Z',
        },
      }),
      headers: WEBHOOK_HEADERS,
    });

    expect(result.events).toEqual([
      {
        type: 'refund_or_revoke',
        processor: 'paypal',
        processorEventId: 'WH-EVENT-REFUND',
        accountBillingCustomerRef: 'customer-ref-1',
        accountId: null,
        occurredAt: '2026-02-02T00:00:00Z',
        isSandbox: true,
        reason: 'refund',
        revokedAt: '2026-02-02T00:00:00Z',
        externalTransactionId: 'CAPTURE-1',
      },
    ]);
  });

  it('maps a reversed capture to refund_or_revoke', async () => {
    const adapter = createAdapter(createMockService({ isValidSignature: true }));

    const result = await adapter.verifyAndParseWebhook({
      rawBody: JSON.stringify({
        id: 'WH-EVENT-REVERSED',
        event_type: 'PAYMENT.CAPTURE.REVERSED',
        resource: {
          id: 'CAPTURE-2',
          invoice_id: PAYPAL_ONE_TIME_PRODUCT_IDS.annual,
          create_time: '2026-02-03T00:00:00Z',
        },
      }),
      headers: WEBHOOK_HEADERS,
    });

    expect(result.events[0]).toMatchObject({
      type: 'refund_or_revoke',
      reason: 'chargeback',
      externalTransactionId: 'CAPTURE-2',
    });
  });

  it('returns no events for a capture whose product id is not mapped', async () => {
    const adapter = createAdapter(createMockService({ isValidSignature: true }));

    const result = await adapter.verifyAndParseWebhook({
      rawBody: JSON.stringify({
        id: 'WH-EVENT-UNKNOWN',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAPTURE-3',
          invoice_id: 'not-a-podverse-product',
        },
      }),
      headers: WEBHOOK_HEADERS,
    });

    expect(result.events).toEqual([]);
  });

  it('returns no events for an event type other than a capture', async () => {
    const adapter = createAdapter(createMockService({ isValidSignature: true }));

    const result = await adapter.verifyAndParseWebhook({
      rawBody: JSON.stringify({
        id: 'WH-EVENT-OTHER',
        event_type: 'CHECKOUT.ORDER.APPROVED',
        resource: { id: 'ORDER-9' },
      }),
      headers: WEBHOOK_HEADERS,
    });

    expect(result.events).toEqual([]);
  });

  it('reads a captured payment from the SDK record', async () => {
    const adapter = createAdapter(
      createMockService({
        isValidSignature: true,
        capture: {
          id: 'CAPTURE-9',
          customId: 'customer-ref-9',
          invoiceId: PAYPAL_ONE_TIME_PRODUCT_IDS.annual,
          amount: { currencyCode: 'USD', value: '30.00' },
          createTime: '2026-04-01T00:00:00Z',
        },
      })
    );

    const snapshot = await adapter.fetchTransaction({
      externalId: 'CAPTURE-9',
      externalProductId: null,
    });

    expect(snapshot).toMatchObject({
      externalTransactionId: 'CAPTURE-9',
      accountBillingCustomerRef: 'customer-ref-9',
      externalProductId: PAYPAL_ONE_TIME_PRODUCT_IDS.annual,
      settledAt: '2026-04-01T00:00:00Z',
      amount: { value: '30.00', currencyCode: 'USD' },
      revokedAt: null,
      isSandbox: true,
    });
  });
});
