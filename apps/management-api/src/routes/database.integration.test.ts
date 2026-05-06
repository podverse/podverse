import { app } from '@mgmt-api/app.js';
import { config } from '@mgmt-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const dbBase = `${config.api.prefix}${config.api.version}/database`;

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

const adminWithFeedsRead = {
  id: 2,
  id_text: 'pvMgtAd002',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'reader@example.com' },
  permissions: {
    id: 2,
    admin_account_id: 2,
    feedsCrud: 2,
    feedTakedownReasonsCrud: 2,
    adminsCrud: 0,
    statsCrud: 0,
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

const { getWithRoleAndPermissionsMock } = vi.hoisted(() => ({
  getWithRoleAndPermissionsMock: vi.fn(async (id: number) => {
    if (id === 1) return superuserWithAllPerms;
    if (id === 2) return adminWithFeedsRead;
    if (id === 3) return adminWithNoPerms;
    return null;
  }),
}));

const { queryTableMock, getRowMock, createRowMock, updateRowMock, deleteRowMock } = vi.hoisted(
  () => ({
    queryTableMock: vi.fn(async () => ({ rows: [{ id: 1, status: 'active' }], total: 1 })),
    getRowMock: vi.fn(async () => ({ id: 1, status: 'active' })),
    createRowMock: vi.fn(async () => ({ id: 1, reason: 'spam' })),
    updateRowMock: vi.fn(async () => ({ id: 1, status: 'active' })),
    deleteRowMock: vi.fn(async () => true),
  })
);

const { auditRecordMock } = vi.hoisted(() => ({
  auditRecordMock: vi.fn(async () => {}),
}));

vi.mock('@mgmt-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async get(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
    async getWithRoleAndPermissions(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
  }
  return { AdminAccountService };
});

vi.mock('@mgmt-api/lib/database/queryEngine.js', () => {
  class DatabaseQueryEngine {
    async queryTable() {
      return queryTableMock();
    }
    async getRow() {
      return getRowMock();
    }
    async createRow() {
      return createRowMock();
    }
    async updateRow() {
      return updateRowMock();
    }
    async deleteRow() {
      return deleteRowMock();
    }
  }
  return {
    DatabaseQueryEngine,
    DatabaseQueryError: class extends Error {
      constructor(m: string) {
        super(m);
        this.name = 'DatabaseQueryError';
      }
    },
  };
});

vi.mock('@mgmt-api/lib/database/auditLog.js', () => {
  class AuditLogService {
    async record(...args: unknown[]) {
      return auditRecordMock(...args);
    }
  }
  return { AuditLogService };
});

const adminIdTextByUserId: Record<number, string> = {
  1: 'pvMgtSu001',
  2: 'pvMgtAd002',
  3: 'pvMgtAd003',
};

