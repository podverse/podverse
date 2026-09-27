import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as PodverseOrm from '@podverse/orm';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const usersBase = `${config.api.prefix}${config.api.version}/users`;

/** Aligns with JWT id_text in superuserAuthHeaders / adminAuthHeaders (same pattern as admins.integration.test.ts). */
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

const {
  readQueryMock,
  readWriteQueryMock,
  hashPasswordMock,
  generateRandomIdTextMock,
  resolveProductMembershipMock,
  getWithRoleAndPermissionsMock,
} = vi.hoisted(() => {
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

  const adminNonSuperuser: MockAdmin = {
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

  return {
    readQueryMock: vi.fn(),
    readWriteQueryMock: vi.fn(),
    hashPasswordMock: vi.fn<Promise<string>, [string]>(async (p: string) => `hashed_${p}`),
    generateRandomIdTextMock: vi.fn<string, []>(() => 'abc123XYZ'),
    resolveProductMembershipMock: vi.fn(async () => ({
      freeTrialExpirationSeconds: 86400,
      premiumMembershipCostMonthly: 3,
      premiumMembershipCostAnnually: 30,
      trialAllowDirectoryAddByRSS: false,
      trialMaxAddByRSSFeeds: 10,
      trialMaxManualRefreshesPerHour: 5,
      trialTrackStats: false,
      trialAllowNotifications: true,
      premiumAllowDirectoryAddByRSS: true,
      premiumMaxAddByRSSFeeds: 100,
      premiumMaxManualRefreshesPerHour: 20,
      premiumTrackStats: true,
      premiumAllowNotifications: true,
    })),
    getWithRoleAndPermissionsMock: vi.fn<Promise<MockAdmin | null>, [number]>(
      async (id: number) => {
        if (id === 1) return superuserAdmin;
        if (id === 2) return adminNonSuperuser;
        return null;
      }
    ),
  };
});

vi.mock('@management-api/orm/db/appDb.js', () => ({
  AppDbDataSourceRead: { query: readQueryMock },
  AppDbDataSourceReadWrite: { query: readWriteQueryMock },
}));

vi.mock('@management-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async getWithRoleAndPermissions(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
  }
  return { AdminAccountService };
});

vi.mock('@management-api/lib/database/auditLog.js', () => {
  class AuditLogService {
    async record() {
      return;
    }
  }
  return { AuditLogService };
});

// Spy real @podverse/orm helpers so routes get deterministic stubs without replacing the whole package.
let hashPasswordSpy: ReturnType<typeof vi.spyOn<typeof PodverseOrm, 'hashPassword'>>;
let generateRandomIdTextSpy: ReturnType<
  typeof vi.spyOn<typeof PodverseOrm, 'generateRandomIdText'>
>;

beforeAll(() => {
  hashPasswordSpy = vi.spyOn(PodverseOrm, 'hashPassword');
  generateRandomIdTextSpy = vi.spyOn(PodverseOrm, 'generateRandomIdText');
});

const superuserAuthHeaders = (): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: 1, id_text: 'pvMgtSu001' }, JWT_SECRET, { expiresIn: '1h' })}`,
});

const adminAuthHeaders = (): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: 2, id_text: 'pvMgtAd002' }, JWT_SECRET, { expiresIn: '1h' })}`,
});

const _unauthenticatedHeaders = (): { Authorization: string } => ({
  Authorization: 'Bearer invalid-token',
});

beforeEach(() => {
  // mockClear does not drain mockResolvedValueOnce queues; reset read mocks so tests don't bleed SQL stubs.
  readQueryMock.mockReset();
  readWriteQueryMock.mockReset();
  hashPasswordMock.mockReset();
  hashPasswordMock.mockImplementation(async (p: string) => `hashed_${p}`);
  generateRandomIdTextMock.mockReset();
  generateRandomIdTextMock.mockImplementation(() => 'abc123XYZ');
  resolveProductMembershipMock.mockReset();
  resolveProductMembershipMock.mockImplementation(async () => ({
    freeTrialExpirationSeconds: 86400,
    premiumMembershipCostMonthly: 3,
    premiumMembershipCostAnnually: 30,
    trialAllowDirectoryAddByRSS: false,
    trialMaxAddByRSSFeeds: 10,
    trialMaxManualRefreshesPerHour: 5,
    trialTrackStats: false,
    trialAllowNotifications: true,
    premiumAllowDirectoryAddByRSS: true,
    premiumMaxAddByRSSFeeds: 100,
    premiumMaxManualRefreshesPerHour: 20,
    premiumTrackStats: true,
    premiumAllowNotifications: true,
  }));
  hashPasswordSpy.mockImplementation((p: string) => hashPasswordMock(p));
  generateRandomIdTextSpy.mockImplementation(() => generateRandomIdTextMock());
  vi.spyOn(
    PodverseOrm.BillingPriceCatalogService.prototype,
    'resolveProductMembership'
  ).mockImplementation(() => resolveProductMembershipMock());
  mockMembershipLedger();
});

