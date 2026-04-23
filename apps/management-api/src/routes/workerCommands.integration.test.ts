import { app } from '@mgmt-api/app.js';
import { config } from '@mgmt-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const base = `${config.api.prefix}${config.api.version}/worker-commands`;

type MockAdmin = {
  id: number;
  admin_account_role: { role: string };
  permissions: null;
};

const superuser: MockAdmin = {
  id: 1,
  admin_account_role: { role: 'superuser' },
  permissions: null,
};
const admin: MockAdmin = { id: 2, admin_account_role: { role: 'admin' }, permissions: null };

const { getWithRoleAndPermissionsMock } = vi.hoisted(() => ({
  getWithRoleAndPermissionsMock: vi.fn<Promise<MockAdmin | null>, [number]>(async (id: number) => {
    if (id === 1) {
      return superuser;
    }
    if (id === 2) {
      return admin;
    }
    return null;
  }),
}));

vi.mock('@mgmt-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async getWithRoleAndPermissions(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
  }
  return { AdminAccountService };
});

// Avoid loading management orm entities (see auditLog.ts); matches feed/database integration patterns.
vi.mock('@mgmt-api/lib/database/auditLog.js', () => {
  class AuditLogService {
    async record() {
      return;
    }
  }
  return { AuditLogService };
});

const adminAuthHeaders = (userId: number): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' })}`,
});

describe('management-api GET /worker-commands', () => {
  beforeEach(() => {
    getWithRoleAndPermissionsMock.mockClear();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get(base);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-superuser', async () => {
    const res = await request(app).get(base).set(adminAuthHeaders(2));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Superuser only');
  });

  it('returns 200 and command catalog for a superuser', async () => {
    const res = await request(app).get(base).set(adminAuthHeaders(1));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        commands: expect.arrayContaining([
          expect.objectContaining({
            name: 'mqRSSAdd',
            label: expect.stringMatching(/add single feed/i),
            example_cli: expect.stringContaining('mq_rss_add'),
            risk: 'normal',
            related_management_path: null,
          }),
          expect.objectContaining({
            name: 'ormFeedUpdateFlagStatus',
            related_management_path: '/feed-operations/flag-status',
          }),
        ]),
      })
    );
    expect(res.body.commands.length).toBeGreaterThanOrEqual(20);
  });
});
