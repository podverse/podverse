import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const statsBase = `${config.api.prefix}${config.api.version}/stats`;

const superuserWithAllPerms = {
  id: 1,
  id_text: 'pvMgtSu001',
  admin_account_role_id: 1,
  admin_account_role: { role: 'superuser' },
  admin_account_credentials: { email: 'super@example.com' },
  permissions: {
    id: 1,
    admin_account_id: 1,
    feedsCrud: 15,
    feedTakedownReasonsCrud: 15,
    adminsCrud: 15,
    statsCrud: 15,
    billingPricesCrud: 15,
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const adminWithStatsRead = {
  id: 2,
  id_text: 'pvMgtAd002',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'reader@example.com' },
  permissions: {
    id: 2,
    admin_account_id: 2,
    feedsCrud: 0,
    feedTakedownReasonsCrud: 0,
    adminsCrud: 0,
    statsCrud: 2,
    billingPricesCrud: 0,
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const adminWithNoPerms = {
  id: 3,
  id_text: 'pvMgtAd003',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'noperms@example.com' },
  permissions: {
    id: 3,
    admin_account_id: 3,
    feedsCrud: 0,
    feedTakedownReasonsCrud: 0,
    adminsCrud: 0,
    statsCrud: 0,
    billingPricesCrud: 0,
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const { getWithRoleAndPermissionsMock, queryMock, readWriteQueryMock, readWriteTransactionMock } =
  vi.hoisted(() => ({
    getWithRoleAndPermissionsMock: vi.fn(async (id: number) => {
      if (id === 1) return superuserWithAllPerms;
      if (id === 2) return adminWithStatsRead;
      if (id === 3) return adminWithNoPerms;
      return null;
    }),
    queryMock: vi.fn(async () => []),
    readWriteQueryMock: vi.fn(async () => []),
    readWriteTransactionMock: vi.fn(
      async (fn: (manager: { query: typeof queryMock }) => Promise<unknown>) =>
        fn({ query: readWriteQueryMock })
    ),
  }));

vi.mock('@management-api/orm/services/adminAccount.js', () => ({
  AdminAccountService: vi.fn(() => ({
    getWithRoleAndPermissions: getWithRoleAndPermissionsMock,
  })),
}));

vi.mock('@management-api/orm/db/appDb.js', () => ({
  AppDbDataSourceRead: {
    query: queryMock,
  },
  AppDbDataSourceReadWrite: {
    query: readWriteQueryMock,
    transaction: readWriteTransactionMock,
  },
}));

// Avoid loading management ORM DataSource and entities (see database routes mock pattern).
vi.mock('@management-api/lib/database/auditLog.js', () => {
  class AuditLogService {
    async record() {
      return;
    }
  }
  return { AuditLogService };
});

const adminIdTextByUserId: Record<number, string> = {
  1: 'pvMgtSu001',
  2: 'pvMgtAd002',
  3: 'pvMgtAd003',
};

function authHeaders(userId: number) {
  const token = jwt.sign(
    { id: userId, id_text: adminIdTextByUserId[userId] ?? 'pvMgtSu001' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { Authorization: `Bearer ${token}` };
}

describe('Stats Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /stats/:entityType/top', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${statsBase}/channel/top`);
      expect(res.status).toBe(401);
    });

    it('returns 403 for admin without stats permission', async () => {
      const res = await request(app).get(`${statsBase}/channel/top`).set(authHeaders(3));
      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid entity type', async () => {
      const res = await request(app).get(`${statsBase}/invalid/top`).set(authHeaders(1));
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid entity type');
    });

    it('returns data for superuser', async () => {
      queryMock.mockResolvedValueOnce([{ total: 0 }]);
      queryMock.mockResolvedValueOnce([]);

      const res = await request(app)
        .get(`${statsBase}/channel/top?range=all-time&limit=10`)
        .set(authHeaders(1));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ rows: [], total: 0 });
    });

    it('returns data for admin with stats read', async () => {
      queryMock.mockResolvedValueOnce([{ total: 0 }]);
      queryMock.mockResolvedValueOnce([]);

      const res = await request(app).get(`${statsBase}/channel/top`).set(authHeaders(2));
      expect(res.status).toBe(200);
    });
  });

  describe('GET /stats/:entityType/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${statsBase}/channel/1`);
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid entity type', async () => {
      const res = await request(app).get(`${statsBase}/invalid/1`).set(authHeaders(1));
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid id', async () => {
      const res = await request(app).get(`${statsBase}/channel/notanumber`).set(authHeaders(1));
      expect(res.status).toBe(400);
    });

    it('returns 404 when stats record not found', async () => {
      queryMock.mockResolvedValueOnce([]);

      const res = await request(app).get(`${statsBase}/channel/999`).set(authHeaders(1));
      expect(res.status).toBe(404);
    });

    it('returns detail for existing record', async () => {
      queryMock.mockResolvedValueOnce([
        {
          id: 1,
          channel_id: 42,
          title: 'Test Podcast',
          day_current_count: 10,
          day_1_count: 5,
          day_2_count: 3,
          day_3_count: 0,
          day_4_count: 0,
          day_5_count: 0,
          day_6_count: 0,
          day_7_count: 0,
          day_8_count: 0,
          week_current_count: 25,
          week_1_count: 20,
          week_2_count: 0,
          week_3_count: 0,
          week_4_count: 0,
          month_current_count: 50,
          month_1_count: 30,
          all_time_count: 100,
        },
      ]);

      const res = await request(app).get(`${statsBase}/channel/1`).set(authHeaders(1));
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Test Podcast');
      expect(res.body.all_time_count).toBe(100);
    });
  });

  describe('GET /stats/:entityType/search', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${statsBase}/channel/search?q=test`);
      expect(res.status).toBe(401);
    });

    it('returns 400 without query param', async () => {
      const res = await request(app).get(`${statsBase}/channel/search`).set(authHeaders(1));
      expect(res.status).toBe(400);
    });

    it('returns search results', async () => {
      queryMock.mockResolvedValueOnce([
        {
          id: 1,
          channel_id: 42,
          title: 'Test Podcast',
          day_current_count: 10,
          day_1_count: 5,
          day_2_count: 3,
          day_3_count: 0,
          day_4_count: 0,
          day_5_count: 0,
          day_6_count: 0,
          day_7_count: 0,
          day_8_count: 0,
          week_current_count: 25,
          week_1_count: 20,
          week_2_count: 0,
          week_3_count: 0,
          week_4_count: 0,
          month_current_count: 50,
          month_1_count: 30,
          all_time_count: 100,
          range_count: 100,
        },
      ]);
      queryMock.mockResolvedValueOnce([{ total: 1 }]);

      const res = await request(app).get(`${statsBase}/channel/search?q=Test`).set(authHeaders(1));
      expect(res.status).toBe(200);
      expect(res.body.rows).toHaveLength(1);
      expect(res.body.total).toBe(1);
    });
  });
});