/**
 * The app DB is mocked in this file, so the grant ledger is stubbed at the service boundary; the
 * ledger's own behavior runs against the real test database in billing.integration.test.ts.
 */
const ledger = PodverseOrm.BillingMembershipExtensionService.prototype;

function mockMembershipLedger(): void {
  const extendResult = { applied: true, membershipExpiresAt: null };
  const changeResult = { membershipExpiresAt: null };
  vi.spyOn(ledger, 'startTrial').mockReset().mockResolvedValue(undefined);
  vi.spyOn(ledger, 'extendByCadence').mockReset().mockResolvedValue(extendResult);
  vi.spyOn(ledger, 'extendToDate').mockReset().mockResolvedValue(extendResult);
  vi.spyOn(ledger, 'recordPastExpiry').mockReset().mockResolvedValue(changeResult);
  vi.spyOn(ledger, 'endAccess').mockReset().mockResolvedValue(changeResult);
  vi.spyOn(ledger, 'setAccountMembership').mockReset().mockResolvedValue(changeResult);
}

function expectNoLedgerWrites(): void {
  expect(ledger.startTrial).not.toHaveBeenCalled();
  expect(ledger.extendByCadence).not.toHaveBeenCalled();
  expect(ledger.extendToDate).not.toHaveBeenCalled();
  expect(ledger.recordPastExpiry).not.toHaveBeenCalled();
  expect(ledger.endAccess).not.toHaveBeenCalled();
  expect(ledger.setAccountMembership).not.toHaveBeenCalled();
}

describe('GET /users', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(usersBase);
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-superuser', async () => {
    readQueryMock.mockResolvedValueOnce([{ total: 0 }]);
    const res = await request(app).get(usersBase).set(adminAuthHeaders());
    expect(res.status).toBe(403);
  });

  it('returns paginated users for superuser', async () => {
    readQueryMock.mockResolvedValueOnce([{ total: 2 }]); // count query
    readQueryMock.mockResolvedValueOnce([
      {
        id: 1,
        id_text: 'abc123',
        verified: true,
        sharable_status_id: 3,
        created_at: new Date('2025-01-01'),
        email: 'user1@example.com',
        username: 'user1',
      },
      {
        id: 2,
        id_text: 'def456',
        verified: false,
        sharable_status_id: 3,
        created_at: new Date('2025-02-01'),
        email: null,
        username: 'user2',
      },
    ]);

    const res = await request(app).get(usersBase).set(superuserAuthHeaders());

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    expect(res.body.users[0].email).toBe('user1@example.com');
    expect(res.body.users[1].username).toBe('user2');
    expect(res.body.pagination).toEqual({ page: 1, limit: 25, total: 2, totalPages: 1 });
  });

  it('supports search query parameter', async () => {
    readQueryMock.mockResolvedValueOnce([{ total: 1 }]);
    readQueryMock.mockResolvedValueOnce([
      {
        id: 1,
        id_text: 'abc123',
        verified: true,
        sharable_status_id: 3,
        created_at: new Date(),
        email: 'found@example.com',
        username: null,
      },
    ]);

    const res = await request(app).get(`${usersBase}?search=found`).set(superuserAuthHeaders());

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
  });
});

describe('GET /users/:id', () => {
  it('returns user by id', async () => {
    readQueryMock.mockResolvedValueOnce([
      {
        id: 1,
        id_text: 'abc123',
        verified: true,
        sharable_status_id: 3,
        created_at: new Date('2025-01-01'),
        email: 'user1@example.com',
        username: 'user1',
      },
    ]);

    const res = await request(app).get(`${usersBase}/1`).set(superuserAuthHeaders());

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('user1@example.com');
    expect(res.body.user.username).toBe('user1');
  });

  it('returns 404 for non-existent user', async () => {
    readQueryMock.mockResolvedValueOnce([]);

    const res = await request(app).get(`${usersBase}/99999`).set(superuserAuthHeaders());

    expect(res.status).toBe(404);
  });
});

