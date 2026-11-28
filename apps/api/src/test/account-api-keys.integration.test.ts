import { randomUUID } from 'node:crypto';

import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ApiKeyPermissions } from '@podverse/helpers';
import {
  API_KEY_MAX_PER_ACCOUNT,
  API_KEY_RESOURCES,
  API_KEY_TOKEN_HINT_LENGTH,
  apiKeyPermissionsForPreset,
  APP_ROUTES,
  COOKIE_WRITE_INTENT_HEADER,
  COOKIE_WRITE_INTENT_VALUE,
  CRUD_BITS,
  emptyApiKeyPermissions,
  isApiKeyTokenFormat,
  ONE_DAY_MS,
  ONE_MINUTE_MS,
  sha256Hex,
} from '@podverse/helpers';
import type { Account, ORMContext } from '@podverse/orm';

import { getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
  };
});

const TEST_PASSWORD = 'IntegrationTest1!';
const NEW_PASSWORD = 'ChangedPass1!';
const API_KEY_DTO_KEYS = [
  'created_at',
  'expires_at',
  'id_text',
  'last_used_at',
  'name',
  'permissions',
  'token_hint',
];
const EMPTY_PERMISSIONS_BODY = {
  message: 'Grant at least one permission.',
  code: 'api_key_permissions_empty',
};
const LIMIT_REACHED_BODY = {
  message: 'This account already has the most API keys allowed. Revoke one first.',
  code: 'api_key_limit_reached',
};
const NOT_ALLOWED_BODY = {
  message: 'API keys cannot be used for this endpoint.',
  code: 'api_key_not_allowed',
};
const INVALID_KEY_BODY = { message: 'Invalid API key', code: 'api_key_invalid' };
const KEY_NOT_FOUND_BODY = { message: 'API key not found' };
const UNAUTHORIZED_BODY = { message: 'Unauthorized' };

type TestAccount = { id: number; email: string; account: Account };

type ApiKeyDto = {
  id_text: string;
  name: string;
  token_hint: string;
  permissions: ApiKeyPermissions;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
};

type CreatedKey = { apiKey: ApiKeyDto; token: string };

type CreatePayload = {
  name?: string;
  permissions: Partial<ApiKeyPermissions>;
  expires_in_days?: number | null;
};

type RequestAuth = { cookie?: string; bearer?: string };

function accountReadPermissions(): ApiKeyPermissions {
  return { ...emptyApiKeyPermissions(), account: CRUD_BITS.read };
}

function createPayload(input: CreatePayload): CreatePayload {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    permissions: input.permissions,
    ...(input.expires_in_days !== undefined ? { expires_in_days: input.expires_in_days } : {}),
  };
}

function readText(row: object, key: string): string {
  const value: unknown = Reflect.get(row, key);
  if (typeof value !== 'string') {
    throw new Error(`API key ${key} is not text`);
  }
  return value;
}

function readNullableText(row: object, key: string): string | null {
  const value: unknown = Reflect.get(row, key);
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  throw new Error(`API key ${key} is not text`);
}

function readPermissions(value: unknown): ApiKeyPermissions {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('API key permissions are not an object');
  }
  expect(Object.keys(value).sort()).toEqual([...API_KEY_RESOURCES].sort());
  const permissions = emptyApiKeyPermissions();
  for (const resource of API_KEY_RESOURCES) {
    const mask: unknown = Reflect.get(value, resource);
    if (typeof mask !== 'number' || !Number.isInteger(mask)) {
      throw new Error(`API key permission ${resource} is not an integer`);
    }
    permissions[resource] = mask;
  }
  return permissions;
}

