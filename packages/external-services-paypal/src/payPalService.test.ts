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
