import { app } from '@mgmt-api/app.js';
import { config } from '@mgmt-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const adminsBase = `${config.api.prefix}${config.api.version}/admins`;
const redeemInviteLinkUrl = `${adminsBase}/invite-link/redeem`;

type MockAdmin = {
  id: number;
  id_text: string;
  admin_account_role_id: number;
  admin_account_role: { role: string };
  admin_account_credentials: { email: string | null; username: string | null } | null;
  permissions: {
    feedsCrud: number;
    feedTakedownReasonsCrud: number;
    adminsCrud: number;
    statsCrud: number;
    billingPricesCrud: number;
    bucketCrud: number;
  } | null;
  created_at: Date;
};

const superuserAdmin: MockAdmin = {
  id: 1,
  id_text: 'pvMgtSu001',
  admin_account_role_id: 1,
  admin_account_role: { role: 'superuser' },
  admin_account_credentials: { email: 'super@example.com', username: null },
  permissions: {
    feedsCrud: 15,
    feedTakedownReasonsCrud: 15,
    adminsCrud: 15,
    statsCrud: 15,
    billingPricesCrud: 15,
    bucketCrud: 15,
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
};

/** read (2) + update (4) — enough for PATCH tests */
const adminWithAdminsRead: MockAdmin = {
  id: 2,
  id_text: 'pvMgtAd002',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'reader@example.com', username: null },
  permissions: {
    feedsCrud: 0,
    feedTakedownReasonsCrud: 0,
    adminsCrud: 6,
    statsCrud: 0,
    billingPricesCrud: 0,
    bucketCrud: 0,
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
};

const adminWithNoPermissions: MockAdmin = {
  id: 3,
  id_text: 'pvMgtAd003',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'noperms@example.com', username: null },
  permissions: {
    feedsCrud: 0,
    feedTakedownReasonsCrud: 0,
    adminsCrud: 0,
    statsCrud: 0,
    billingPricesCrud: 0,
    bucketCrud: 0,
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
};

/** create (1) + read (2) */
const adminWithAdminsCreate: MockAdmin = {
  id: 4,
  id_text: 'pvMgtCr004',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'creator@example.com', username: null },
  permissions: {
    feedsCrud: 0,
    feedTakedownReasonsCrud: 0,
    adminsCrud: 3,
    statsCrud: 0,
    billingPricesCrud: 0,
    bucketCrud: 0,
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
        if (id === 4) return adminWithAdminsCreate;
        return null;
      }
    ),
    listMock: vi.fn<Promise<MockAdmin[]>, []>(async () => [
      superuserAdmin,
      adminWithAdminsRead,
      adminWithNoPermissions,
      adminWithAdminsCreate,
    ]),
    createMock: vi.fn<Promise<MockAdmin>, [unknown]>(),
    updateMock: vi.fn<Promise<MockAdmin>, [number, unknown]>(),
    deleteMock: vi.fn<Promise<void>, [number]>(),
  })
);