function readApiKeyDto(value: unknown): ApiKeyDto {
  if (typeof value !== 'object' || value === null) {
    throw new Error('API key DTO is not an object');
  }
  expect(Object.keys(value).sort()).toEqual(API_KEY_DTO_KEYS);
  const createdAt = readText(value, 'created_at');
  expect(Number.isNaN(Date.parse(createdAt))).toBe(false);
  const expiresAt = readNullableText(value, 'expires_at');
  if (expiresAt !== null) {
    expect(Number.isNaN(Date.parse(expiresAt))).toBe(false);
  }
  const lastUsedAt = readNullableText(value, 'last_used_at');
  if (lastUsedAt !== null) {
    expect(Number.isNaN(Date.parse(lastUsedAt))).toBe(false);
  }
  return {
    id_text: readText(value, 'id_text'),
    name: readText(value, 'name'),
    token_hint: readText(value, 'token_hint'),
    permissions: readPermissions(Reflect.get(value, 'permissions')),
    created_at: createdAt,
    expires_at: expiresAt,
    last_used_at: lastUsedAt,
  };
}

function readCreated(body: unknown): CreatedKey {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Create response is not an object');
  }
  expect(Object.keys(body).sort()).toEqual(['api_key', 'token']);
  const token = Reflect.get(body, 'token');
  if (typeof token !== 'string') {
    throw new Error('Create response token is not text');
  }
  return { apiKey: readApiKeyDto(Reflect.get(body, 'api_key')), token };
}

function readApiKeyList(body: unknown): ApiKeyDto[] {
  if (typeof body !== 'object' || body === null) {
    throw new Error('API key list is not an object');
  }
  expect(Object.keys(body).sort()).toEqual(['rows']);
  const rows: unknown = Reflect.get(body, 'rows');
  if (!Array.isArray(rows)) {
    throw new Error('API key list rows is not an array');
  }
  return rows.map((row) => readApiKeyDto(row));
}

function expectTokenShape(token: string, apiKey: ApiKeyDto): void {
  expect(isApiKeyTokenFormat(token)).toBe(true);
  expect(apiKey.token_hint).toBe(token.slice(-API_KEY_TOKEN_HINT_LENGTH));
}

function expectAboutDaysOut(expiresAt: string | null, days: number): void {
  expect(expiresAt).not.toBeNull();
  if (expiresAt === null) {
    return;
  }
  const delta = Date.parse(expiresAt) - Date.now();
  expect(Math.abs(delta - days * ONE_DAY_MS)).toBeLessThan(2 * ONE_MINUTE_MS);
}

function setCookies(res: request.Response): string[] {
  const header: unknown = res.headers['set-cookie'];
  if (Array.isArray(header)) {
    return header.filter((value): value is string => typeof value === 'string');
  }
  return typeof header === 'string' ? [header] : [];
}

function jwtCookieValue(res: request.Response): string | null {
  const cookie = setCookies(res).find((value) => value.startsWith('jwt='));
  if (cookie === undefined) {
    return null;
  }
  return cookie.slice('jwt='.length).split(';')[0] ?? '';
}

function withAuth(pending: request.Test, auth?: RequestAuth): request.Test {
  if (auth?.cookie !== undefined) {
    pending.set('Cookie', auth.cookie);
    pending.set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE);
  }
  if (auth?.bearer !== undefined) {
    pending.set('Authorization', `Bearer ${auth.bearer}`);
  }
  return pending;
}

