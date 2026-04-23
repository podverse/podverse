import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  withMutedExpectedErrorLogs,
} from './helpers/index.js';

const TEST_EMAIL = 'paypal-test@example.com';
const TEST_USER_ID = 1;

const future = () => new Date(Date.now() + 86400000 * 365);

const {
  ppOrderGetMock,
  ppOrderCreateMock,
  ppOrderCompleteMock,
  paypalGetCaptureInfoMock,
  paypalGetPaymentInfoMock,
  getAccountMock,
} = vi.hoisted(() => ({
  ppOrderGetMock: vi.fn(
    async () =>
      ({
        id: 1,
        payment_id: 'pay-ok',
        state: 'created',
      }) as Record<string, unknown> | null
  ),
  ppOrderCreateMock: vi.fn(
    async () =>
      ({
        id: 2,
        payment_id: 'pay-new',
        state: 'created',
      }) as Record<string, unknown>
  ),
  ppOrderCompleteMock: vi.fn(async () => {}),
  paypalGetCaptureInfoMock: vi.fn(
    async () => ({ status: 'completed' }) as { status: string } | null
  ),
  paypalGetPaymentInfoMock: vi.fn(
    async () => ({ status: 'approved' }) as { status: string } | null
  ),
  getAccountMock: vi.fn(async (id: number) => {
    if (id !== TEST_USER_ID) {
      return null;
    }
    return {
      id: TEST_USER_ID,
      account_credentials: { email: TEST_EMAIL },
      account_membership_status: {
        membership_expires_at: new Date(Date.now() + 86400000 * 365),
        account_membership: { id: 2 },
      },
    };
  }),
}));

vi.mock('@api/factories/paypalService.js', () => ({
  paypalService: {
    getCaptureInfo: paypalGetCaptureInfoMock,
    getPaymentInfo: paypalGetPaymentInfoMock,
  },
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    get = getAccountMock;
  }

  class MockAccountPayPalOrderService {
    get = ppOrderGetMock;
    create = ppOrderCreateMock;
    completePayPalOrder = ppOrderCompleteMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountPayPalOrderService: MockAccountPayPalOrderService,
  };
});

let paypalBase: string;

