import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolvedProductMembership } from '@podverse/helpers';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const canonicalPath = `${config.api.prefix}${config.api.version}/products/membership`;

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

const admin = {
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

const { getWithRoleAndPermissionsMock } = vi.hoisted(() => ({
  getWithRoleAndPermissionsMock: vi.fn(async (id: number) => {
    if (id === 1) {
      return superuser;
    }
    if (id === 2) {
      return admin;
    }
    return null;
  }),
}));

const { resolveProductMembershipMock } = vi.hoisted(() => ({
  resolveProductMembershipMock: vi.fn(async () => ({
    freeTrialExpirationSeconds: 86400,
    premiumMembershipCostMonthly: 3,
    premiumMembershipCostAnnually: 30,
    trialAllowDirectoryAddByRSS: false,
    trialMaxAddByRSSFeeds: 10,
    trialMaxManualRefreshesPerHour: 5,
    trialTrackStats: false,
    trialAllowNotifications: false,
    premiumAllowDirectoryAddByRSS: true,
    premiumMaxAddByRSSFeeds: 100,
    premiumMaxManualRefreshesPerHour: 20,
    premiumTrackStats: true,
    premiumAllowNotifications: true,
  })),
}));

const { updateProductMembershipSettingsMock, auditRecordMock } = vi.hoisted(() => ({
  updateProductMembershipSettingsMock: vi.fn(async () => undefined),
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

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class BillingPriceCatalogService {
    async resolveProductMembership() {
      return resolveProductMembershipMock();
    }

    async updateProductMembershipSettings(params: {
      freeTrialExpirationSeconds?: number;
      trialMaxAddByRSSFeeds?: number;
      trialMaxManualRefreshesPerHour?: number;
      premiumMaxAddByRSSFeeds?: number;
      premiumMaxManualRefreshesPerHour?: number;
    }) {
      return updateProductMembershipSettingsMock(params);
    }
  }

  return { ...actual, BillingPriceCatalogService };
});

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

describe('/products/membership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without authentication on GET', async () => {
    const res = await request(app).get(canonicalPath).expect(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('returns 403 for non-superuser on GET', async () => {
    const res = await request(app).get(canonicalPath).set(adminAuthHeaders()).expect(403);
    expect(res.body.message).toBe('Superuser only');
  });

  it('returns 200 with numeric resolved product membership for superuser on GET', async () => {
    const res = await request(app).get(canonicalPath).set(superuserAuthHeaders()).expect(200);
    const body = res.body as { data: ResolvedProductMembership };
    expect(body.data).toMatchObject({
      freeTrialExpirationSeconds: expect.any(Number),
      premiumMembershipCostMonthly: expect.any(Number),
      premiumMembershipCostAnnually: expect.any(Number),
      trialAllowDirectoryAddByRSS: expect.any(Boolean),
      trialMaxAddByRSSFeeds: expect.any(Number),
      trialMaxManualRefreshesPerHour: expect.any(Number),
      trialTrackStats: expect.any(Boolean),
      trialAllowNotifications: expect.any(Boolean),
      premiumAllowDirectoryAddByRSS: expect.any(Boolean),
      premiumMaxAddByRSSFeeds: expect.any(Number),
      premiumMaxManualRefreshesPerHour: expect.any(Number),
      premiumTrackStats: expect.any(Boolean),
      premiumAllowNotifications: expect.any(Boolean),
    });
    expect(body.data.freeTrialExpirationSeconds).toBeGreaterThan(0);
  });

  it('returns 400 for invalid PATCH payload', async () => {
    const res = await request(app)
      .patch(canonicalPath)
      .set(superuserAuthHeaders())
      .send({ freeTrialExpirationSeconds: 0 })
      .expect(400);
    expect(res.body.message).toMatch(/freeTrialExpirationSeconds/);
  });

  it('returns 400 when PATCH body has no recognized fields', async () => {
    const res = await request(app)
      .patch(canonicalPath)
      .set(superuserAuthHeaders())
      .send({})
      .expect(400);
    expect(typeof res.body.message).toBe('string');
  });

  it('returns 403 for non-superuser on PATCH', async () => {
    const res = await request(app)
      .patch(canonicalPath)
      .set(adminAuthHeaders())
      .send({ freeTrialExpirationSeconds: 7776000 })
      .expect(403);
    expect(res.body.message).toBe('Superuser only');
  });

  it('updates trial length for superuser on PATCH and returns refreshed values', async () => {
    resolveProductMembershipMock.mockResolvedValueOnce({
      freeTrialExpirationSeconds: 7776000,
      premiumMembershipCostMonthly: 3,
      premiumMembershipCostAnnually: 30,
      trialAllowDirectoryAddByRSS: false,
      trialMaxAddByRSSFeeds: 10,
      trialMaxManualRefreshesPerHour: 5,
      trialTrackStats: false,
      trialAllowNotifications: false,
      premiumAllowDirectoryAddByRSS: true,
      premiumMaxAddByRSSFeeds: 100,
      premiumMaxManualRefreshesPerHour: 20,
      premiumTrackStats: true,
      premiumAllowNotifications: true,
    });
    const res = await request(app)
      .patch(canonicalPath)
      .set(superuserAuthHeaders())
      .send({ freeTrialExpirationSeconds: 7776000 })
      .expect(200);

    expect(updateProductMembershipSettingsMock).toHaveBeenCalledWith({
      freeTrialExpirationSeconds: 7776000,
    });
    expect(auditRecordMock).toHaveBeenCalledTimes(1);
    expect(res.body.data.freeTrialExpirationSeconds).toBe(7776000);
  });

  it('updates a cap field only on PATCH', async () => {
    resolveProductMembershipMock.mockResolvedValueOnce({
      freeTrialExpirationSeconds: 86400,
      premiumMembershipCostMonthly: 3,
      premiumMembershipCostAnnually: 30,
      trialAllowDirectoryAddByRSS: false,
      trialMaxAddByRSSFeeds: 12,
      trialMaxManualRefreshesPerHour: 5,
      trialTrackStats: false,
      trialAllowNotifications: false,
      premiumAllowDirectoryAddByRSS: true,
      premiumMaxAddByRSSFeeds: 100,
      premiumMaxManualRefreshesPerHour: 20,
      premiumTrackStats: true,
      premiumAllowNotifications: true,
    });
    const res = await request(app)
      .patch(canonicalPath)
      .set(superuserAuthHeaders())
      .send({ trialMaxAddByRSSFeeds: 12 })
      .expect(200);

    expect(updateProductMembershipSettingsMock).toHaveBeenCalledWith({
      trialMaxAddByRSSFeeds: 12,
    });
    expect(res.body.data.trialMaxAddByRSSFeeds).toBe(12);
  });
});