describe('account API key create, list, and revoke (real session store)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let authBase: string;
  let accountBase: string;
  let termsVersion = '';
  let accountCounter = 0;

  beforeAll(async () => {
    const started = await startTestApp({ accountSessions: 'real' });
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for account API key integration test');
    }
    const apiBase = await getBaseApiUrl();
    authBase = `${apiBase}/auth`;
    accountBase = `${apiBase}/account`;
    const { config } = await import('../config/index.js');
    termsVersion = config.terms.version;
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  async function query(sql: string, parameters: unknown[]): Promise<unknown[]> {
    if (!ormContext) {
      throw new Error('ORM context required');
    }
    const result: unknown = await ormContext.dataSourceReadWrite.query(sql, parameters);
    return Array.isArray(result) ? result : [];
  }

  async function scalarCount(sql: string, parameters: unknown[]): Promise<number> {
    const [row] = await query(sql, parameters);
    const count: unknown = typeof row === 'object' && row !== null ? Reflect.get(row, 'count') : 0;
    if (typeof count === 'number' && Number.isInteger(count)) {
      return count;
    }
    if (typeof count === 'string' && /^\d+$/.test(count)) {
      return Number(count);
    }
    throw new Error('Count is not an integer');
  }

  async function createVerifiedAccount(): Promise<TestAccount> {
    const { AccountService } = await import('@podverse/orm');
    accountCounter += 1;
    const email = `account-api-keys-${Date.now()}-${accountCounter}@example.com`;
    const accountService = new AccountService();
    await accountService.create({
      email,
      password: TEST_PASSWORD,
      locale: 'en-US',
      terms_version: termsVersion === '' ? '2026-10-15' : termsVersion,
    });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error('Failed to load account after create');
    }
    await accountService.verifyEmail(account.id);
    return { id: account.id, email, account };
  }

  async function webLoginCookie(account: TestAccount): Promise<string> {
    const res = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    const token = jwtCookieValue(res);
    if (token === null || token === '') {
      throw new Error('Login set no jwt cookie');
    }
    return `jwt=${token}`;
  }

  function postCreate(body: CreatePayload, auth?: RequestAuth): request.Test {
    return withAuth(request(app).post(`${authBase}/api-keys`).send(createPayload(body)), auth);
  }

  function getKeys(auth?: RequestAuth): request.Test {
    return withAuth(request(app).get(`${authBase}/api-keys`), auth);
  }

  function deleteKey(apiKeyIdText: string, auth?: RequestAuth): request.Test {
    return withAuth(request(app).delete(`${authBase}/api-keys/${apiKeyIdText}`), auth);
  }

  async function createAccountReadKey(cookie: string, name = 'Account read'): Promise<CreatedKey> {
    const res = await postCreate({ name, permissions: { account: CRUD_BITS.read } }, { cookie });
    expect(res.status).toBe(201);
    return readCreated(res.body);
  }

  async function expectStoredHash(idText: string, token: string): Promise<void> {
    const [row] = await query(
      `SELECT token_hash, token_hint, name, id_text, permissions::text AS permissions
         FROM account_api_key
        WHERE id_text = $1`,
      [idText]
    );
    if (typeof row !== 'object' || row === null) {
      throw new Error('API key row is missing');
    }
    const tokenHash = readText(row, 'token_hash');
    expect(tokenHash).toBe(sha256Hex(token));
    expect(tokenHash).not.toBe(token);
    for (const key of ['token_hash', 'token_hint', 'name', 'id_text', 'permissions']) {
      expect(readText(row, key).includes(token)).toBe(false);
    }
  }

  async function expectKeyStillWorks(created: CreatedKey): Promise<void> {
    const me = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${created.token}`);
    expect(me.status).toBe(200);
    expect(
      await scalarCount(`SELECT count(*)::int AS count FROM account_api_key WHERE id_text = $1`, [
        created.apiKey.id_text,
      ])
    ).toBe(1);
  }

  async function lapseMembership(account: TestAccount): Promise<void> {
    await query(
      `UPDATE billing_membership_grant
          SET revoked_at = now()
        WHERE account_id = $1 AND revoked_at IS NULL`,
      [account.id]
    );
    await query(
      `UPDATE account_membership_status
          SET membership_expires_at = now() - interval '1 day'
        WHERE account_id = $1`,
      [account.id]
    );
  }

  async function insertResetToken(account: Account): Promise<string> {
    const { AccountResetPasswordService } = await import('@podverse/orm');
    const token = randomUUID();
    await new AccountResetPasswordService().update(account, {
      reset_token: token,
      reset_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
    });
    return token;
  }

  it('returns the token once, stores its hash, and sets expiry', async () => {
    const account = await createVerifiedAccount();
    const cookie = await webLoginCookie(account);
    const res = await postCreate(
      { name: 'Default expiry', permissions: { account: CRUD_BITS.read } },
      { cookie }
    );

    expect(res.status).toBe(201);
    const created = readCreated(res.body);
    expect(created.apiKey.name).toBe('Default expiry');
    expect(created.apiKey.permissions).toEqual(accountReadPermissions());
    expect(created.apiKey.last_used_at).toBeNull();
    expectTokenShape(created.token, created.apiKey);
    expectAboutDaysOut(created.apiKey.expires_at, 90);
    await expectStoredHash(created.apiKey.id_text, created.token);

    const me = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${created.token}`);
    expect(me.status).toBe(200);

    const never = await postCreate(
      {
        name: 'No expiry',
        permissions: { account: CRUD_BITS.read },
        expires_in_days: null,
      },
      { cookie }
    );
    expect(never.status).toBe(201);
    const noExpiry = readCreated(never.body);
    expect(noExpiry.apiKey.expires_at).toBeNull();
    expectTokenShape(noExpiry.token, noExpiry.apiKey);

    const thirty = await postCreate(
      {
        name: 'Thirty days',
        permissions: { account: CRUD_BITS.read },
        expires_in_days: 30,
      },
      { cookie }
    );
    expect(thirty.status).toBe(201);
    const shortLived = readCreated(thirty.body);
    expectAboutDaysOut(shortLived.apiKey.expires_at, 30);
    expectTokenShape(shortLived.token, shortLived.apiKey);
  });

  it('lists keys newest first, with last use empty until the key calls GET /auth/me', async () => {
    const account = await createVerifiedAccount();
    const cookie = await webLoginCookie(account);
    const older = await createAccountReadKey(cookie, 'Older');
    const newer = await createAccountReadKey(cookie, 'Newer');

    const beforeRes = await getKeys({ cookie });
    expect(beforeRes.status).toBe(200);
    const before = readApiKeyList(beforeRes.body);
    expect(before.map((row) => row.id_text)).toEqual([newer.apiKey.id_text, older.apiKey.id_text]);
    expect(before.every((row) => row.last_used_at === null)).toBe(true);

    const me = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${newer.token}`);
    expect(me.status).toBe(200);

    const afterRes = await getKeys({ cookie });
    expect(afterRes.status).toBe(200);
    const after = readApiKeyList(afterRes.body);
    const used = after.find((row) => row.id_text === newer.apiKey.id_text);
    const unused = after.find((row) => row.id_text === older.apiKey.id_text);
    if (used === undefined || unused === undefined) {
      throw new Error('Listed keys are missing');
    }
    expect(unused.last_used_at).toBeNull();
    expect(used.last_used_at).not.toBeNull();
    if (used.last_used_at !== null) {
      expect(Math.abs(Date.parse(used.last_used_at) - Date.now())).toBeLessThan(ONE_MINUTE_MS);
    }
  });

  it('rejects an empty grant and accepts account read alone', async () => {
    const account = await createVerifiedAccount();
    const cookie = await webLoginCookie(account);

    const missingName = await postCreate({ permissions: { account: CRUD_BITS.read } }, { cookie });
    expect(missingName.status).toBe(400);

    const longName = await postCreate(
      { name: 'a'.repeat(51), permissions: { account: CRUD_BITS.read } },
      { cookie }
    );
    expect(longName.status).toBe(400);

    const badExpiry = await postCreate(
      { name: 'Bad expiry', permissions: { account: CRUD_BITS.read }, expires_in_days: 60 },
      { cookie }
    );
    expect(badExpiry.status).toBe(400);

    const badMask = await postCreate(
      { name: 'Bad mask', permissions: { account: 16 } },
      { cookie }
    );
    expect(badMask.status).toBe(400);

    const zeros = await postCreate(
      { name: 'Zeros', permissions: emptyApiKeyPermissions() },
      { cookie }
    );
    expect(zeros.status).toBe(400);
    expect(zeros.body).toEqual(EMPTY_PERMISSIONS_BODY);

    const unsupported = await postCreate(
      {
        name: 'Unsupported',
        permissions: { settings: CRUD_BITS.read, history: CRUD_BITS.create + CRUD_BITS.delete },
      },
      { cookie }
    );
    expect(unsupported.status).toBe(400);
    expect(unsupported.body).toEqual(EMPTY_PERMISSIONS_BODY);

    const alone = await postCreate(
      { name: 'Account only', permissions: { account: CRUD_BITS.read } },
      { cookie }
    );
    expect(alone.status).toBe(201);
    expect(readCreated(alone.body).apiKey.permissions).toEqual(accountReadPermissions());
  });

  it('counts expired keys toward the 20-key limit', async () => {
    const account = await createVerifiedAccount();
    const cookie = await webLoginCookie(account);
    const { createAccountApiKey } = await import('@podverse/orm');
    const idTexts: string[] = [];
    for (let index = 0; index < API_KEY_MAX_PER_ACCOUNT; index += 1) {
      const created = await createAccountApiKey({
        accountId: account.id,
        name: `Key ${index + 1}`,
        permissions: accountReadPermissions(),
        expiresAt: null,
      });
      idTexts.push(created.apiKey.id_text);
    }

    const expiredIdText = idTexts[0];
    if (expiredIdText === undefined) {
      throw new Error('No API key was inserted');
    }
    await query(
      `UPDATE account_api_key
          SET expires_at = now() - interval '1 day'
        WHERE id_text = $1`,
      [expiredIdText]
    );
    const [expiredRow] = await query(`SELECT expires_at FROM account_api_key WHERE id_text = $1`, [
      expiredIdText,
    ]);
    if (typeof expiredRow !== 'object' || expiredRow === null) {
      throw new Error('Expired API key row is missing');
    }
    const expiresAt: unknown = Reflect.get(expiredRow, 'expires_at');
    const expiresAtMs =
      expiresAt instanceof Date
        ? expiresAt.getTime()
        : typeof expiresAt === 'string'
          ? Date.parse(expiresAt)
          : Number.NaN;
    expect(expiresAtMs).toBeLessThan(Date.now());

    const blocked = await postCreate(
      { name: 'Twenty first', permissions: { account: CRUD_BITS.read } },
      { cookie }
    );
    expect(blocked.status).toBe(409);
    expect(blocked.body).toEqual(LIMIT_REACHED_BODY);

    const revoked = await deleteKey(expiredIdText, { cookie });
    expect(revoked.status).toBe(200);
    expect(revoked.body).toEqual({ message: 'API key revoked' });

    const allowed = await postCreate(
      { name: 'After revoke', permissions: { account: CRUD_BITS.read } },
      { cookie }
    );
    expect(allowed.status).toBe(201);
  }, 30000);

  it('revokes a key, then answers 404 for a repeat, a bad id, and another account', async () => {
    const account = await createVerifiedAccount();
    const other = await createVerifiedAccount();
    const cookie = await webLoginCookie(account);
    const otherCookie = await webLoginCookie(other);
    const created = await createAccountReadKey(cookie, 'Mine');
    const theirs = await createAccountReadKey(otherCookie, 'Theirs');

    const revoked = await deleteKey(created.apiKey.id_text, { cookie });
    expect(revoked.status).toBe(200);
    expect(revoked.body).toEqual({ message: 'API key revoked' });

    const me = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${created.token}`);
    expect(me.status).toBe(401);
    expect(me.body).toEqual(INVALID_KEY_BODY);

    const again = await deleteKey(created.apiKey.id_text, { cookie });
    expect(again.status).toBe(404);
    expect(again.body).toEqual(KEY_NOT_FOUND_BODY);

    const invalid = await deleteKey('nope', { cookie });
    expect(invalid.status).toBe(404);
    expect(invalid.body).toEqual(KEY_NOT_FOUND_BODY);

    const cross = await deleteKey(theirs.apiKey.id_text, { cookie });
    expect(cross.status).toBe(404);
    expect(cross.body).toEqual(KEY_NOT_FOUND_BODY);

    const stillTheirs = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${theirs.token}`);
    expect(stillTheirs.status).toBe(200);
  });

  it('lets an expired membership list and revoke, and refuses create', async () => {
    const account = await createVerifiedAccount();
    const cookie = await webLoginCookie(account);
    const created = await createAccountReadKey(cookie, 'Before expiry');
    await lapseMembership(account);

    const listed = await getKeys({ cookie });
    expect(listed.status).toBe(200);
    expect(readApiKeyList(listed.body).map((row) => row.id_text)).toEqual([created.apiKey.id_text]);

    const blocked = await postCreate(
      { name: 'After expiry', permissions: { account: CRUD_BITS.read } },
      { cookie }
    );
    expect(blocked.status).toBe(403);
    expect(blocked.body).toEqual({
      message: 'Your membership has expired. Renew to use this feature.',
      code: 'membership_expired',
      i18nKey: 'membership.membership_expired',
      renewPath: APP_ROUTES.MEMBERSHIP_RENEW,
    });
    expect(readApiKeyList((await getKeys({ cookie })).body)).toHaveLength(1);

    const revoked = await deleteKey(created.apiKey.id_text, { cookie });
    expect(revoked.status).toBe(200);
    expect(revoked.body).toEqual({ message: 'API key revoked' });
  });

  it('refuses a full-access key on list, create, and revoke', async () => {
    const account = await createVerifiedAccount();
    const cookie = await webLoginCookie(account);
    const res = await postCreate(
      { name: 'Full access', permissions: apiKeyPermissionsForPreset('full_access') },
      { cookie }
    );
    expect(res.status).toBe(201);
    const created = readCreated(res.body);
    const auth = { bearer: created.token };

    const listed = await getKeys(auth);
    expect(listed.status).toBe(403);
    expect(listed.body).toEqual(NOT_ALLOWED_BODY);

    const blocked = await postCreate(
      { name: 'From a key', permissions: { account: CRUD_BITS.read } },
      auth
    );
    expect(blocked.status).toBe(403);
    expect(blocked.body).toEqual(NOT_ALLOWED_BODY);

    const revoked = await deleteKey(created.apiKey.id_text, auth);
    expect(revoked.status).toBe(403);
    expect(revoked.body).toEqual(NOT_ALLOWED_BODY);

    const me = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${created.token}`);
    expect(me.status).toBe(200);
  });

  it('answers 401 on list, create, and revoke when no credentials are sent', async () => {
    const listed = await getKeys();
    expect(listed.status).toBe(401);
    expect(listed.body).toEqual(UNAUTHORIZED_BODY);

    const created = await postCreate({
      name: 'Signed out',
      permissions: { account: CRUD_BITS.read },
    });
    expect(created.status).toBe(401);
    expect(created.body).toEqual(UNAUTHORIZED_BODY);

    const revoked = await deleteKey('missingkey');
    expect(revoked.status).toBe(401);
    expect(revoked.body).toEqual(UNAUTHORIZED_BODY);
  });

  it('keeps the key after a password change', async () => {
    const account = await createVerifiedAccount();
    const cookie = await webLoginCookie(account);
    const created = await createAccountReadKey(cookie);

    const changed = await request(app)
      .post(`${accountBase}/change-password`)
      .set('Cookie', cookie)
      .set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE)
      .send({ current_password: TEST_PASSWORD, new_password: NEW_PASSWORD });
    expect(changed.status).toBe(200);
    await expectKeyStillWorks(created);
  });

  it('keeps the key after a password reset ends the session', async () => {
    const account = await createVerifiedAccount();
    const cookie = await webLoginCookie(account);
    const created = await createAccountReadKey(cookie);
    const token = await insertResetToken(account.account);

    const reset = await request(app)
      .post(`${accountBase}/reset-password`)
      .send({ token, password: NEW_PASSWORD });
    expect(reset.status).toBe(200);

    const oldSession = await request(app).get(`${authBase}/me`).set('Cookie', cookie);
    expect(oldSession.status).toBe(401);
    await expectKeyStillWorks(created);
  });

  it('keeps the key after an admin sign-out ends the session', async () => {
    const account = await createVerifiedAccount();
    const cookie = await webLoginCookie(account);
    const created = await createAccountReadKey(cookie);
    const { revokeAccountSessions } = await import('@podverse/orm');

    const revokedCount = await revokeAccountSessions({
      accountId: account.id,
      reason: 'admin_force_logout',
      exceptSessionIdText: null,
      now: new Date(),
    });
    expect(revokedCount).toBeGreaterThan(0);

    const oldSession = await request(app).get(`${authBase}/me`).set('Cookie', cookie);
    expect(oldSession.status).toBe(401);
    await expectKeyStillWorks(created);
  });
});
