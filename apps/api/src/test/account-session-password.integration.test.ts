import { randomUUID } from 'node:crypto';

import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE } from '@podverse/helpers';
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
const INVALID_PASSWORD = 'alllowercase';
const CHROME_MAC_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

type TestAccount = {
  id: number;
  email: string;
  account: Account;
};

function setCookies(res: request.Response): string[] {
  const header: unknown = res.headers['set-cookie'];
  if (Array.isArray(header)) {
    return header.filter((value): value is string => typeof value === 'string');
  }
  return typeof header === 'string' ? [header] : [];
}

/** The `jwt` cookie value the response sets, '' when it clears the cookie, null when absent. */
function jwtCookieValue(res: request.Response): string | null {
  const cookie = setCookies(res).find((value) => value.startsWith('jwt='));
  if (cookie === undefined) {
    return null;
  }
  return cookie.slice('jwt='.length).split(';')[0] ?? '';
}

function expectJwtCookieCleared(res: request.Response): void {
  const cookie = setCookies(res).find((value) => value.startsWith('jwt='));
  expect(cookie).toBeDefined();
  expect(jwtCookieValue(res)).toBe('');
  expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
}

function readClaim(token: string, claim: string): string {
  const decoded = jwt.decode(token);
  const value: unknown =
    typeof decoded === 'object' && decoded !== null ? Reflect.get(decoded, claim) : undefined;
  if (typeof value !== 'string') {
    throw new Error(`Token has no ${claim} claim`);
  }
  return value;
}

