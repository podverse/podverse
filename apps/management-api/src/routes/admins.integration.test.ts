import { app } from '@mgmt-api/app.js';
import { config } from '@mgmt-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const adminsBase = `${config.api.prefix}${config.api.version}/admins`;

type MockAdmin = {
  id: number;
  id_text: string;
  admin_account_role_id: number;
  admin_account_role: { role: string };
  admin_account_credentials: { email: string } | null;
  permissions: {
    feedsCrud: number;
    feedTakedownReasonsCrud: number;
    adminsCrud: number;
    statsCrud: number;
  } | null;
  created_at: Date;
};

const superuserAdmin: MockAdmin = {
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

const adminWithAdminsRead: MockAdmin = {
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

const adminWithNoPermissions: MockAdmin = {
  id: 3,
  id_text: 'pvMgtAd003',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'noperms@example.com' },
  permissions: {
    feedsCrud: 0,
    feedTakedownReasonsCrud: 0,
    adminsCrud: 0,
    statsCrud: 0,
    billingPricesCrud: 0,
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
};

const { getWithRoleAndPermissionsMock, listMock, createMock, updateMock, deleteMock } = vi.hoisted(
  () => ({
    getWithRoleAndPermissionsMock: vi.fn<Promise<MockAdmin | null>, [number]>(
      async (id: number) => {
        if (id === 1) return superuserAdmin;
        if (id === 2) return adminWithAdminsRead;
        if (id === 3) return adminWithNoPermissions;
        return null;
      }
    ),
    listMock: vi.fn<Promise<MockAdmin[]>, []>(async () => [
      superuserAdmin,
      adminWithAdminsRead,
      adminWithNoPermissions,
    ]),
    createMock: vi.fn<Promise<MockAdmin>, [unknown]>(),
    updateMock: vi.fn<Promise<MockAdmin>, [number, unknown]>(),
    deleteMock: vi.fn<Promise<void>, [number]>(),
  })
);

vi.mock('@mgmt-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async get(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
    async getWithRoleAndPermissions(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
    async list() {
      return listMock();
    }
    async create(dto: unknown) {
      return createMock(dto);
    }
    async update(id: number, dto: unknown) {
      return updateMock(id, dto);
    }
    async delete(id: number) {
      return deleteMock(id);
    }
  }
  return { AdminAccountService };
});

vi.mock('@mgmt-api/lib/database/auditLog.js', () => {
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

const adminAuthHeaders = (userId: number = 1): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign(
    { id: userId, id_text: adminIdTextByUserId[userId] ?? 'pvMgtSu001' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )}`,
});

describe('management-api admins routes', () => {
  beforeEach(() => {
    getWithRoleAndPermissionsMock.mockClear();
    listMock.mockClear();
    createMock.mockClear();
    updateMock.mockClear();
    deleteMock.mockClear();
  });

  describe('GET /admins', () => {
    it('returns 200 for superuser', async () => {
      const res = await request(app).get(`${adminsBase}`).set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(3);
    });

    it('returns 200 for admin with admins:read permission', async () => {
      const res = await request(app).get(`${adminsBase}`).set(adminAuthHeaders(2));

      expect(res.status).toBe(200);
    });

    it('returns 403 for admin without admins:read permission', async () => {
      const res = await request(app).get(`${adminsBase}`).set(adminAuthHeaders(3));

      expect(res.status).toBe(403);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${adminsBase}`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /admins/:id', () => {
    it('returns 200 for superuser reading another admin', async () => {
      const res = await request(app).get(`${adminsBase}/2`).set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 2,
        role: 'admin',
        email: 'reader@example.com',
      });
    });

    it('returns 403 for admin without admins:read permission', async () => {
      const res = await request(app).get(`${adminsBase}/2`).set(adminAuthHeaders(3));

      expect(res.status).toBe(403);
    });
  });

  describe('POST /admins', () => {
    it('returns 201 for superuser creating an admin', async () => {
      createMock.mockResolvedValueOnce({
        id: 4,
        id_text: 'pvMgtNw001',
        admin_account_role_id: 2,
        admin_account_role: { role: 'admin' },
        admin_account_credentials: { email: 'new@example.com' },
        permissions: {
          feedsCrud: 2,
          feedTakedownReasonsCrud: 0,
          adminsCrud: 0,
          statsCrud: 0,
          billingPricesCrud: 0,
        },
        created_at: new Date('2024-01-01T00:00:00.000Z'),
      });

      const res = await request(app)
        .post(`${adminsBase}`)
        .set(adminAuthHeaders(1))
        .send({
          email: 'new@example.com',
          password: 'test-password',
          permissions: { feeds_crud: 2 },
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ email: 'new@example.com' });
    });

    it('returns 403 for non-superuser', async () => {
      const res = await request(app)
        .post(`${adminsBase}`)
        .set(adminAuthHeaders(2))
        .send({ email: 'new@example.com', password: 'test-password' });

      expect(res.status).toBe(403);
    });

    it('returns 400 with invalid payload', async () => {
      const res = await request(app).post(`${adminsBase}`).set(adminAuthHeaders(1)).send({});

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /admins/:id', () => {
    it('returns 200 for superuser updating another admin', async () => {
      updateMock.mockResolvedValueOnce({
        id: 2,
        id_text: 'pvMgtAd002',
        admin_account_role_id: 2,
        admin_account_role: { role: 'admin' },
        admin_account_credentials: { email: 'reader@example.com' },
        permissions: {
          feedsCrud: 15,
          feedTakedownReasonsCrud: 0,
          adminsCrud: 2,
          statsCrud: 0,
          billingPricesCrud: 0,
        },
        created_at: new Date('2020-01-01T00:00:00.000Z'),
      });

      const res = await request(app)
        .patch(`${adminsBase}/2`)
        .set(adminAuthHeaders(1))
        .send({ permissions: { feeds_crud: 15 } });

      expect(res.status).toBe(200);
    });

    it('returns 403 when admin tries to change their own permissions', async () => {
      const res = await request(app)
        .patch(`${adminsBase}/2`)
        .set(adminAuthHeaders(2))
        .send({ permissions: { feeds_crud: 15 } });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Cannot change your own permissions');
    });

    it('returns 403 when superuser tries to change their own permissions', async () => {
      const res = await request(app)
        .patch(`${adminsBase}/1`)
        .set(adminAuthHeaders(1))
        .send({ permissions: { feeds_crud: 15 } });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Cannot change your own permissions');
    });

    it('returns 403 when non-superuser tries to modify a superuser', async () => {
      const res = await request(app)
        .patch(`${adminsBase}/1`)
        .set(adminAuthHeaders(2))
        .send({ email: 'changed@example.com' });

      expect(res.status).toBe(404);
    });

    it('returns 403 when admin without admins:create/update tries to change permissions', async () => {
      const res = await request(app)
        .patch(`${adminsBase}/2`)
        .set(adminAuthHeaders(3))
        .send({ permissions: { feeds_crud: 2 } });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Create or update permission');
    });

    it('returns 400 with invalid permissions value', async () => {
      const res = await request(app)
        .patch(`${adminsBase}/2`)
        .set(adminAuthHeaders(1))
        .send({ permissions: { admins_crud: 20 } });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /admins/:id', () => {
    it('returns 200 for superuser deleting another admin', async () => {
      deleteMock.mockResolvedValueOnce(undefined);

      const res = await request(app).delete(`${adminsBase}/2`).set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
    });

    it('returns 403 when superuser tries to delete themselves', async () => {
      const res = await request(app).delete(`${adminsBase}/1`).set(adminAuthHeaders(1));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Cannot delete your own account');
    });

    it('returns 403 for non-superuser', async () => {
      const res = await request(app).delete(`${adminsBase}/3`).set(adminAuthHeaders(2));

      expect(res.status).toBe(403);
    });
  });
});
