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
  max_response_body_bytes_override: null,
  lifecycle_state_key: 'active',
  lifecycle_reason: null,
  updated_source: 'admin',
  active_condition_keys: [],
  parse_allowed: true,
  public_visible: true,
  add_allowed: true,
  primary_block_reason: null,
  policy_overrides: null,
  channel_title: 'Test Show',
};

const {
  findByPi,
  findById,
  findByUrl,
  listForTable,
  listLs,
  listCt,
  listTk,
  assertTkReason,
  getSnap,
  updatePolicy,
  audit,
} = vi.hoisted(() => ({
  findByPi: vi.fn(),
  findById: vi.fn(),
  findByUrl: vi.fn(),
  listForTable: vi.fn(),
  listLs: vi.fn(async () => [{ state_key: 'active' }]),
  listCt: vi.fn(async () => [{ condition_key: 'spam_detected' }]),
  listTk: vi.fn(async () => [{ reason: 'copyright' }]),
  assertTkReason: vi.fn(async () => true),
  getSnap: vi.fn(),
  updatePolicy: vi.fn(),
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
  listFeedOperationsForTable: (args: unknown) => listForTable(args),
  listLifecycleStateOptions: () => listLs(),
  listConditionTypeOptions: () => listCt(),
  listTakedownReasonOptions: () => listTk(),
  assertTakedownReasonExists: (s: string) => assertTkReason(s),
  getFeedAuditSnapshotById: (id: number) => getSnap(id),
  updateFeedOperationsPolicyState: (
    feedId: number,
    adminId: number,
    params: Record<string, unknown>
  ) => updatePolicy(feedId, adminId, params),
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
    listForTable.mockReset();
    listForTable.mockResolvedValue({ feeds: [sampleFeed], total: 1 });
    listLs.mockClear();
    listCt.mockClear();
    listTk.mockClear();
    assertTkReason.mockReset();
    getSnap.mockReset();
    updatePolicy.mockReset();
    audit.mockReset();
    findByPi.mockImplementation(async (id: number) => (id === 55 ? sampleFeed : null));
    getSnap.mockImplementation(async (id: number) =>
      id === 9
        ? {
            id: 9,
            lifecycle_state_key: 'active',
            active_condition_keys: [],
          }
        : null
    );
  });

  it('GET /list returns feeds and pagination for superuser', async () => {
    const res = await request(app).get(`${opBase}/list`).set(adminAuthHeaders(1));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.feeds)).toBe(true);
    expect(res.body.feeds.length).toBe(1);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.pagination.page).toBe(1);
    expect(listForTable).toHaveBeenCalled();
  });

  it('GET /list returns 403 without feed read permission', async () => {
    const res = await request(app).get(`${opBase}/list`).set(adminAuthHeaders(3));
    expect(res.status).toBe(403);
  });

  it('GET /list passes sort and order to listFeedOperationsForTable', async () => {
    await request(app)
      .get(`${opBase}/list`)
      .query({ sort: 'podcast_index_id', order: 'asc', limit: 10, page: 2 })
      .set(adminAuthHeaders(1));
    expect(listForTable).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: 'podcast_index_id',
        order: 'asc',
        limit: 10,
        page: 2,
      })
    );
  });

  it('GET /list returns 400 for invalid sort key', async () => {
    const res = await request(app)
      .get(`${opBase}/list`)
      .query({ sort: 'not_a_column' })
      .set(adminAuthHeaders(1));
    expect(res.status).toBe(400);
  });

  it('GET /options returns lifecycle, condition, and takedown reason options for superuser', async () => {
    const res = await request(app).get(`${opBase}/options`).set(adminAuthHeaders(1));
    expect(res.status).toBe(200);
    expect(res.body.lifecycle_states).toEqual([{ state_key: 'active' }]);
    expect(res.body.condition_types).toEqual([{ condition_key: 'spam_detected' }]);
    expect(res.body.takedown_reasons).toEqual([{ reason: 'copyright' }]);
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
    expect(res.body.feed.lifecycle_state_key).toBe('active');
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

  it('POST /update-policy-state returns 200 and audits', async () => {
    getSnap.mockResolvedValueOnce({ id: 9, lifecycle_state_key: 'active' }).mockResolvedValueOnce({
      id: 9,
      lifecycle_state_key: 'active',
      active_condition_keys: ['spam_detected'],
    });
    findById.mockResolvedValueOnce({
      ...sampleFeed,
      active_condition_keys: ['spam_detected'],
    });
    const res = await request(app)
      .post(`${opBase}/update-policy-state`)
      .set(adminAuthHeaders(1))
      .send({
        feed_id: 9,
        active_condition_keys: ['spam_detected'],
        spam_item_limit_override: 12000,
      });
    expect(res.status).toBe(200);
    expect(audit).toHaveBeenCalled();
    expect(updatePolicy).toHaveBeenCalledWith(
      9,
      1,
      expect.objectContaining({
        activeConditionKeys: ['spam_detected'],
        spamItemLimitOverride: 12000,
      })
    );
  });

  it('POST /update-policy-state requires documentation for takedown', async () => {
    const res = await request(app)
      .post(`${opBase}/update-policy-state`)
      .set(adminAuthHeaders(1))
      .send({ feed_id: 9, lifecycle_state_key: 'takedown' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/takedown/i);
  });

  it('POST /update-policy-state returns 403 without update permission', async () => {
    getSnap.mockResolvedValue({ id: 9, lifecycle_state_key: 'active' });
    const res = await request(app)
      .post(`${opBase}/update-policy-state`)
      .set(adminAuthHeaders(2))
      .send({ feed_id: 9, lifecycle_state_key: 'pending_archive' });
    expect(res.status).toBe(403);
  });

  it('POST /update-policy-state works for read+update permission', async () => {
    getSnap
      .mockResolvedValueOnce({ id: 9, lifecycle_state_key: 'active' })
      .mockResolvedValueOnce({ id: 9, lifecycle_state_key: 'pending_archive' });
    findById.mockResolvedValueOnce({
      ...sampleFeed,
      lifecycle_state_key: 'pending_archive',
    });
    const res = await request(app)
      .post(`${opBase}/update-policy-state`)
      .set(adminAuthHeaders(4))
      .send({ feed_id: 9, lifecycle_state_key: 'pending_archive' });
    expect(res.status).toBe(200);
  });

  it('POST /update-policy-state rejects unknown lifecycle_state_key (400)', async () => {
    const res = await request(app)
      .post(`${opBase}/update-policy-state`)
      .set(adminAuthHeaders(1))
      .send({ feed_id: 9, lifecycle_state_key: 'not_a_valid_lifecycle' });
    expect(res.status).toBe(400);
  });

  it('POST /update-policy-state rejects unknown active_condition_keys entry (400) — parity 07b #12', async () => {
    const res = await request(app)
      .post(`${opBase}/update-policy-state`)
      .set(adminAuthHeaders(1))
      .send({
        feed_id: 9,
        active_condition_keys: ['not_a_valid_condition'],
      });
    expect(res.status).toBe(400);
  });

  it('POST /update-policy-state returns 400 on disallowed lifecycle transition — parity 07b #11', async () => {
    getSnap.mockResolvedValue({ id: 9, lifecycle_state_key: 'archived' });
    updatePolicy.mockRejectedValueOnce(
      new Error('Disallowed lifecycle transition: archived -> active')
    );
    const res = await request(app)
      .post(`${opBase}/update-policy-state`)
      .set(adminAuthHeaders(1))
      .send({ feed_id: 9, lifecycle_state_key: 'active' });
    expect(res.status).toBe(400);
    expect(String(res.body.message)).toMatch(/Disallowed lifecycle transition/);
  });

  it('POST /update-policy-state response.body.feed includes frozen lookup contract keys', async () => {
    getSnap.mockResolvedValue({ id: 9, lifecycle_state_key: 'active' });
    findById.mockResolvedValue({ ...sampleFeed });
    const res = await request(app)
      .post(`${opBase}/update-policy-state`)
      .set(adminAuthHeaders(1))
      .send({ feed_id: 9, spam_item_limit_override: 9000 });
    expect(res.status).toBe(200);
    const f = res.body.feed as Record<string, unknown>;
    const requiredKeys = [
      'id',
      'url',
      'podcast_index_id',
      'spam_item_limit_override',
      'max_response_body_bytes_override',
      'lifecycle_state_key',
      'lifecycle_reason',
      'updated_source',
      'active_condition_keys',
      'parse_allowed',
      'public_visible',
      'add_allowed',
      'primary_block_reason',
      'policy_overrides',
      'channel_title',
    ];
    for (const k of requiredKeys) {
      expect(f).toHaveProperty(k);
    }
    expect(typeof f.id).toBe('number');
    expect(typeof f.url).toBe('string');
    expect(Array.isArray(f.active_condition_keys)).toBe(true);
    expect(typeof f.parse_allowed).toBe('boolean');
    expect(typeof f.public_visible).toBe('boolean');
    expect(typeof f.add_allowed).toBe('boolean');
  });

  it('POST /update-policy-state passes takedown_transitional to update service', async () => {
    getSnap.mockResolvedValue({ id: 9, lifecycle_state_key: 'active' });
    findById.mockResolvedValue({ ...sampleFeed });
    assertTkReason.mockResolvedValue(true);
    const res = await request(app)
      .post(`${opBase}/update-policy-state`)
      .set(adminAuthHeaders(1))
      .send({
        feed_id: 9,
        lifecycle_state_key: 'takedown',
        lifecycle_reason_key: 'copyright',
        takedown_transitional: true,
      });
    expect(res.status).toBe(200);
    expect(updatePolicy).toHaveBeenCalledWith(
      9,
      1,
      expect.objectContaining({
        lifecycleStateKey: 'takedown',
        takedownTransitional: true,
      })
    );
  });

  it('Audit record includes admin id and request id when present', async () => {
    getSnap.mockResolvedValue({ id: 9 });
    findById.mockResolvedValue({ ...sampleFeed });
    const res = await request(app)
      .post(`${opBase}/update-policy-state`)
      .set(adminAuthHeaders(1))
      .set('X-Request-Id', 'req-feed-ops-1')
      .send({ feed_id: 9, spam_item_limit_override: 8000 });
    expect(res.status).toBe(200);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        adminAccountId: 1,
        requestId: 'req-feed-ops-1',
        beforeSnapshot: expect.any(Object),
        afterSnapshot: expect.any(Object),
      })
    );
  });
});
