import { app } from '@mgmt-api/app.js';
import { config } from '@mgmt-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';

const makeMockAdmin = (id: number) => ({
  id,
  id_text: String(id),
  admin_account_role_id: id === 1 ? 1 : 2,
  admin_account_role: { role: id === 1 ? 'superuser' : 'admin' },
  admin_account_credentials: {
    email: `admin${id}@example.com`,
    password: 'hash',
    id,
    admin_account_id: id,
  },
  permissions:
    id === 1
      ? {
          id: 1,
          admin_account_id: 1,
          feedsCrud: 15,
          feedFlagStatusesCrud: 15,
          feedFlagStatusReasonsCrud: 15,
          adminsCrud: 15,
          statsCrud: 15,
          created_at: new Date('2020-01-01T00:00:00.000Z'),
          updated_at: new Date('2020-01-01T00:00:00.000Z'),
        }
      : {
          id: 2,
          admin_account_id: 2,
          feedsCrud: 0,
          feedFlagStatusesCrud: 0,
          feedFlagStatusReasonsCrud: 0,
          adminsCrud: 0,
          statsCrud: 0,
          created_at: new Date('2020-01-01T00:00:00.000Z'),
          updated_at: new Date('2020-01-01T00:00:00.000Z'),
        },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
});

const { adminAccountGetWithRoleAndPermsMock, adminAccountGetMock } = vi.hoisted(() => {
  const adminAccountGetWithRoleAndPermsMock = vi.fn<
    Promise<typeof ReturnType<typeof makeMockAdmin> | null>,
    [number]
  >(async (id: number) => {
    if (id === 1 || id === 2) {
      return makeMockAdmin(id);
    }
    return null;
  });
  const adminAccountGetMock = vi.fn<
    Promise<{ id: number; id_text: string; created_at: Date } | null>,
    [number]
  >(async (id: number) => {
    if (id === 1 || id === 2) {
      return { id, id_text: String(id), created_at: new Date('2020-01-01T00:00:00.000Z') };
    }
    return null;
  });
  return { adminAccountGetWithRoleAndPermsMock, adminAccountGetMock };
});

vi.mock('@mgmt-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async get(id: number) {
      return adminAccountGetMock(id);
    }
    async getWithRoleAndPermissions(id: number) {
      return adminAccountGetWithRoleAndPermsMock(id);
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

const adminBase = `${config.api.prefix}${config.api.version}/admin-account`;

describe('GET admin-account/:id authz', () => {
  beforeEach(() => {
    adminAccountGetWithRoleAndPermsMock.mockClear();
    adminAccountGetMock.mockClear();
  });

  it('returns admin data when the path id matches the JWT subject', async () => {
    const token = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app).get(`${adminBase}/1`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      id_text: '1',
      created_at: expect.any(String),
    });
    expect(adminAccountGetMock).toHaveBeenCalled();
  });

  it('returns 403 when the path id does not match the JWT subject', async () => {
    const token = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app).get(`${adminBase}/2`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ message: 'Forbidden' });
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get(`${adminBase}/1`);

    expect(res.status).toBe(401);
  });

  it('returns 404 when admin account does not exist', async () => {
    adminAccountGetWithRoleAndPermsMock
      .mockResolvedValueOnce(makeMockAdmin(2))
      .mockResolvedValueOnce(makeMockAdmin(2));

    adminAccountGetMock.mockResolvedValueOnce(null);

    const token = jwt.sign({ id: 2 }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app).get(`${adminBase}/2`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
