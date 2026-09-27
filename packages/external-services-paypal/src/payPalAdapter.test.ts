import { describe, expect, it } from 'vitest';

import { PAYPAL_ONE_TIME_PRODUCT_IDS, BillingWebhookVerificationError } from '@podverse/helpers';
import type { CapturedPayment, Subscription } from '@paypal/paypal-server-sdk';

import { createPayPalAdapter } from './payPalAdapter.js';
import { PayPalService } from './payPalService.js';

function createMockService(params: {
  isValidSignature: boolean;
  subscription?: Subscription | null;
  capture?: CapturedPayment | null;
}): PayPalService {
  return new PayPalService({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    webhookId: 'WH-1234567890ABCDE',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          verification_status: params.isValidSignature ? 'SUCCESS' : 'FAILURE',
        }),
        { status: 200 }
      ),
    ordersController: {
      createOrder: async () => ({ result: { id: 'ORDER-1' } }),
      captureOrder: async () => ({ result: { id: 'ORDER-1' } }),
    },
    paymentsController: {
      getAuthorizedPayment: async () => ({ result: null }),
      getCapturedPayment: async () => ({ result: params.capture ?? null }),
    },
    subscriptionsController: {
      createSubscription: async () => ({ result: null }),
      getSubscription: async () => ({ result: params.subscription ?? null }),
      cancelSubscription: async () => undefined,
    },
  });
}

describe('createPayPalAdapter', () => {
  it('rejects a webhook whose signature does not verify', async () => {
    const adapter = createPayPalAdapter({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      paypalEnvironment: 'sandbox',
      webhookId: 'WH-1234567890ABCDE',
      service: createMockService({ isValidSignature: false }),
    });

    await expect(
      adapter.verifyAndParseWebhook({
        rawBody: JSON.stringify({ id: 'WH-EVENT-1', event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
        headers: {
          'paypal-auth-algo': 'SHA256withRSA',
          'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs/example',
          'paypal-transmission-id': 'abc123',
          'paypal-transmission-sig': 'signature',
          'paypal-transmission-time': '2026-01-01T00:00:00Z',
        },
      })
    ).rejects.toBeInstanceOf(BillingWebhookVerificationError);
  });

  it('maps capture webhooks to normalized payment_settled events', async () => {
    const adapter = createPayPalAdapter({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      paypalEnvironment: 'sandbox',
      webhookId: 'WH-1234567890ABCDE',
      service: createMockService({ isValidSignature: true }),
    });

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
      headers: {
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs/example',
        'paypal-transmission-id': 'abc123',
        'paypal-transmission-sig': 'signature',
        'paypal-transmission-time': '2026-02-01T00:00:00Z',
      },
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
        purchaseKind: 'one_time',
        externalTransactionId: 'CAPTURE-1',
        externalSubscriptionId: null,
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

  it('maps a subscription sale to payment_settled using the subscription record', async () => {
    const adapter = createPayPalAdapter({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      paypalEnvironment: 'sandbox',
      webhookId: 'WH-1234567890ABCDE',
      service: createMockService({
        isValidSignature: true,
        subscription: {
          customId: 'customer-ref-2',
          planId: 'P-MONTHLY',
        },
      }),
    });

    const result = await adapter.verifyAndParseWebhook({
      rawBody: JSON.stringify({
        id: 'WH-EVENT-3',
        event_type: 'PAYMENT.SALE.COMPLETED',
        event_time: '2026-03-01T00:00:00Z',
        resource: {
          id: 'SALE-1',
          billing_agreement_id: 'I-SUBSCRIPTION',
          create_time: '2026-03-01T00:00:00Z',
          amount: {
            total: '3.00',
            currency: 'USD',
          },
        },
      }),
      headers: {
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs/example',
        'paypal-transmission-id': 'abc123',
        'paypal-transmission-sig': 'signature',
        'paypal-transmission-time': '2026-03-01T00:00:00Z',
      },
    });

    expect(result.events).toEqual([
      {
        type: 'payment_settled',
        processor: 'paypal',
        processorEventId: 'WH-EVENT-3',
        accountBillingCustomerRef: 'customer-ref-2',
        accountId: null,
        occurredAt: '2026-03-01T00:00:00Z',
        isSandbox: true,
        purchaseKind: 'auto_renew',
        externalTransactionId: 'SALE-1',
        externalSubscriptionId: 'I-SUBSCRIPTION',
        externalProductId: 'P-MONTHLY',
        externalBasePlanId: null,
        periodStart: null,
        periodEnd: null,
        amount: {
          value: '3.00',
          currencyCode: 'USD',
        },
      },
    ]);
  });
});
