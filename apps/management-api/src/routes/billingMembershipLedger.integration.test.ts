import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import { loggerService } from '@management-api/factories/loggerService.js';
import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@management-api/orm/db/appDb.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { BillingEntitlementService, bindORMContext, generateRandomIdText } from '@podverse/orm';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const accountsPath = `${config.api.prefix}${config.api.version}/billing/accounts`;
const DAY_MS = 24 * 60 * 60 * 1000;

const superuser = {
  id: 1,
  id_text: 'pvMgtSu001',
  admin_account_role_id: 1,
  admin_account_role: { role: 'superuser' },
  admin_account_credentials: { email: 'super@example.com' },
  permissions: null,
  created_at: new Date('2020-01-01T00:00:00.000Z'),
};

/** billing_account create, read, and update; no delete. */
const billingEditor = {
  id: 4,
  id_text: 'pvMgtAd004',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'billing-editor@example.com' },
  permissions: {
    feedsCrud: 0,
    feedTakedownReasonsCrud: 0,
    adminsCrud: 0,
    statsCrud: 0,
    billingPricesCrud: 0,
    bucketCrud: 0,
    embedDemoCrud: 0,
    notificationsCrud: 0,
    billingChannelsCrud: 0,
    billingProcessorProductsCrud: 0,
    billingAccountCrud: 7,
    billingWebhookEventsCrud: 0,
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
};