describe('password reset, invite completion, and account deletion (real session store)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let authBase: string;
  let accountBase: string;
  let accountCounter = 0;

  beforeAll(async () => {
    const started = await startTestApp({ accountSessions: 'real' });
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for password session integration test');
    }
    const apiBase = await getBaseApiUrl();
    authBase = `${apiBase}/auth`;
    accountBase = `${apiBase}/account`;
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  async function createVerifiedAccount(): Promise<TestAccount> {
    const { AccountService } = await import('@podverse/orm');
    accountCounter += 1;
    const email = `password-session-${Date.now()}-${accountCounter}@example.com`;
    const accountService = new AccountService();
    await accountService.create({
      email,
      password: TEST_PASSWORD,
      locale: 'en-US',
      terms_version: '2026-10-15',
    });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error('Failed to load account after create');
    }
    await accountService.verifyEmail(account.id);
    return { id: account.id, email, account };
  }

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
    return typeof count === 'number' ? count : Number(count);
  }

  async function revokedReason(sessionIdText: string): Promise<string | null> {
    const [row] = await query('SELECT revoked_reason FROM account_session WHERE id_text = $1', [
      sessionIdText,
    ]);
    if (typeof row !== 'object' || row === null) {
      throw new Error(`No account_session row for ${sessionIdText}`);
    }
    const value: unknown = Reflect.get(row, 'revoked_reason');
    if (value === null || typeof value === 'string') {
      return value;
    }
    throw new Error('account_session.revoked_reason is not text');
  }

  async function countSessions(accountId: number): Promise<number> {
    return scalarCount('SELECT count(*)::int AS count FROM account_session WHERE account_id = $1', [
      accountId,
    ]);
  }

  async function countSetPasswordRows(accountId: number): Promise<number> {
    return scalarCount(
      'SELECT count(*)::int AS count FROM account_set_password WHERE account_id = $1',
      [accountId]
    );
  }

  /** Signs in on a request that carries no session cookie. */
  async function webLogin(
    account: TestAccount,
    password: string = TEST_PASSWORD
  ): Promise<{ token: string; sid: string }> {
    const res = await request(app)
      .post(`${authBase}/login`)
      .set('User-Agent', CHROME_MAC_USER_AGENT)
      .send({ email: account.email, password });
    expect(res.status).toBe(200);
    const token = jwtCookieValue(res);
    if (token === null || token === '') {
      throw new Error('Login set no jwt cookie');
    }
    return { token, sid: readClaim(token, 'sid') };
  }

  async function mobileLogin(account: TestAccount): Promise<{ refreshToken: string; sid: string }> {
    const res = await request(app)
      .post(`${authBase}/mobile/token`)
      .send({ email: account.email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    const accessToken: unknown = res.body.access_token;
    const refreshToken: unknown = res.body.refresh_token;
    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      throw new Error('Mobile token response is missing tokens');
    }
    return { refreshToken, sid: readClaim(accessToken, 'sid') };
  }

  async function insertResetToken(account: TestAccount): Promise<string> {
    const { AccountResetPasswordService } = await import('@podverse/orm');
    const token = randomUUID();
    await new AccountResetPasswordService().update(account.account, {
      reset_token: token,
      reset_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
    });
    return token;
  }

  async function insertSetPasswordToken(account: TestAccount): Promise<string> {
    const { AccountSetPasswordService } = await import('@podverse/orm');
    const token = randomUUID();
    await new AccountSetPasswordService().update(account.account, {
      set_password_token: token,
      set_password_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
    });
    return token;
  }

  it('a forgotten-password reset ends every session, and only the new password signs in', async () => {
    const account = await createVerifiedAccount();
    const first = await webLogin(account);
    const second = await webLogin(account);
    const mobile = await mobileLogin(account);
    const token = await insertResetToken(account);

    const reset = await request(app)
      .post(`${accountBase}/reset-password`)
      .set('Cookie', `jwt=${first.token}`)
      .send({ token, password: NEW_PASSWORD });

    expect(reset.status).toBe(200);
    expect(reset.body).toEqual({ message: 'Password reset successfully' });
    expectJwtCookieCleared(reset);
    expect(await revokedReason(first.sid)).toBe('password_changed');
    expect(await revokedReason(second.sid)).toBe('password_changed');
    expect(await revokedReason(mobile.sid)).toBe('password_changed');

    for (const oldToken of [first.token, second.token]) {
      const me = await request(app).get(`${authBase}/me`).set('Cookie', `jwt=${oldToken}`);
      expect(me.status).toBe(401);
      expect(me.body).toEqual({
        message: 'Unauthorized',
        code: 'session_ended',
        notice: 'password_changed',
      });
    }

    const refresh = await request(app)
      .post(`${authBase}/mobile/refresh`)
      .send({ refresh_token: mobile.refreshToken });
    expect(refresh.status).toBe(401);
    expect(refresh.body).toEqual({
      message: 'Invalid refresh token',
      code: 'session_ended',
      notice: 'password_changed',
    });

    const signedIn = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: NEW_PASSWORD });
    expect(signedIn.status).toBe(200);

    const oldPassword = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: TEST_PASSWORD });
    expect(oldPassword.status).toBe(401);
  });

  it('a reset rejects a password that breaks the sign-up rule and leaves the link usable', async () => {
    const account = await createVerifiedAccount();
    const { sid } = await webLogin(account);
    const token = await insertResetToken(account);

    const rejected = await request(app)
      .post(`${accountBase}/reset-password`)
      .send({ token, password: INVALID_PASSWORD });

    expect(rejected.status).toBe(400);
    expect(rejected.body).toEqual({ message: 'Password does not meet the requirements' });
    expect(await revokedReason(sid)).toBeNull();

    const stillOriginal = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: TEST_PASSWORD });
    expect(stillOriginal.status).toBe(200);

    const accepted = await request(app)
      .post(`${accountBase}/reset-password`)
      .send({ token, password: NEW_PASSWORD });
    expect(accepted.status).toBe(200);
    expect(accepted.body).toEqual({ message: 'Password reset successfully' });
    expectJwtCookieCleared(accepted);
  });

  it('invite completion ends every session', async () => {
    const account = await createVerifiedAccount();
    const web = await webLogin(account);
    const mobile = await mobileLogin(account);
    const token = await insertSetPasswordToken(account);

    const setPassword = await request(app)
      .post(`${accountBase}/set-password`)
      .set('Cookie', `jwt=${web.token}`)
      .send({ token, password: NEW_PASSWORD });

    expect(setPassword.status).toBe(200);
    expect(setPassword.body).toEqual({ message: 'Password set successfully' });
    expectJwtCookieCleared(setPassword);
    expect(await revokedReason(web.sid)).toBe('password_changed');
    expect(await revokedReason(mobile.sid)).toBe('password_changed');

    const me = await request(app).get(`${authBase}/me`).set('Cookie', `jwt=${web.token}`);
    expect(me.status).toBe(401);
    expect(me.body).toEqual({
      message: 'Unauthorized',
      code: 'session_ended',
      notice: 'password_changed',
    });

    await webLogin(account, NEW_PASSWORD);
  });

  it('invite completion rejects a password that breaks the sign-up rule and leaves the link usable', async () => {
    const account = await createVerifiedAccount();
    const token = await insertSetPasswordToken(account);

    const rejected = await request(app)
      .post(`${accountBase}/set-password`)
      .send({ token, password: INVALID_PASSWORD });

    expect(rejected.status).toBe(400);
    expect(rejected.body).toEqual({ message: 'Password does not meet the requirements' });
    expect(await countSetPasswordRows(account.id)).toBe(1);

    const stillOriginal = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: TEST_PASSWORD });
    expect(stillOriginal.status).toBe(200);

    const accepted = await request(app)
      .post(`${accountBase}/set-password`)
      .send({ token, password: NEW_PASSWORD });
    expect(accepted.status).toBe(200);
    expect(accepted.body).toEqual({ message: 'Password set successfully' });
    expectJwtCookieCleared(accepted);
  });

  it('deleting an account clears the cookie and removes its sessions', async () => {
    const account = await createVerifiedAccount();
    const { token } = await webLogin(account);
    expect(await countSessions(account.id)).toBe(1);

    const deleted = await request(app)
      .delete(`${accountBase}/delete`)
      .set('Cookie', `jwt=${token}`)
      .set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE);

    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ message: 'Account deleted successfully' });
    expectJwtCookieCleared(deleted);
    expect(await countSessions(account.id)).toBe(0);
  });
});