const adminAuthHeaders = (userId: number = 1): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign(
    { id: userId, id_text: adminIdTextByUserId[userId] ?? 'pvMgtSu001' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )}`,
});

describe('management-api database routes', () => {
  beforeEach(() => {
    getWithRoleAndPermissionsMock.mockClear();
    queryTableMock.mockClear();
    getRowMock.mockClear();
    createRowMock.mockClear();
    updateRowMock.mockClear();
    deleteRowMock.mockClear();
    auditRecordMock.mockClear();
  });

  describe('GET /database/tables', () => {
    it('returns all allowlisted tables', async () => {
      const res = await request(app).get(`${dbBase}/tables`).set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
      expect(res.body.tables).toHaveLength(11);
      const names = res.body.tables.map((t: { tableName: string }) => t.tableName);
      expect(names).toContain('feed');
      expect(names).toContain('feed_takedown_reason');
      expect(names).toContain('stats_aggregated_channel');
      expect(names).toContain('stats_aggregated_item');
      expect(names).toContain('stats_aggregated_clip');
      expect(names).toContain('stats_aggregated_playlist');
      expect(names).toContain('stats_aggregated_account');
    });

    it('includes readOnly flag in table metadata', async () => {
      const res = await request(app).get(`${dbBase}/tables`).set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
      const feedTable = res.body.tables.find((t: { tableName: string }) => t.tableName === 'feed');
      expect(feedTable.readOnly).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${dbBase}/tables`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /database/:table/meta', () => {
    it('returns metadata for allowlisted table', async () => {
      const res = await request(app)
        .get(`${dbBase}/feed_takedown_reason/meta`)
        .set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
      expect(res.body.tableName).toBe('feed_takedown_reason');
      expect(res.body.fields).toBeInstanceOf(Array);
    });

    it('returns 404 for non-allowlisted table', async () => {
      const res = await request(app).get(`${dbBase}/account/meta`).set(adminAuthHeaders(1));

      expect(res.status).toBe(404);
    });
  });

  describe('POST /database/:table/query', () => {
    it('returns 200 for superuser querying feed_takedown_reason', async () => {
      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason/query`)
        .set(adminAuthHeaders(1))
        .send({ page: 1, pageSize: 25 });

      expect(res.status).toBe(200);
      expect(res.body.rows).toBeDefined();
      expect(res.body.total).toBeDefined();
    });

    it('returns 200 for admin with read permission', async () => {
      const res = await request(app).post(`${dbBase}/feed/query`).set(adminAuthHeaders(2)).send({});

      expect(res.status).toBe(200);
    });

    it('returns 403 for admin without read permission', async () => {
      const res = await request(app).post(`${dbBase}/feed/query`).set(adminAuthHeaders(3)).send({});

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-allowlisted table', async () => {
      const res = await request(app)
        .post(`${dbBase}/account/query`)
        .set(adminAuthHeaders(1))
        .send({});

      expect(res.status).toBe(404);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).post(`${dbBase}/feed/query`).send({});

      expect(res.status).toBe(401);
    });
  });

  describe('GET /database/:table/:id', () => {
    it('returns row for superuser', async () => {
      const res = await request(app)
        .get(`${dbBase}/feed_takedown_reason/1`)
        .set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
    });

    it('returns 403 for admin without read permission', async () => {
      const res = await request(app).get(`${dbBase}/feed/1`).set(adminAuthHeaders(3));

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-allowlisted table', async () => {
      const res = await request(app).get(`${dbBase}/account/1`).set(adminAuthHeaders(1));

      expect(res.status).toBe(404);
    });
  });

  describe('POST /database/:table (create)', () => {
    it('returns 201 for superuser creating in feed_takedown_reason', async () => {
      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason`)
        .set(adminAuthHeaders(1))
        .send({ reason: 'test_reason' });

      expect(res.status).toBe(201);
      expect(auditRecordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          adminAccountId: 1,
          operation: 'create',
          tableName: 'feed_takedown_reason',
          rowId: 1,
        })
      );
    });

    it('returns 403 for admin without create permission', async () => {
      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason`)
        .set(adminAuthHeaders(2))
        .send({ reason: 'test_reason' });

      expect(res.status).toBe(403);
      expect(auditRecordMock).not.toHaveBeenCalled();
    });

    it('returns 404 for non-allowlisted table', async () => {
      const res = await request(app)
        .post(`${dbBase}/account`)
        .set(adminAuthHeaders(1))
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(404);
    });

    it('returns 403 when writing to read-only table (feed)', async () => {
      const res = await request(app)
        .post(`${dbBase}/feed`)
        .set(adminAuthHeaders(1))
        .send({ url: 'https://example.com/feed.xml' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('read-only');
      expect(auditRecordMock).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /database/:table/:id (update)', () => {
    it('returns 200 for superuser updating feed_takedown_reason', async () => {
      const res = await request(app)
        .patch(`${dbBase}/feed_takedown_reason/1`)
        .set(adminAuthHeaders(1))
        .send({ reason: 'Updated reason' });

      expect(res.status).toBe(200);
      expect(auditRecordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          adminAccountId: 1,
          operation: 'update',
          tableName: 'feed_takedown_reason',
          rowId: 1,
        })
      );
    });

    it('returns 403 for admin without update permission', async () => {
      const res = await request(app)
        .patch(`${dbBase}/feed_takedown_reason/1`)
        .set(adminAuthHeaders(2))
        .send({ reason: 'Test' });

      expect(res.status).toBe(403);
      expect(auditRecordMock).not.toHaveBeenCalled();
    });

    it('returns 403 when updating read-only table (feed)', async () => {
      const res = await request(app)
        .patch(`${dbBase}/feed/1`)
        .set(adminAuthHeaders(1))
        .send({ spam_item_limit_override: 10 });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('read-only');
      expect(auditRecordMock).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /database/:table/:id', () => {
    it('returns 200 for superuser deleting from feed_takedown_reason', async () => {
      const res = await request(app)
        .delete(`${dbBase}/feed_takedown_reason/7`)
        .set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
      expect(auditRecordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          adminAccountId: 1,
          operation: 'delete',
          tableName: 'feed_takedown_reason',
          rowId: 7,
        })
      );
    });

    it('returns 403 for admin without delete permission', async () => {
      const res = await request(app)
        .delete(`${dbBase}/feed_takedown_reason/7`)
        .set(adminAuthHeaders(2));

      expect(res.status).toBe(403);
      expect(auditRecordMock).not.toHaveBeenCalled();
    });

    it('returns 404 for non-allowlisted table', async () => {
      const res = await request(app).delete(`${dbBase}/account/1`).set(adminAuthHeaders(1));

      expect(res.status).toBe(404);
    });

    it('returns 403 when deleting from read-only table (feed)', async () => {
      const res = await request(app).delete(`${dbBase}/feed/1`).set(adminAuthHeaders(1));

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('read-only');
      expect(auditRecordMock).not.toHaveBeenCalled();
    });
  });

  describe('Audit logging', () => {
    it('includes request id from x-request-id header on create', async () => {
      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason`)
        .set({ ...adminAuthHeaders(1), 'x-request-id': 'req-test-123' })
        .send({ reason: 'audit_test' });

      expect(res.status).toBe(201);
      expect(auditRecordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-test-123',
        })
      );
    });

    it('captures before and after snapshots on update', async () => {
      const res = await request(app)
        .patch(`${dbBase}/feed_takedown_reason/5`)
        .set(adminAuthHeaders(1))
        .send({ reason: 'changed' });

      expect(res.status).toBe(200);
      expect(auditRecordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'update',
          rowId: 5,
        })
      );
    });

    it('captures before snapshot on delete', async () => {
      const res = await request(app)
        .delete(`${dbBase}/feed_takedown_reason/9`)
        .set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
      expect(auditRecordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'delete',
          rowId: 9,
        })
      );
    });
  });

  describe('Error hardening', () => {
    it('returns generic error for unhandled exceptions (no SQL leakage)', async () => {
      queryTableMock.mockRejectedValueOnce(new Error('SELECT * FROM secret_table'));

      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason/query`)
        .set(adminAuthHeaders(1))
        .send({});

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Internal server error');
      expect(res.body.message).not.toContain('SELECT');
      expect(res.body.message).not.toContain('secret_table');
    });

    it('returns generic error for unhandled mutation exceptions', async () => {
      createRowMock.mockRejectedValueOnce(new Error('connection refused: pg://admin:pass@db'));

      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason`)
        .set(adminAuthHeaders(1))
        .send({ reason: 'test' });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Internal server error');
      expect(res.body.message).not.toContain('pg://');
      expect(res.body.message).not.toContain('admin:pass');
    });
  });

  describe('Query validation bounds', () => {
    it('rejects query with more than 10 filters', async () => {
      const filters = Array.from({ length: 11 }, (_, i) => ({
        field: 'id',
        operator: 'eq',
        value: i,
      }));

      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason/query`)
        .set(adminAuthHeaders(1))
        .send({ filters });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('filters');
    });

    it('rejects query with more than 3 sorts', async () => {
      const sorts = Array.from({ length: 4 }, () => ({
        field: 'id',
        direction: 'ASC',
      }));

      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason/query`)
        .set(adminAuthHeaders(1))
        .send({ sorts });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('sorts');
    });

    it('rejects IN filter with more than 50 values', async () => {
      const filters = [
        {
          field: 'id',
          operator: 'in',
          value: Array.from({ length: 51 }, (_, i) => i),
        },
      ];

      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason/query`)
        .set(adminAuthHeaders(1))
        .send({ filters });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('in');
    });

    it('rejects LIKE filter value longer than 100 characters', async () => {
      const filters = [
        {
          field: 'reason',
          operator: 'like',
          value: 'a'.repeat(101),
        },
      ];

      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason/query`)
        .set(adminAuthHeaders(1))
        .send({ filters });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('100');
    });

    it('rejects pageSize above 100', async () => {
      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason/query`)
        .set(adminAuthHeaders(1))
        .send({ pageSize: 200 });

      expect(res.status).toBe(400);
    });

    it('rejects negative page number', async () => {
      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason/query`)
        .set(adminAuthHeaders(1))
        .send({ page: -1 });

      expect(res.status).toBe(400);
    });
  });

  describe('Mutation validation', () => {
    it('rejects create with empty body', async () => {
      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason`)
        .set(adminAuthHeaders(1))
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects create with too many fields (more than 20)', async () => {
      const data: Record<string, string> = {};
      for (let i = 0; i < 21; i++) {
        data[`field_${i}`] = `value_${i}`;
      }

      const res = await request(app)
        .post(`${dbBase}/feed_takedown_reason`)
        .set(adminAuthHeaders(1))
        .send(data);

      expect(res.status).toBe(400);
    });

    it('rejects update with invalid id parameter', async () => {
      const res = await request(app)
        .patch(`${dbBase}/feed_takedown_reason/not-a-number`)
        .set(adminAuthHeaders(1))
        .send({ reason: 'test' });

      expect(res.status).toBe(400);
    });

    it('rejects delete with invalid id parameter', async () => {
      const res = await request(app)
        .delete(`${dbBase}/feed_takedown_reason/not-a-number`)
        .set(adminAuthHeaders(1));

      expect(res.status).toBe(400);
    });
  });
});
