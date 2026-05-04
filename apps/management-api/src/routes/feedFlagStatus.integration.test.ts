import { app } from '@mgmt-api/app.js';
import { config } from '@mgmt-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const opBase = `${config.api.prefix}${config.api.version}/feed-operations`;

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
    feedFlagStatusesCrud: 15,
    feedFlagStatusReasonsCrud: 15,
    adminsCrud: 15,
    statsCrud: 15,
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const adminWithFeedsReadOnly = {
  id: 2,
  id_text: 'pvMgtAd002',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'reader@example.com' },
  permissions: {
    id: 2,
    admin_account_id: 2,
    feedsCrud: 2,
    feedFlagStatusesCrud: 2,
    feedFlagStatusReasonsCrud: 2,
    adminsCrud: 0,
    statsCrud: 0,
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const adminWithFeedsReadUpdate = {
  id: 4,
  id_text: 'pvMgtAd004',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'feedwriter@example.com' },
  permissions: {
    id: 4,
    admin_account_id: 4,
    feedsCrud: 4 | 2,
    feedFlagStatusesCrud: 0,
    feedFlagStatusReasonsCrud: 0,
    adminsCrud: 0,
    statsCrud: 0,
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const adminWithNoFeedPerms = {
  id: 3,
  id_text: 'pvMgtAd003',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'none@example.com' },
  permissions: {
    id: 3,
    admin_account_id: 3,
    feedsCrud: 0,
    feedFlagStatusesCrud: 0,
    feedFlagStatusReasonsCrud: 0,
    adminsCrud: 0,
    statsCrud: 0,
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const { getWithRoleAndPermissionsMock } = vi.hoisted(() => ({
  getWithRoleAndPermissionsMock: vi.fn(async (id: number) => {
    if (id === 1) {
      return superuserWithAllPerms;
    }
    if (id === 2) {
      return adminWithFeedsReadOnly;
    }
    if (id === 3) {
      return adminWithNoFeedPerms;
    }
    if (id === 4) {
      return adminWithFeedsReadUpdate;
    }
    return null;
  }),
}));

const sampleFeed = {
  id: 9,
  url: 'https://example.com/feed.xml',
  podcast_index_id: 55,
  spam_item_limit_override: null,
  feed_flag_status_id: 1,
  feed_flag_status_key: 'active',
  feed_flag_status_reason_id: null,
  feed_flag_status_reason_key: null,
  feed_flag_status_reason_note: null,
  channel_title: 'Test Show',
};

const {
  findByPi,
  findById,
  findByUrl,
  listSt,
  listRe,
  assertSt,
  assertRe,
  getSnap,
  updateDb,
  audit,
} = vi.hoisted(() => ({
  findByPi: vi.fn(),
  findById: vi.fn(),
  findByUrl: vi.fn(),
  listSt: vi.fn(async () => [{ id: 1, status: 'active' }]),
  listRe: vi.fn(async () => [{ id: 1, reason: 'copyright' }]),
  assertSt: vi.fn(async (id: number) => id >= 1 && id <= 6),
  assertRe: vi.fn(async (id: number) => id >= 1 && id <= 7),
  getSnap: vi.fn(),
  updateDb: vi.fn(),
  audit: vi.fn(),
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

vi.mock('@mgmt-api/lib/feed/feedFlagStatusAppDb.js', () => ({
  findFeedByPodcastIndexId: (id: number) => findByPi(id),
  findFeedByInternalId: (id: number) => findById(id),
  findFeedByUrl: (u: string) => findByUrl(u),
  listFeedFlagStatusOptions: () => listSt(),
  listFeedFlagStatusReasonOptions: () => listRe(),
  assertFlagStatusIdExists: (id: number) => assertSt(id),
  assertFlagStatusReasonIdExists: (id: number) => assertRe(id),
  FEED_FLAG_STATUS_TAKEDOWN_ID: 6,
  getFeedRowSnapshotById: (id: number) => getSnap(id),
  updateFeedFlagStatusInDb: (
    a: number,
    b: number,
    c: number | null,
    d: string | null,
    e: number | null
  ) => updateDb(a, b, c, d, e),
}));

vi.mock('@mgmt-api/lib/database/auditLog.js', () => {
  class AuditLogService {
    async record(args: unknown) {
      return audit(args);
    }
  }
  return { AuditLogService };
});

const adminIdTextByUserId: Record<number, string> = {
  1: 'pvMgtSu001',
  2: 'pvMgtAd002',
  3: 'pvMgtAd003',
  4: 'pvMgtAd004',
};

const adminAuthHeaders = (userId: number = 1): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign(
    { id: userId, id_text: adminIdTextByUserId[userId] ?? 'pvMgtSu001' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )}`,
});

describe('feed-operations routes', () => {
  beforeEach(() => {
    getWithRoleAndPermissionsMock.mockClear();
    findByPi.mockReset();
    findById.mockReset();
    findByUrl.mockReset();
    listSt.mockClear();
    listRe.mockClear();
    assertSt.mockReset();
    assertRe.mockReset();
    getSnap.mockReset();
    updateDb.mockReset();
    audit.mockReset();
    findByPi.mockImplementation(async (id: number) => (id === 55 ? sampleFeed : null));
    getSnap.mockImplementation(async (id: number) =>
      id === 9
        ? {
            id: 9,
            url: 'https://example.com/feed.xml',
            podcast_index_id: 55,
            spam_item_limit_override: null,
            feed_flag_status_id: 1,
            feed_flag_status_reason_id: null,
            feed_flag_status_reason_note: null,
          }
        : null
    );
  });

  it('GET /options returns statuses and reasons for superuser', async () => {
    const res = await request(app).get(`${opBase}/options`).set(adminAuthHeaders(1));
    expect(res.status).toBe(200);
    expect(res.body.feed_flag_statuses).toEqual([{ id: 1, status: 'active' }]);
    expect(res.body.feed_flag_status_reasons).toEqual([{ id: 1, reason: 'copyright' }]);
  });

  it('GET /options returns 403 for user without feed read', async () => {
    const res = await request(app).get(`${opBase}/options`).set(adminAuthHeaders(3));
    expect(res.status).toBe(403);
  });

  it('GET /lookup?podcast_index_id returns 200 with feed', async () => {
    const res = await request(app)
      .get(`${opBase}/lookup`)
      .query({ podcast_index_id: 55 })
      .set(adminAuthHeaders(1));
    expect(res.status).toBe(200);
    expect(res.body.feed.podcast_index_id).toBe(55);
  });

  it('GET /lookup with no param returns 400', async () => {
    const res = await request(app).get(`${opBase}/lookup`).set(adminAuthHeaders(1));
    expect(res.status).toBe(400);
  });

  it('GET /lookup returns 404 when not found', async () => {
    findByPi.mockResolvedValueOnce(null);
    const res = await request(app)
      .get(`${opBase}/lookup`)
      .query({ podcast_index_id: 99999 })
      .set(adminAuthHeaders(1));
    expect(res.status).toBe(404);
  });

  it('POST /flag-status returns 200 and audits', async () => {
    getSnap
      .mockResolvedValueOnce({
        id: 9,
        url: 'u',
        podcast_index_id: 1,
        spam_item_limit_override: null,
        feed_flag_status_id: 1,
        feed_flag_status_reason_id: null,
        feed_flag_status_reason_note: null,
      })
      .mockResolvedValueOnce({
        id: 9,
        url: 'u',
        podcast_index_id: 1,
        spam_item_limit_override: 12000,
        feed_flag_status_id: 3,
        feed_flag_status_reason_id: 1,
        feed_flag_status_reason_note: 'note',
      });
    const res = await request(app).post(`${opBase}/flag-status`).set(adminAuthHeaders(1)).send({
      feed_id: 9,
      feed_flag_status_id: 3,
      feed_flag_status_reason_id: 1,
      feed_flag_status_reason_note: 'note',
      spam_item_limit_override: 12000,
    });
    expect(res.status).toBe(200);
    expect(audit).toHaveBeenCalled();
    expect(updateDb).toHaveBeenCalledWith(9, 3, 1, 'note', 12000);
  });

  it('POST /flag-status requires reason for takedown', async () => {
    const res = await request(app)
      .post(`${opBase}/flag-status`)
      .set(adminAuthHeaders(1))
      .send({ feed_id: 9, feed_flag_status_id: 6, feed_flag_status_reason_id: null });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/takedown/i);
  });

  it('POST /flag-status returns 403 without update permission', async () => {
    getSnap.mockResolvedValue({
      id: 9,
      url: 'u',
      podcast_index_id: 1,
      spam_item_limit_override: null,
      feed_flag_status_id: 1,
      feed_flag_status_reason_id: null,
      feed_flag_status_reason_note: null,
    });
    const res = await request(app)
      .post(`${opBase}/flag-status`)
      .set(adminAuthHeaders(2))
      .send({ feed_id: 9, feed_flag_status_id: 2 });
    expect(res.status).toBe(403);
  });

  it('POST /flag-status works for read+update permission', async () => {
    getSnap
      .mockResolvedValueOnce({
        id: 9,
        url: 'u',
        podcast_index_id: 1,
        spam_item_limit_override: null,
        feed_flag_status_id: 1,
        feed_flag_status_reason_id: null,
        feed_flag_status_reason_note: null,
      })
      .mockResolvedValueOnce({
        id: 9,
        url: 'u',
        podcast_index_id: 1,
        spam_item_limit_override: null,
        feed_flag_status_id: 2,
        feed_flag_status_reason_id: null,
        feed_flag_status_reason_note: null,
      });
    const res = await request(app)
      .post(`${opBase}/flag-status`)
      .set(adminAuthHeaders(4))
      .send({ feed_id: 9, feed_flag_status_id: 2 });
    expect(res.status).toBe(200);
  });
});
