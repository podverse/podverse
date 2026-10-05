import type { Order } from '@paypal/paypal-server-sdk';
import { describe, expect, it, vi } from 'vitest';

import { PAYPAL_ONE_TIME_PRODUCT_IDS } from '@podverse/helpers';

import { PayPalService } from './payPalService.js';

describe('PayPalService', () => {
  it('creates and captures one-time orders with the cadence SKU', async () => {
    const createOrder =
      vi.fn<
        (params: {
          body: unknown;
          paypalRequestId?: string;
          prefer?: string;
        }) => Promise<{ result: Order }>
      >();
    createOrder.mockResolvedValue({ result: { id: 'ORDER-1' } });
    const captureOrder =
      vi.fn<
        (params: {
          id: string;
          paypalRequestId?: string;
          prefer?: string;
        }) => Promise<{ result: Order }>
      >();
    captureOrder.mockResolvedValue({ result: { id: 'ORDER-1' } });

    const service = new PayPalService({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      ordersController: {
        createOrder,
        captureOrder,
      },
      paymentsController: {
        getAuthorizedPayment: vi.fn().mockResolvedValue({}),
        getCapturedPayment: vi.fn().mockResolvedValue({}),
      },
      subscriptionsController: {
        createSubscription: vi.fn().mockResolvedValue({}),
        getSubscription: vi.fn().mockResolvedValue({}),
        cancelSubscription: vi.fn().mockResolvedValue(undefined),
      },
    });

    await service.createOrder({
      accountBillingCustomerRef: 'customer-ref-1',
      cadence: 'monthly',
      amount: '4.99',
      currencyCode: 'USD',
      paypalRequestId: 'request-1',
    });
    await service.captureOrder({ orderId: 'ORDER-1', paypalRequestId: 'request-2' });

    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        paypalRequestId: 'request-1',
        prefer: 'return=representation',
      })
    );
    expect(createOrder.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        body: expect.objectContaining({
          purchaseUnits: [
            expect.objectContaining({
              customId: 'customer-ref-1',
              invoiceId: PAYPAL_ONE_TIME_PRODUCT_IDS.monthly,
              items: [
                expect.objectContaining({
                  sku: PAYPAL_ONE_TIME_PRODUCT_IDS.monthly,
                }),
              ],
            }),
          ],
        }),
      })
    );

    expect(captureOrder).toHaveBeenCalledTimes(1);
    expect(captureOrder).toHaveBeenCalledWith({
      id: 'ORDER-1',
      paypalRequestId: 'request-2',
      prefer: 'return=representation',
    });
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function serviceWithFetch(
  fetchImpl: typeof fetch,
  paypalEnvironment: 'live' | 'sandbox' = 'sandbox'
): PayPalService {
  return new PayPalService({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    paypalEnvironment,
    fetchImpl,
    ordersController: {
      createOrder: vi.fn(),
      captureOrder: vi.fn(),
    },
    paymentsController: {
      getAuthorizedPayment: vi.fn(),
      getCapturedPayment: vi.fn(),
    },
    subscriptionsController: {
      createSubscription: vi.fn(),
      getSubscription: vi.fn(),
      cancelSubscription: vi.fn(),
    },
  });
}

describe('PayPalService.ensureDailyRenewalPlan', () => {
  it('creates a sandbox plan that bills every day', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl
      .mockResolvedValueOnce(jsonResponse({ access_token: 'token' }))
      .mockResolvedValueOnce(jsonResponse({ products: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: 'PROD-1' }))
      .mockResolvedValueOnce(jsonResponse({ plans: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: 'P-DAILY' }));

    const plan = await serviceWithFetch(fetchImpl).ensureDailyRenewalPlan();
    expect(plan).toEqual({ planId: 'P-DAILY' });

    const createPlan = fetchImpl.mock.calls.find((call) => {
      const [url, init] = call;
      return (
        typeof url === 'string' && url.endsWith('/v1/billing/plans') && init?.method === 'POST'
      );
    });
    expect(createPlan).toBeDefined();
    const init = createPlan?.[1];
    const body: unknown = JSON.parse(typeof init?.body === 'string' ? init.body : '{}');
    expect(body).toMatchObject({
      billing_cycles: [
        {
          frequency: { interval_unit: 'DAY', interval_count: 1 },
        },
      ],
    });
  });

  it('reuses a daily plan that already exists', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl
      .mockResolvedValueOnce(jsonResponse({ access_token: 'token' }))
      .mockResolvedValueOnce(
        jsonResponse({ products: [{ id: 'PROD-1', name: 'Podverse Premium' }] })
      )
      .mockResolvedValueOnce(
        jsonResponse({ plans: [{ id: 'P-EXISTING', name: 'Podverse Premium E2E Daily' }] })
      );

    const plan = await serviceWithFetch(fetchImpl).ensureDailyRenewalPlan();
    expect(plan).toEqual({ planId: 'P-EXISTING' });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('refuses to create a daily plan against the live PayPal API', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(serviceWithFetch(fetchImpl, 'live').ensureDailyRenewalPlan()).rejects.toThrow(
      /sandbox/
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