describe('account PayPal order routes', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;

  const auth = () => authHeaders(TEST_USER_ID, TEST_EMAIL);

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    paypalBase = (await getBaseApiUrl()) + '/paypal';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  beforeEach(() => {
    getAccountMock.mockReset();
    getAccountMock.mockImplementation(async (id: number) => {
      if (id !== TEST_USER_ID) {
        return null;
      }
      return {
        id: TEST_USER_ID,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: future(),
          account_membership: { id: 2 },
        },
      };
    });
    ppOrderGetMock.mockReset();
    ppOrderGetMock.mockImplementation(
      async () => ({ id: 1, payment_id: 'pay-ok', state: 'created' }) as never
    );
    ppOrderCreateMock.mockReset();
    ppOrderCreateMock.mockImplementation(
      async () => ({ id: 2, payment_id: 'pay-new', state: 'created' }) as never
    );
    ppOrderCompleteMock.mockReset();
    ppOrderCompleteMock.mockImplementation(async () => {});
    paypalGetCaptureInfoMock.mockReset();
    paypalGetCaptureInfoMock.mockResolvedValue({ status: 'completed' } as never);
    paypalGetPaymentInfoMock.mockReset();
    paypalGetPaymentInfoMock.mockResolvedValue({ status: 'approved' } as never);
  });

  describe('GET /:payment_id', () => {
    it('returns 200 with order when the service returns data', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: future() },
      });
      ppOrderGetMock.mockResolvedValueOnce({
        id: 9,
        payment_id: 'pid-1',
        state: 'created',
      } as never);
      const res = await request(app).get(`${paypalBase}/pid-1`).set(auth());
      expect(res.status).toBe(200);
      expect(res.body.payment_id).toBe('pid-1');
    });

    it('returns 404 when the order is missing', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: future() },
      });
      ppOrderGetMock.mockResolvedValueOnce(null);
      const res = await request(app).get(`${paypalBase}/missing-pid`).set(auth());
      expect(res.status).toBe(404);
    });

    it('returns 500 when the service throws', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: future() },
      });
      ppOrderGetMock.mockRejectedValueOnce(new Error('database'));
      const res = await withMutedExpectedErrorLogs(async () =>
        request(app).get(`${paypalBase}/x`).set(auth())
      );
      expect(res.status).toBe(500);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${paypalBase}/pid`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /create', () => {
    it('returns 201 with created order when the service succeeds', async () => {
      getAccountMock.mockResolvedValue({
        id: TEST_USER_ID,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: future() },
        account_membership: { id: 2 },
      } as never);
      ppOrderCreateMock.mockResolvedValue({
        id: 3,
        payment_id: 'PAYX',
        state: 'created',
      } as never);
      const res = await request(app)
        .post(`${paypalBase}/create`)
        .set(auth())
        .send({ payment_id: 'PAYX', state: 'created' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ payment_id: 'PAYX', state: 'created' });
    });

    it('returns 400 for invalid body (missing required field)', async () => {
      const res = await request(app)
        .post(`${paypalBase}/create`)
        .set(auth())
        .send({ payment_id: 'only' });
      expect(res.status).toBe(400);
    });

    it('returns 500 when create throws', async () => {
      getAccountMock.mockResolvedValue({
        id: TEST_USER_ID,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: future() },
        account_membership: { id: 2 },
      } as never);
      ppOrderCreateMock.mockRejectedValueOnce(new Error('Order exists'));
      const res = await withMutedExpectedErrorLogs(async () =>
        request(app)
          .post(`${paypalBase}/create`)
          .set(auth())
          .send({ payment_id: 'P', state: 'created' })
      );
      expect(res.status).toBe(500);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${paypalBase}/create`)
        .send({ payment_id: 'A', state: 'created' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /webhooks/payment-completed', () => {
    it('returns 200 for v2.0 (capture) with valid capture state', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: future() },
      });
      const body = {
        resource_version: '2.0',
        resource: { id: 'CAP-1' },
      };
      const res = await request(app)
        .post(`${paypalBase}/webhooks/payment-completed`)
        .set(auth())
        .send(body);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Payment completed successfully');
      expect(paypalGetCaptureInfoMock).toHaveBeenCalledWith('CAP-1');
      expect(ppOrderCompleteMock).toHaveBeenCalled();
    });

    it('returns 200 for v1.0 (payment) with valid order status', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: future() },
      });
      const res = await request(app)
        .post(`${paypalBase}/webhooks/payment-completed`)
        .set(auth())
        .send({
          event_version: '1.0',
          resource_version: '1.0',
          resource: { parent_payment: 'PAY-OLD' },
        });
      expect(res.status).toBe(200);
      expect(paypalGetPaymentInfoMock).toHaveBeenCalledWith('PAY-OLD');
    });

    it('returns 500 when capture status is missing', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: future() },
      });
      paypalGetCaptureInfoMock.mockResolvedValueOnce(null);
      const res = await withMutedExpectedErrorLogs(async () =>
        request(app)
          .post(`${paypalBase}/webhooks/payment-completed`)
          .set(auth())
          .send({ resource_version: '2.0', resource: { id: 'C1' } })
      );
      expect(res.status).toBe(500);
    });

    it('returns 400 for invalid body (fails Joi validation)', async () => {
      const res = await request(app)
        .post(`${paypalBase}/webhooks/payment-completed`)
        .set(auth())
        .send({ resource_version: '2.0' });
      expect(res.status).toBe(400);
    });

    it('returns 200 twice when completePayPalOrder is mocked idempotently (duplicate notification)', async () => {
      getAccountMock.mockResolvedValue({
        id: TEST_USER_ID,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: future() },
      } as never);
      const body = { resource_version: '2.0', resource: { id: 'CAP-dup' } };
      const r1 = await request(app)
        .post(`${paypalBase}/webhooks/payment-completed`)
        .set(auth())
        .send(body);
      const r2 = await request(app)
        .post(`${paypalBase}/webhooks/payment-completed`)
        .set(auth())
        .send(body);
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      expect(ppOrderCompleteMock).toHaveBeenCalledTimes(2);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${paypalBase}/webhooks/payment-completed`)
        .send({ resource_version: '2.0', resource: { id: '1' } });
      expect(res.status).toBe(401);
    });
  });
});