vi.mock('@mgmt-api/orm/services/managementAdminRole.js', () => {
  return {
    ManagementAdminRoleService: class {
      async listAll() {
        return [];
      }
      async findById(_id: string) {
        return null;
      }
      async create(data: {
        name: string;
        feedsCrud: number;
        feedTakedownReasonsCrud: number;
        adminsCrud: number;
        statsCrud: number;
        billingPricesCrud: number;
        bucketCrud: number;
      }) {
        return {
          id: '11111111-1111-1111-1111-111111111111',
          name: data.name,
          feedsCrud: data.feedsCrud,
          feedTakedownReasonsCrud: data.feedTakedownReasonsCrud,
          adminsCrud: data.adminsCrud,
          statsCrud: data.statsCrud,
          billingPricesCrud: data.billingPricesCrud,
          bucketCrud: data.bucketCrud,
          created_at: new Date('2024-06-01T00:00:00.000Z'),
        };
      }
      async update(
        id: string,
        updates: Partial<{
          name: string;
          feedsCrud: number;
          feedTakedownReasonsCrud: number;
          adminsCrud: number;
          statsCrud: number;
          billingPricesCrud: number;
          bucketCrud: number;
        }>
      ) {
        return {
          id,
          name: updates.name ?? 'updated',
          feedsCrud: updates.feedsCrud ?? 0,
          feedTakedownReasonsCrud: updates.feedTakedownReasonsCrud ?? 0,
          adminsCrud: updates.adminsCrud ?? 0,
          statsCrud: updates.statsCrud ?? 0,
          billingPricesCrud: updates.billingPricesCrud ?? 0,
          bucketCrud: updates.bucketCrud ?? 0,
          created_at: new Date('2024-06-01T00:00:00.000Z'),
        };
      }
      async delete(_id: string) {
        return;
      }
    },
  };
});

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
    async upsertInviteToken(_adminAccountId: number) {
      return {
        token: 'invite-token-test',
        expires_at: new Date('2030-01-01T00:00:00.000Z'),
      };
    }
    async getActiveInviteToken(adminAccountId: number) {
      if (adminAccountId === 2) {
        return {
          token: 'active-invite-token',
          expires_at: new Date('2030-06-01T00:00:00.000Z'),
        };
      }
      return null;
    }
    async clearSetPasswordToken(_adminAccountId: number) {
      return;
    }
    async completeSetPasswordFromToken(_token: string, _plainPassword: string) {
      return;
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
  4: 'pvMgtCr004',
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
      expect(res.body).toHaveLength(4);
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

    it('returns 404 when non-superuser reads a superuser admin', async () => {
      const res = await request(app).get(`${adminsBase}/1`).set(adminAuthHeaders(2));

      expect(res.status).toBe(404);
    });

    it('returns 403 for admin without admins:read permission', async () => {
      const res = await request(app).get(`${adminsBase}/2`).set(adminAuthHeaders(3));

      expect(res.status).toBe(403);
    });
  });

  describe('POST /admins', () => {
    it('returns 201 for superuser creating an admin', async () => {
      createMock.mockResolvedValueOnce({
        id: 5,
        id_text: 'pvMgtNw001',
        admin_account_role_id: 2,
        admin_account_role: { role: 'admin' },
        admin_account_credentials: { email: 'new@example.com', username: null },
        permissions: {
          feedsCrud: 2,
          feedTakedownReasonsCrud: 0,
          adminsCrud: 0,
          statsCrud: 0,
          billingPricesCrud: 0,
          bucketCrud: 0,
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
      expect(res.body).toMatchObject({ email: 'new@example.com', username: null });
    });

    it('returns 201 with set_password_url when password omitted', async () => {
      createMock.mockResolvedValueOnce({
        id: 5,
        id_text: 'pvMgtNw002',
        admin_account_role_id: 2,
        admin_account_role: { role: 'admin' },
        admin_account_credentials: { email: 'invite@example.com', username: null },
        permissions: {
          feedsCrud: 0,
          feedTakedownReasonsCrud: 0,
          adminsCrud: 0,
          statsCrud: 0,
          billingPricesCrud: 0,
          bucketCrud: 0,
        },
        created_at: new Date('2024-01-01T00:00:00.000Z'),
      });

      const res = await request(app)
        .post(`${adminsBase}`)
        .set(adminAuthHeaders(1))
        .send({
          email: 'invite@example.com',
          permissions: { feeds_crud: 0 },
        });

      expect(res.status).toBe(201);
      expect(typeof res.body.set_password_url).toBe('string');
      expect(res.body.set_password_url).toContain('/admins/redeem-invite-link?token=');
    });

    it('returns 201 for admin with admins:create permission', async () => {
      createMock.mockResolvedValueOnce({
        id: 6,
        id_text: 'pvMgtNw003',
        admin_account_role_id: 2,
        admin_account_role: { role: 'admin' },
        admin_account_credentials: { email: 'bycreator@example.com', username: null },
        permissions: {
          feedsCrud: 0,
          feedTakedownReasonsCrud: 0,
          adminsCrud: 0,
          statsCrud: 0,
          billingPricesCrud: 0,
          bucketCrud: 0,
        },
        created_at: new Date('2024-01-01T00:00:00.000Z'),
      });

      const res = await request(app).post(`${adminsBase}`).set(adminAuthHeaders(4)).send({
        email: 'bycreator@example.com',
        password: 'test-password',
      });

      expect(res.status).toBe(201);
    });

    it('returns 403 for admin without admins:create permission', async () => {
      const res = await request(app)
        .post(`${adminsBase}`)
        .set(adminAuthHeaders(2))
        .send({ email: 'new@example.com', password: 'test-password' });

      expect(res.status).toBe(403);
    });

    it('returns 400 with invalid payload (neither email nor username)', async () => {
      const res = await request(app).post(`${adminsBase}`).set(adminAuthHeaders(1)).send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Either email or username is required');
    });

    it('returns 201 with username only and password', async () => {
      createMock.mockResolvedValueOnce({
        id: 5,
        id_text: 'pvMgtNw010',
        admin_account_role_id: 2,
        admin_account_role: { role: 'admin' },
        admin_account_credentials: { email: null, username: 'opsonly' },
        permissions: {
          feedsCrud: 0,
          feedTakedownReasonsCrud: 0,
          adminsCrud: 0,
          statsCrud: 0,
          billingPricesCrud: 0,
          bucketCrud: 0,
        },
        created_at: new Date('2024-01-01T00:00:00.000Z'),
      });

      const res = await request(app).post(`${adminsBase}`).set(adminAuthHeaders(1)).send({
        username: 'opsonly',
        password: 'test-password',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ email: null, username: 'opsonly' });
    });

    it('returns 201 with both email and username', async () => {
      createMock.mockResolvedValueOnce({
        id: 5,
        id_text: 'pvMgtNw011',
        admin_account_role_id: 2,
        admin_account_role: { role: 'admin' },
        admin_account_credentials: { email: 'both@example.com', username: 'bothuser' },
        permissions: {
          feedsCrud: 0,
          feedTakedownReasonsCrud: 0,
          adminsCrud: 0,
          statsCrud: 0,
          billingPricesCrud: 0,
          bucketCrud: 0,
        },
        created_at: new Date('2024-01-01T00:00:00.000Z'),
      });

      const res = await request(app).post(`${adminsBase}`).set(adminAuthHeaders(1)).send({
        email: 'both@example.com',
        username: 'bothuser',
        password: 'test-password',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ email: 'both@example.com', username: 'bothuser' });
    });

    it('returns 400 for invalid username on create', async () => {
      const res = await request(app)
        .post(`${adminsBase}`)
        .set(adminAuthHeaders(1))
        .send({ username: 'no spaces' });

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
        admin_account_credentials: { email: 'reader@example.com', username: null },
        permissions: {
          feedsCrud: 15,
          feedTakedownReasonsCrud: 0,
          adminsCrud: 6,
          statsCrud: 0,
          billingPricesCrud: 0,
          bucketCrud: 0,
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

    it('returns 403 when admin lacks admins:update for PATCH', async () => {
      const res = await request(app)
        .patch(`${adminsBase}/2`)
        .set(adminAuthHeaders(3))
        .send({ permissions: { feeds_crud: 2 } });

      expect(res.status).toBe(403);
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

    it('returns 403 for admin without admins:delete permission', async () => {
      const res = await request(app).delete(`${adminsBase}/3`).set(adminAuthHeaders(2));

      expect(res.status).toBe(403);
    });
  });

  describe('GET /admins/:id/invite-link', () => {
    it('returns invite_link for superuser when token exists', async () => {
      const res = await request(app).get(`${adminsBase}/2/invite-link`).set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
      expect(res.body.invite_link.url).toContain('/admins/redeem-invite-link?token=');
    });

    it('returns 404 for non-superuser targeting superuser account', async () => {
      const res = await request(app).get(`${adminsBase}/1/invite-link`).set(adminAuthHeaders(2));

      expect(res.status).toBe(404);
    });
  });

  describe('POST /admins/:id/invite-link', () => {
    it('returns 201 with invite URL for superuser', async () => {
      const res = await request(app).post(`${adminsBase}/2/invite-link`).set(adminAuthHeaders(1));

      expect(res.status).toBe(201);
      expect(res.body.invite_link.url).toContain('/admins/redeem-invite-link?token=');
    });
  });

  describe('DELETE /admins/:id/invite-link', () => {
    it('returns 200 for superuser', async () => {
      const res = await request(app).delete(`${adminsBase}/2/invite-link`).set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
    });
  });

  describe('GET /admins/roles', () => {
    it('returns predefined and custom roles for superuser', async () => {
      const res = await request(app).get(`${adminsBase}/roles`).set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.roles)).toBe(true);
      expect(res.body.roles.some((r: { id: string }) => r.id === 'everything')).toBe(true);
      expect(res.body.roles.some((r: { id: string }) => r.id === 'storage_full')).toBe(true);
    });

    it('returns 403 without admins:read', async () => {
      const res = await request(app).get(`${adminsBase}/roles`).set(adminAuthHeaders(3));

      expect(res.status).toBe(403);
    });
  });

  describe('POST /admins with role_id', () => {
    it('resolves predefined role_id and passes permissions to create', async () => {
      createMock.mockResolvedValueOnce({
        id: 9,
        id_text: 'pvMgtRl001',
        admin_account_role_id: 2,
        admin_account_role: { role: 'admin' },
        admin_account_credentials: { email: 'rolepreset@example.com', username: null },
        permissions: {
          feedsCrud: 0,
          feedTakedownReasonsCrud: 0,
          adminsCrud: 0,
          statsCrud: 0,
          billingPricesCrud: 0,
          bucketCrud: 15,
        },
        created_at: new Date('2024-01-01T00:00:00.000Z'),
      });

      const res = await request(app).post(`${adminsBase}`).set(adminAuthHeaders(1)).send({
        email: 'rolepreset@example.com',
        password: 'test-password',
        role_id: 'storage_full',
      });

      expect(res.status).toBe(201);
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: expect.objectContaining({
            feeds_crud: 0,
            bucket_crud: 15,
          }),
        })
      );
    });

    it('returns 404 for unknown role_id', async () => {
      const res = await request(app).post(`${adminsBase}`).set(adminAuthHeaders(1)).send({
        email: 'badrole@example.com',
        password: 'test-password',
        role_id: 'not-a-real-role-id',
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Role not found');
    });
  });

  describe('PATCH /admins/:id with role_id', () => {
    it('applies resolved permissions from role_id', async () => {
      updateMock.mockResolvedValueOnce({
        id: 2,
        id_text: 'pvMgtAd002',
        admin_account_role_id: 2,
        admin_account_role: { role: 'admin' },
        admin_account_credentials: { email: 'reader@example.com', username: null },
        permissions: {
          feedsCrud: 15,
          feedTakedownReasonsCrud: 15,
          adminsCrud: 15,
          statsCrud: 15,
          billingPricesCrud: 15,
          bucketCrud: 15,
        },
        created_at: new Date('2020-01-01T00:00:00.000Z'),
      });

      const res = await request(app)
        .patch(`${adminsBase}/2`)
        .set(adminAuthHeaders(1))
        .send({ role_id: 'everything' });

      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          permissions: expect.objectContaining({
            feeds_crud: 15,
            bucket_crud: 15,
          }),
        })
      );
    });

    it('returns 403 when admin tries to apply role_id to self', async () => {
      const res = await request(app)
        .patch(`${adminsBase}/2`)
        .set(adminAuthHeaders(2))
        .send({ role_id: 'everything' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Cannot change your own permissions');
    });
  });

  describe('POST /admins/invite-link/redeem (public)', () => {
    it('returns 200 with valid token and password', async () => {
      const res = await request(app).post(redeemInviteLinkUrl).send({
        token: 'valid-token',
        password: 'new-password-123',
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password updated');
    });

    it('returns 400 with invalid password length', async () => {
      const res = await request(app).post(redeemInviteLinkUrl).send({
        token: 'valid-token',
        password: 'short',
      });

      expect(res.status).toBe(400);
    });
  });
});