describe('PATCH /users/:id', () => {
  it('updates user email and username', async () => {
    readQueryMock.mockResolvedValueOnce([{ id: 1 }]); // existence check
    readQueryMock.mockResolvedValueOnce([
      { account_membership_id: 1, membership_expires_at: null },
    ]); // membership status
    readQueryMock.mockResolvedValueOnce([]); // duplicate check
    readWriteQueryMock.mockResolvedValueOnce(undefined); // update account
    readWriteQueryMock.mockResolvedValueOnce(undefined); // update credentials
    readQueryMock.mockResolvedValueOnce([
      {
        id: 1,
        id_text: 'abc123',
        verified: true,
        sharable_status_id: 3,
        created_at: new Date(),
        email: 'new@example.com',
        username: 'newname',
      },
    ]);

    const res = await request(app)
      .patch(`${usersBase}/1`)
      .set(superuserAuthHeaders())
      .send({ email: 'new@example.com', username: 'newname' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('new@example.com');
  });

  it('returns 409 for duplicate email', async () => {
    readQueryMock.mockResolvedValueOnce([{ id: 1 }]); // existence check
    readQueryMock.mockResolvedValueOnce([
      { account_membership_id: 1, membership_expires_at: null },
    ]); // membership status
    readQueryMock.mockResolvedValueOnce([{ id: 2 }]); // duplicate check

    const res = await request(app)
      .patch(`${usersBase}/1`)
      .set(superuserAuthHeaders())
      .send({ email: 'taken@example.com' });

    expect(res.status).toBe(409);
  });

  it('returns 404 for non-existent user', async () => {
    readQueryMock.mockResolvedValueOnce([]); // existence check

    const res = await request(app)
      .patch(`${usersBase}/99999`)
      .set(superuserAuthHeaders())
      .send({ email: 'x@example.com' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /users/:id', () => {
  it('deletes a user', async () => {
    readQueryMock.mockResolvedValueOnce([{ id: 1 }]);
    readWriteQueryMock.mockResolvedValueOnce(undefined);

    const res = await request(app).delete(`${usersBase}/1`).set(superuserAuthHeaders());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User deleted');
  });

  it('returns 404 for non-existent user', async () => {
    readQueryMock.mockResolvedValueOnce([]);

    const res = await request(app).delete(`${usersBase}/99999`).set(superuserAuthHeaders());

    expect(res.status).toBe(404);
  });
});

describe('POST /users/:id/password', () => {
  it('sets user password', async () => {
    readQueryMock.mockResolvedValueOnce([{ id: 1 }]);
    hashPasswordMock.mockResolvedValueOnce('hashed_newpass');
    readWriteQueryMock.mockResolvedValueOnce(undefined); // update credentials
    readWriteQueryMock.mockResolvedValueOnce(undefined); // delete set-password

    const res = await request(app)
      .post(`${usersBase}/1/password`)
      .set(superuserAuthHeaders())
      .send({ password: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password updated');
  });

  it('returns 400 for invalid password', async () => {
    const res = await request(app)
      .post(`${usersBase}/1/password`)
      .set(superuserAuthHeaders())
      .send({ password: 'short' });

    expect(res.status).toBe(400);
  });
});

describe('Invite link endpoints', () => {
  describe('GET /users/:id/invite-link', () => {
    it('returns null when no invite link exists', async () => {
      readQueryMock.mockResolvedValueOnce([]);

      const res = await request(app).get(`${usersBase}/1/invite-link`).set(superuserAuthHeaders());

      expect(res.status).toBe(200);
      expect(res.body.invite_link).toBeNull();
    });

    it('returns active invite link', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      readQueryMock.mockResolvedValueOnce([
        { set_password_token: 'test-token', set_password_token_expires_at: futureDate },
      ]);

      const res = await request(app).get(`${usersBase}/1/invite-link`).set(superuserAuthHeaders());

      expect(res.status).toBe(200);
      expect(res.body.invite_link).not.toBeNull();
      expect(res.body.invite_link.url).toContain('test-token');
      expect(res.body.invite_link.is_expired).toBe(false);
    });

    it('returns null for expired invite link', async () => {
      const pastDate = new Date(Date.now() - 1000);
      readQueryMock.mockResolvedValueOnce([
        { set_password_token: 'expired-token', set_password_token_expires_at: pastDate },
      ]);

      const res = await request(app).get(`${usersBase}/1/invite-link`).set(superuserAuthHeaders());

      expect(res.status).toBe(200);
      expect(res.body.invite_link).toBeNull();
    });
  });

  describe('POST /users/:id/invite-link', () => {
    it('generates a new invite link', async () => {
      readQueryMock.mockResolvedValueOnce([{ id: 1 }]); // existence check
      readWriteQueryMock.mockResolvedValueOnce(undefined); // upsert

      const res = await request(app).post(`${usersBase}/1/invite-link`).set(superuserAuthHeaders());

      expect(res.status).toBe(201);
      expect(res.body.invite_link.url).toBeDefined();
      expect(res.body.invite_link.is_expired).toBe(false);
    });

    it('returns 404 for non-existent user', async () => {
      readQueryMock.mockResolvedValueOnce([]);

      const res = await request(app)
        .post(`${usersBase}/99999/invite-link`)
        .set(superuserAuthHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /users/:id/invite-link', () => {
    it('revokes invite link', async () => {
      readWriteQueryMock.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .delete(`${usersBase}/1/invite-link`)
        .set(superuserAuthHeaders());

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Invite link revoked');
    });
  });
});

describe('Authz: non-superuser cannot access user endpoints', () => {
  it('rejects list for non-superuser', async () => {
    const res = await request(app).get(usersBase).set(adminAuthHeaders());
    expect(res.status).toBe(403);
  });

  it('rejects get for non-superuser', async () => {
    const res = await request(app).get(`${usersBase}/1`).set(adminAuthHeaders());
    expect(res.status).toBe(403);
  });

  it('rejects delete for non-superuser', async () => {
    const res = await request(app).delete(`${usersBase}/1`).set(adminAuthHeaders());
    expect(res.status).toBe(403);
  });
});

describe('POST /users', () => {
  const ORIGINAL_SIGNUP_MODE = process.env.ACCOUNT_SIGNUP_MODE;

  beforeEach(() => {
    process.env.ACCOUNT_SIGNUP_MODE = 'admin_only_email';
  });

  afterEach(() => {
    if (ORIGINAL_SIGNUP_MODE === undefined) {
      delete process.env.ACCOUNT_SIGNUP_MODE;
    } else {
      process.env.ACCOUNT_SIGNUP_MODE = ORIGINAL_SIGNUP_MODE;
    }
  });

  // Mocks the full insert sequence: existence check (read), then 8 inserts
  // (account, credentials, profile, settings, settings_locale, settings_notification,
  // membership_status, metaboost). When no password is provided and the mode allows
  // invite links, a 9th insert (account_set_password upsert) is also issued.
  const mockCreateUserSqlSequence = (opts: { withSetPassword: boolean }) => {
    readQueryMock.mockResolvedValueOnce([]); // existence check returns empty
    readWriteQueryMock.mockResolvedValueOnce([{ id: 42 }]); // account insert returns id
    readWriteQueryMock.mockResolvedValueOnce(undefined); // credentials
    readWriteQueryMock.mockResolvedValueOnce(undefined); // profile
    readWriteQueryMock.mockResolvedValueOnce([{ id: 100 }]); // settings returns id
    readWriteQueryMock.mockResolvedValueOnce(undefined); // settings_locale
    readWriteQueryMock.mockResolvedValueOnce(undefined); // settings_notification
    readWriteQueryMock.mockResolvedValueOnce(undefined); // membership_status
    readWriteQueryMock.mockResolvedValueOnce(undefined); // metaboost
    if (opts.withSetPassword) {
      readWriteQueryMock.mockResolvedValueOnce(undefined); // set_password upsert
    }
  };

  it('returns 401 without authentication', async () => {
    const res = await request(app).post(usersBase).send({ username: 'foo' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-superuser', async () => {
    const res = await request(app)
      .post(usersBase)
      .set(adminAuthHeaders())
      .send({ username: 'foo' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when neither username nor email provided', async () => {
    const res = await request(app)
      .post(usersBase)
      .set(superuserAuthHeaders())
      .send({ password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('At least one of username or email is required');
  });

  it('creates a username-only user without password in admin_only_email mode and returns set_password_url', async () => {
    mockCreateUserSqlSequence({ withSetPassword: true });

    const res = await request(app)
      .post(usersBase)
      .set(superuserAuthHeaders())
      .send({ username: 'username_only' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User created. Invite link generated.');
    expect(typeof res.body.set_password_url).toBe('string');
    expect(res.body.set_password_url).toContain('/set-password?token=');
  });

  it('creates an email-only user without password in admin_only_email mode and returns set_password_url', async () => {
    mockCreateUserSqlSequence({ withSetPassword: true });

    const res = await request(app)
      .post(usersBase)
      .set(superuserAuthHeaders())
      .send({ email: 'email_only@example.com' });

    expect(res.status).toBe(201);
    expect(typeof res.body.set_password_url).toBe('string');
  });

  it('creates a user with both username and email plus password and skips invite link', async () => {
    mockCreateUserSqlSequence({ withSetPassword: false });

    const res = await request(app).post(usersBase).set(superuserAuthHeaders()).send({
      username: 'both_user',
      email: 'both@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User created successfully');
    expect(res.body.set_password_url).toBeUndefined();
  });

  it('uses product membership defaults trial duration when membership_expires_at is omitted', async () => {
    resolveProductMembershipMock.mockResolvedValueOnce({
      freeTrialExpirationSeconds: 120,
      premiumMembershipCostMonthly: 3,
      premiumMembershipCostAnnually: 30,
      trialAllowDirectoryAddByRSS: false,
      trialMaxAddByRSSFeeds: 10,
      trialMaxManualRefreshesPerHour: 5,
      trialTrackStats: false,
      trialAllowNotifications: true,
      premiumAllowDirectoryAddByRSS: true,
      premiumMaxAddByRSSFeeds: 100,
      premiumMaxManualRefreshesPerHour: 20,
      premiumTrackStats: true,
      premiumAllowNotifications: true,
    });
    mockCreateUserSqlSequence({ withSetPassword: true });

    const res = await request(app)
      .post(usersBase)
      .set(superuserAuthHeaders())
      .send({ username: 'trial_defaults_user' });

    expect(res.status).toBe(201);
    const membershipInsertCall = readWriteQueryMock.mock.calls[6];
    expect(membershipInsertCall?.[0]).toContain('INSERT INTO account_membership_status');
    expect(membershipInsertCall?.[0]).toContain('VALUES ($1, $2, NULL,');
    expect(membershipInsertCall?.[1]).toEqual([42, 1, null, null, null, null, null]);
    expect(ledger.startTrial).toHaveBeenCalledTimes(1);
    expect(ledger.startTrial).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 42, trialSeconds: 120 })
    );
    expect(ledger.extendByCadence).not.toHaveBeenCalled();
  });

  it('grants one Premium period through the ledger when Premium has no explicit expiry', async () => {
    mockCreateUserSqlSequence({ withSetPassword: false });

    const res = await request(app).post(usersBase).set(superuserAuthHeaders()).send({
      username: 'premium_user',
      password: 'password123',
      account_membership_id: 2,
      premium_billing_cadence: 'monthly',
    });

    expect(res.status).toBe(201);
    expect(readWriteQueryMock.mock.calls[6]?.[1]?.[1]).toBe(2);
    expect(ledger.extendByCadence).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 42,
        cadence: 'monthly',
        idempotencyKey: 'management_create:42',
        source: 'admin',
        accountMembershipId: 2,
      })
    );
    expect(ledger.startTrial).not.toHaveBeenCalled();
  });

  it('grants access to an explicit future expiry through the ledger', async () => {
    mockCreateUserSqlSequence({ withSetPassword: false });
    const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    const res = await request(app).post(usersBase).set(superuserAuthHeaders()).send({
      username: 'dated_user',
      password: 'password123',
      account_membership_id: 2,
      membership_expires_at: expiresAt.toISOString(),
    });

    expect(res.status).toBe(201);
    expect(ledger.extendToDate).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 42,
        expiresAt,
        idempotencyKey: 'management_create:42',
        source: 'admin',
        accountMembershipId: 2,
      })
    );
  });

  it('records an explicit past expiry as a lapse date without granting access', async () => {
    mockCreateUserSqlSequence({ withSetPassword: false });
    const expiresAt = new Date('2024-01-01T00:00:00.000Z');

    const res = await request(app).post(usersBase).set(superuserAuthHeaders()).send({
      username: 'lapsed_user',
      password: 'password123',
      membership_expires_at: expiresAt.toISOString(),
    });

    expect(res.status).toBe(201);
    expect(ledger.recordPastExpiry).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 42, expiresAt })
    );
    expect(ledger.extendToDate).not.toHaveBeenCalled();
    expect(ledger.startTrial).not.toHaveBeenCalled();
  });
});

describe('PATCH /users/:id membership expiry', () => {
  const currentExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const mockPatchSqlSequence = () => {
    readQueryMock.mockResolvedValueOnce([{ id: 1 }]); // existence check
    readQueryMock.mockResolvedValueOnce([
      { account_membership_id: 2, membership_expires_at: currentExpiry },
    ]); // membership status
    readQueryMock.mockResolvedValueOnce([
      {
        id: 1,
        id_text: 'abc123',
        verified: true,
        sharable_status_id: 3,
        created_at: new Date(),
        email: 'user@example.com',
        username: 'user',
        account_membership_id: 2,
        membership_expires_at: currentExpiry,
      },
    ]); // updated user
  };

  it('ends access at an earlier requested date', async () => {
    mockPatchSqlSequence();
    const requested = new Date(currentExpiry.getTime() - 10 * 24 * 60 * 60 * 1000);

    const res = await request(app)
      .patch(`${usersBase}/1`)
      .set(superuserAuthHeaders())
      .send({ membership_expires_at: requested.toISOString() });

    expect(res.status).toBe(200);
    expect(ledger.endAccess).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 1, endsAt: requested })
    );
    expect(ledger.extendToDate).not.toHaveBeenCalled();
    expect(readWriteQueryMock).not.toHaveBeenCalled();
  });

  it('ends access now when the expiry is cleared', async () => {
    mockPatchSqlSequence();
    const before = Date.now();

    const res = await request(app)
      .patch(`${usersBase}/1`)
      .set(superuserAuthHeaders())
      .send({ membership_expires_at: null });

    expect(res.status).toBe(200);
    expect(ledger.endAccess).toHaveBeenCalledTimes(1);
    const endsAt = vi.mocked(ledger.endAccess).mock.calls[0]?.[0].endsAt;
    expect(endsAt?.getTime()).toBeGreaterThanOrEqual(before);
    expect(endsAt?.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('extends to a later requested date, keyed on the expiry it extends from', async () => {
    mockPatchSqlSequence();
    const requested = new Date(currentExpiry.getTime() + 10 * 24 * 60 * 60 * 1000);

    const res = await request(app)
      .patch(`${usersBase}/1`)
      .set(superuserAuthHeaders())
      .send({ membership_expires_at: requested.toISOString() });

    expect(res.status).toBe(200);
    expect(ledger.extendToDate).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 1,
        expiresAt: requested,
        idempotencyKey: `management_admin:1:${currentExpiry.toISOString()}:${requested.toISOString()}`,
        accountMembershipId: 2,
      })
    );
    expect(ledger.endAccess).not.toHaveBeenCalled();
    expect(ledger.setAccountMembership).not.toHaveBeenCalled();
  });

  it('leaves access alone when the form resends the current expiry at minute precision', async () => {
    mockPatchSqlSequence();
    const resent = new Date(currentExpiry);
    resent.setSeconds(0, 0);

    const res = await request(app)
      .patch(`${usersBase}/1`)
      .set(superuserAuthHeaders())
      .send({ membership_expires_at: resent.toISOString() });

    expect(res.status).toBe(200);
    expectNoLedgerWrites();
  });

  it('moves the tier through the ledger when only the tier changes', async () => {
    mockPatchSqlSequence();

    const res = await request(app)
      .patch(`${usersBase}/1`)
      .set(superuserAuthHeaders())
      .send({ account_membership_id: 1 });

    expect(res.status).toBe(200);
    expect(ledger.setAccountMembership).toHaveBeenCalledWith({
      accountId: 1,
      accountMembershipId: 1,
    });
    expect(ledger.endAccess).not.toHaveBeenCalled();
  });

  it('returns 409 with the protected end and writes nothing else when paid access runs past', async () => {
    readQueryMock.mockResolvedValueOnce([{ id: 1 }]);
    readQueryMock.mockResolvedValueOnce([
      { account_membership_id: 2, membership_expires_at: currentExpiry },
    ]);
    vi.mocked(ledger.endAccess).mockRejectedValueOnce(
      new PodverseOrm.ProtectedMembershipAccessError(currentExpiry)
    );

    const res = await request(app)
      .patch(`${usersBase}/1`)
      .set(superuserAuthHeaders())
      .send({ membership_expires_at: null, track_stats: true, verified: false });

    expect(res.status).toBe(409);
    expect(res.body.access_ends_at).toBe(currentExpiry.toISOString());
    expect(readWriteQueryMock).not.toHaveBeenCalled();
  });
});