const { getWithRoleAndPermissionsMock, auditRecordMock } = vi.hoisted(() => ({
  getWithRoleAndPermissionsMock: vi.fn(async (id: number) => {
    if (id === 1) {
      return superuser;
    }
    if (id === 4) {
      return billingEditor;
    }
    return null;
  }),
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

vi.mock('@management-api/lib/database/auditLog.js', () => {
  class AuditLogService {
    async record(entry: unknown) {
      return auditRecordMock(entry);
    }
  }
  return { AuditLogService };
});

function bearerFor(id: number, idText: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${jwt.sign({ id, id_text: idText }, JWT_SECRET, { expiresIn: '1h' })}`,
  };
}

const superuserAuthHeaders = (): { Authorization: string } => bearerFor(1, 'pvMgtSu001');
const billingEditorAuthHeaders = (): { Authorization: string } => bearerFor(4, 'pvMgtAd004');

type GrantJson = {
  id: number;
  source: string;
  starts_at: string;
  ends_at: string;
  revoked_at: string | null;
  admin_editable: boolean;
};

describe('Billing membership ledger routes (app database)', () => {
  const createdAccountIds: number[] = [];
  const runId = Date.now();

  const query = (sql: string, params: unknown[] = []): Promise<unknown> =>
    AppDbDataSourceReadWrite.query(sql, params);

  /** An account whose status row holds `membershipExpiresAt` directly, with no grants. */
  const createAccount = async (membershipExpiresAt: Date | null): Promise<number> => {
    const accountRows = await AppDbDataSourceReadWrite.query(
      `INSERT INTO account (id_text, verified, sharable_status_id) VALUES ($1, TRUE, 1) RETURNING id`,
      [generateRandomIdText()]
    );
    const accountId = Number(accountRows[0].id);
    createdAccountIds.push(accountId);
    await query(
      `INSERT INTO account_membership_status (account_id, account_membership_id, membership_expires_at)
       VALUES ($1, 2, $2)`,
      [accountId, membershipExpiresAt]
    );
    return accountId;
  };

  /** A one-time purchase through the test processor, paid through `endsAt`. */
  const addProcessorPurchase = async (accountId: number, endsAt: Date): Promise<number> => {
    const transactionRows = await AppDbDataSourceReadWrite.query(
      `INSERT INTO billing_transaction (account_id, processor_id, external_transaction_id, purchase_kind, settled_at)
       VALUES ($1, 'test', $2, 'one_time', NOW()) RETURNING id`,
      [accountId, `ledger-${runId}-${accountId}`]
    );
    const grantRows = await AppDbDataSourceReadWrite.query(
      `INSERT INTO billing_membership_grant (account_id, source, starts_at, ends_at, billing_transaction_id)
       VALUES ($1, 'one_time_purchase', $2, $3, $4) RETURNING id`,
      [accountId, new Date(), endsAt, transactionRows[0].id]
    );
    await new BillingEntitlementService({ dataSourceReadWrite: AppDbDataSourceReadWrite }).recompute(
      accountId
    );
    return Number(grantRows[0].id);
  };

  const getAccount = async (
    accountId: number
  ): Promise<{ membership_expires_at: string | null; grants: GrantJson[] }> => {
    const res = await request(app)
      .get(`${accountsPath}/${accountId}`)
      .set(superuserAuthHeaders())
      .expect(200);
    return res.body.data;
  };

  const extend = (accountId: number, body: Record<string, unknown>) =>
    request(app).post(`${accountsPath}/${accountId}/grants`).set(superuserAuthHeaders()).send(body);

  beforeAll(async () => {
    if (!AppDbDataSourceRead.isInitialized) {
      await AppDbDataSourceRead.initialize();
    }
    if (!AppDbDataSourceReadWrite.isInitialized) {
      await AppDbDataSourceReadWrite.initialize();
    }
    bindORMContext({
      config: {
        nodeEnv: config.nodeEnv,
        database: config.appDatabase,
        log: config.log,
        defaults: { account: { settings: { locale: 'en-US' } } },
      },
      dataSourceRead: AppDbDataSourceRead,
      dataSourceReadWrite: AppDbDataSourceReadWrite,
      loggerService,
    });
  });

  afterAll(async () => {
    try {
      if (createdAccountIds.length > 0) {
        await query(`DELETE FROM account WHERE id = ANY($1)`, [createdAccountIds]);
      }
    } finally {
      await AppDbDataSourceRead.destroy();
      await AppDbDataSourceReadWrite.destroy();
    }
  });

  describe('POST /billing/accounts/:accountId/grants', () => {
    it('adopts a cached expiry no grant covers before extending, so no time is lost', async () => {
      const cachedExpiry = new Date(Date.now() + 5 * DAY_MS);
      const accountId = await createAccount(cachedExpiry);

      const res = await extend(accountId, { days: 10, note: 'Support credit' }).expect(201);

      const expected = new Date(cachedExpiry.getTime() + 10 * DAY_MS).toISOString();
      expect(res.body.data).toEqual({
        account_id: accountId,
        applied: true,
        membership_expires_at: expected,
      });
      const account = await getAccount(accountId);
      expect(account.membership_expires_at).toBe(expected);
      const sources = account.grants.map((grant) => grant.source).sort();
      expect(sources).toEqual(['admin', 'migration_baseline']);
      const baseline = account.grants.find((grant) => grant.source === 'migration_baseline');
      expect(baseline?.ends_at).toBe(cachedExpiry.toISOString());
      expect(baseline?.admin_editable).toBe(true);
      expect(auditRecordMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          operation: 'create',
          tableName: 'billing_membership_grant',
        })
      );
    });

    it('extends to an explicit end date', async () => {
      const accountId = await createAccount(null);
      const endsAt = new Date(Date.now() + 20 * DAY_MS);

      const res = await extend(accountId, { ends_at: endsAt.toISOString() }).expect(201);

      expect(res.body.data.membership_expires_at).toBe(endsAt.toISOString());
      const account = await getAccount(accountId);
      expect(account.grants).toHaveLength(1);
      expect(account.grants[0]?.source).toBe('admin');
    });

    it('accepts exactly one of cadence, days, or ends_at', async () => {
      const accountId = await createAccount(null);

      await extend(accountId, { cadence: 'monthly', days: 3 }).expect(400);
      await extend(accountId, {}).expect(400);
      await extend(accountId, { days: 0 }).expect(400);
      expect((await getAccount(accountId)).grants).toHaveLength(0);
    });

    it('answers 422 for an end date that would not lengthen access', async () => {
      const accountId = await createAccount(new Date(Date.now() + 30 * DAY_MS));

      await extend(accountId, {
        ends_at: new Date(Date.now() + 10 * DAY_MS).toISOString(),
      }).expect(422);
    });
  });

  describe('POST /billing/accounts/:accountId/membership-end', () => {
    it('cuts admin access back to the requested end', async () => {
      const accountId = await createAccount(null);
      await extend(accountId, { days: 30 }).expect(201);
      const endsAt = new Date(Date.now() + 5 * DAY_MS);

      const res = await request(app)
        .post(`${accountsPath}/${accountId}/membership-end`)
        .set(superuserAuthHeaders())
        .send({ ends_at: endsAt.toISOString(), note: 'Refunded off-platform' })
        .expect(200);

      expect(res.body.data.membership_expires_at).toBe(endsAt.toISOString());
      const account = await getAccount(accountId);
      expect(account.membership_expires_at).toBe(endsAt.toISOString());
      expect(account.grants[0]?.ends_at).toBe(endsAt.toISOString());
    });

    it('answers 409 and changes nothing while processor-paid access runs past the end', async () => {
      const accountId = await createAccount(null);
      const paidThrough = new Date(Date.now() + 30 * DAY_MS);
      await addProcessorPurchase(accountId, paidThrough);
      await extend(accountId, { days: 10 }).expect(201);
      const before = await getAccount(accountId);

      const res = await request(app)
        .post(`${accountsPath}/${accountId}/membership-end`)
        .set(superuserAuthHeaders())
        .send({ ends_at: new Date().toISOString() })
        .expect(409);

      expect(res.body.access_ends_at).toBe(paidThrough.toISOString());
      const after = await getAccount(accountId);
      expect(after.grants).toEqual(before.grants);
      expect(after.membership_expires_at).toBe(before.membership_expires_at);
    });

    it('answers 422 for an end later than current access', async () => {
      const accountId = await createAccount(new Date(Date.now() + 5 * DAY_MS));

      await request(app)
        .post(`${accountsPath}/${accountId}/membership-end`)
        .set(superuserAuthHeaders())
        .send({ ends_at: new Date(Date.now() + 10 * DAY_MS).toISOString() })
        .expect(422);
    });
  });

  describe('POST /billing/accounts/:accountId/grants/:grantId/revoke', () => {
    it('revokes an admin grant and recomputes the expiry', async () => {
      const accountId = await createAccount(null);
      await extend(accountId, { days: 10 }).expect(201);
      const [adminGrant] = (await getAccount(accountId)).grants;
      expect(adminGrant?.admin_editable).toBe(true);

      const res = await request(app)
        .post(`${accountsPath}/${accountId}/grants/${adminGrant?.id}/revoke`)
        .set(superuserAuthHeaders())
        .expect(200);

      const expiresAt = res.body.data.membership_expires_at;
      expect(expiresAt === null || new Date(expiresAt).getTime() <= Date.now()).toBe(true);
      const account = await getAccount(accountId);
      expect(account.grants[0]?.revoked_at).not.toBeNull();
    });

    it('answers 409 for a processor-paid grant and leaves it in place', async () => {
      const accountId = await createAccount(null);
      const grantId = await addProcessorPurchase(accountId, new Date(Date.now() + 30 * DAY_MS));
      const before = await getAccount(accountId);
      expect(before.grants.find((grant) => grant.id === grantId)?.admin_editable).toBe(false);

      await request(app)
        .post(`${accountsPath}/${accountId}/grants/${grantId}/revoke`)
        .set(superuserAuthHeaders())
        .send({ note: 'Should not apply' })
        .expect(409);

      const after = await getAccount(accountId);
      expect(after.grants).toEqual(before.grants);
    });

    it('answers 404 for a grant on another account', async () => {
      const ownerId = await createAccount(null);
      await extend(ownerId, { days: 3 }).expect(201);
      const [grant] = (await getAccount(ownerId)).grants;
      const otherId = await createAccount(null);

      await request(app)
        .post(`${accountsPath}/${otherId}/grants/${grant?.id}/revoke`)
        .set(superuserAuthHeaders())
        .expect(404);
    });
  });

  describe('authorization', () => {
    it('requires billing_account delete to end access or revoke a grant', async () => {
      const accountId = await createAccount(null);
      const extended = await request(app)
        .post(`${accountsPath}/${accountId}/grants`)
        .set(billingEditorAuthHeaders())
        .send({ days: 5 })
        .expect(201);
      expect(extended.body.data.applied).toBe(true);
      const [grant] = (await getAccount(accountId)).grants;

      await request(app)
        .post(`${accountsPath}/${accountId}/membership-end`)
        .set(billingEditorAuthHeaders())
        .send({ ends_at: new Date().toISOString() })
        .expect(403);
      await request(app)
        .post(`${accountsPath}/${accountId}/grants/${grant?.id}/revoke`)
        .set(billingEditorAuthHeaders())
        .expect(403);
      expect((await getAccount(accountId)).grants).toHaveLength(1);
    });
  });
});
