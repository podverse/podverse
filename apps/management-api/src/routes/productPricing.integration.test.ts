import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const canonicalBasePath = `${config.api.prefix}${config.api.version}/products/pricing`;

const superuser = {
  id: 1,
  id_text: 'pvMgtSu001',
  admin_account_role_id: 1,
  admin_account_role: { role: 'superuser' },
  admin_account_credentials: { email: 'super@example.com' },
  permissions: {
    feedsCrud: 15,
    feedTakedownReasonsCrud: 15,
    adminsCrud: 15,
    statsCrud: 15,
    billingPricesCrud: 15,
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
};

const adminWithoutPricingCrud = {
  id: 2,
  id_text: 'pvMgtAd002',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'reader@example.com' },
  permissions: {
    feedsCrud: 0,
    feedTakedownReasonsCrud: 0,
    adminsCrud: 2,
    statsCrud: 0,
    billingPricesCrud: 0,
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
};

const {
  getWithRoleAndPermissionsMock,
  appDbReadQueryMock,
  appDbReadWriteQueryMock,
  appDbReadWriteTransactionMock,
  auditRecordMock,
} = vi.hoisted(() => ({
  getWithRoleAndPermissionsMock: vi.fn(async (id: number) => {
    if (id === 1) {
      return superuser;
    }
    if (id === 2) {
      return adminWithoutPricingCrud;
    }
    return null;
  }),
  appDbReadQueryMock: vi.fn(),
  appDbReadWriteQueryMock: vi.fn(),
  appDbReadWriteTransactionMock: vi.fn(),
  auditRecordMock: vi.fn(async () => undefined),
}));

vi.mock('@management-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async getWithRoleAndPermissions(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
  }
  return { AdminAccountService };
});

vi.mock('@management-api/orm/db/appDb.js', () => ({
  AppDbDataSourceRead: {
    query: appDbReadQueryMock,
  },
  AppDbDataSourceReadWrite: {
    query: appDbReadWriteQueryMock,
    transaction: appDbReadWriteTransactionMock,
  },
}));

vi.mock('@management-api/lib/database/auditLog.js', () => {
  class AuditLogService {
    async record(entry: unknown) {
      return auditRecordMock(entry);
    }
  }
  return { AuditLogService };
});

const superuserAuthHeaders = (): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: 1, id_text: 'pvMgtSu001' }, JWT_SECRET, { expiresIn: '1h' })}`,
});

const adminAuthHeaders = (): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: 2, id_text: 'pvMgtAd002' }, JWT_SECRET, { expiresIn: '1h' })}`,
});

describe('Product pricing routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get(`${canonicalBasePath}/active`).expect(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('returns 403 when admin lacks billing_prices read permission', async () => {
    const res = await request(app)
      .get(`${canonicalBasePath}/active`)
      .set(adminAuthHeaders())
      .expect(403);
    expect(res.body.message).toBe('Insufficient permissions');
  });

  it('returns active pricing rows for superuser', async () => {
    appDbReadQueryMock.mockResolvedValueOnce([
      {
        id: 11,
        product_code: 'membership_premium',
        currency_code: 'USD',
        billing_cadence: 'monthly',
        amount_cents: 300,
        effective_from: '2026-01-01T00:00:00.000Z',
        effective_to: null,
        source: 'seed',
      },
    ]);

    const res = await request(app)
      .get(`${canonicalBasePath}/active`)
      .set(superuserAuthHeaders())
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      product_code: 'membership_premium',
      billing_cadence: 'monthly',
      amount_cents: 300,
    });
  });

  it('schedules a price row and records audit entry', async () => {
    const txQueryMock = vi
      .fn()
      .mockResolvedValueOnce([{ id: 1, product_code: 'membership_premium' }])
      .mockResolvedValueOnce([
        { id: 44, amount_cents: 300, effective_from: new Date(), effective_to: null },
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: 55 }])
      .mockResolvedValueOnce(undefined);

    appDbReadWriteTransactionMock.mockImplementationOnce(
      async (handler: (tx: { query: typeof txQueryMock }) => unknown) =>
        handler({ query: txQueryMock })
    );

    const res = await request(app)
      .post(`${canonicalBasePath}/schedule`)
      .set(superuserAuthHeaders())
      .send({
        cadence: 'monthly',
        amountCents: 350,
        currencyCode: 'USD',
        changeReason: 'increase',
      })
      .expect(201);

    expect(res.body.data.id).toBe(55);
    expect(auditRecordMock).toHaveBeenCalledTimes(1);
  });
});
