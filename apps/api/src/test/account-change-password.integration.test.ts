import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

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

const ORIGINAL_PASSWORD = 'Original-pass1';
const NEW_PASSWORD = 'New-pass2';
const CHROME_MAC_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FIREFOX_WINDOWS_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0';

const PASSWORD_CHANGED_ME = {
  message: 'Unauthorized',
  code: 'session_ended',
  notice: 'password_changed',
};

const PASSWORD_CHANGED_REFRESH = {
  message: 'Invalid refresh token',
  code: 'session_ended',
  notice: 'password_changed',
};

type TestAccount = { id: number; email: string };

type SessionRevocation = {
  revokedAt: Date | null;
  revokedReason: string | null;
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

function readClaim(token: string, claim: string): string {
  const decoded = jwt.decode(token);
  const value: unknown =
    typeof decoded === 'object' && decoded !== null ? Reflect.get(decoded, claim) : undefined;
  if (typeof value !== 'string') {
    throw new Error(`Token has no ${claim} claim`);
  }
  return value;
}

describe('POST /account/change-password (real session store)', () => {
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
      throw new Error('ORM context required for change-password integration test');
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
    const email = `change-password-${Date.now()}-${accountCounter}@example.com`;
    const accountService = new AccountService();
    await accountService.create({
      email,
      password: ORIGINAL_PASSWORD,
      locale: 'en-US',
      terms_version: '2026-10-15',
    });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error('Failed to load account after create');
    }
    await accountService.verifyEmail(account.id);
    return { id: account.id, email };
  }

  async function query(sql: string, parameters: unknown[]): Promise<unknown[]> {
    if (!ormContext) {
      throw new Error('ORM context required');
    }
    const result: unknown = await ormContext.dataSourceReadWrite.query(sql, parameters);
    return Array.isArray(result) ? result : [];
  }

  async function readRevocation(sessionIdText: string): Promise<SessionRevocation> {
    const [row] = await query(
      'SELECT revoked_at, revoked_reason FROM account_session WHERE id_text = $1',
      [sessionIdText]
    );
    if (typeof row !== 'object' || row === null) {
      throw new Error(`No account_session row for ${sessionIdText}`);
    }
    const revokedAtRaw: unknown = Reflect.get(row, 'revoked_at');
    let revokedAt: Date | null;
    if (revokedAtRaw === null) {
      revokedAt = null;
    } else if (revokedAtRaw instanceof Date) {
      revokedAt = revokedAtRaw;
    } else if (typeof revokedAtRaw === 'string') {
      revokedAt = new Date(revokedAtRaw);
    } else {
      throw new Error('account_session.revoked_at is not a timestamp');
    }
    const revokedReason: unknown = Reflect.get(row, 'revoked_reason');
    if (revokedReason !== null && typeof revokedReason !== 'string') {
      throw new Error('account_session.revoked_reason is not text');
    }
    return { revokedAt, revokedReason };
  }

  /** Signs in on a request that carries no session cookie. */
  async function webLogin(
    account: TestAccount,
    userAgent: string,
    password: string = ORIGINAL_PASSWORD
  ): Promise<{ token: string; sid: string }> {
    const res = await request(app)
      .post(`${authBase}/login`)
      .set('User-Agent', userAgent)
      .send({ email: account.email, password });
    expect(res.status).toBe(200);
    const token = jwtCookieValue(res);
    if (token === null || token === '') {
      throw new Error('Login set no jwt cookie');
    }
    return { token, sid: readClaim(token, 'sid') };
  }

  async function mobileLogin(
    account: TestAccount
  ): Promise<{ accessToken: string; refreshToken: string; sid: string }> {
    const res = await request(app).post(`${authBase}/mobile/token`).send({
      email: account.email,
      password: ORIGINAL_PASSWORD,
      device_label: 'Test Phone',
    });
    expect(res.status).toBe(200);
    const accessToken: unknown = res.body.access_token;
    const refreshToken: unknown = res.body.refresh_token;
    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      throw new Error('Mobile token response is missing tokens');
    }
    return { accessToken, refreshToken, sid: readClaim(accessToken, 'sid') };
  }

  async function postChangePassword(
    body: { current_password: string; new_password: string },
    auth?: { cookie?: string; bearer?: string }
  ): Promise<request.Response> {
    const pending = request(app).post(`${accountBase}/change-password`).send(body);
    if (auth?.cookie !== undefined) {
      pending.set('Cookie', auth.cookie);
      pending.set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE);
    }
    if (auth?.bearer !== undefined) {
      pending.set('Authorization', `Bearer ${auth.bearer}`);
    }
    return pending;
  }

  it('keeps the web caller signed in and ends every other session', async () => {
    const account = await createVerifiedAccount();
    const sessionA = await webLogin(account, CHROME_MAC_USER_AGENT);
    const sessionB = await webLogin(account, FIREFOX_WINDOWS_USER_AGENT);
    const mobile = await mobileLogin(account);

    const changed = await postChangePassword(
      { current_password: ORIGINAL_PASSWORD, new_password: NEW_PASSWORD },
      { cookie: `jwt=${sessionA.token}` }
    );

    expect(changed.status).toBe(200);
    expect(changed.body).toEqual({ message: 'Password changed', revoked_count: 2 });
    expect(jwtCookieValue(changed)).toBeNull();

    const meA = await request(app).get(`${authBase}/me`).set('Cookie', `jwt=${sessionA.token}`);
    expect(meA.status).toBe(200);

    const meB = await request(app).get(`${authBase}/me`).set('Cookie', `jwt=${sessionB.token}`);
    expect(meB.status).toBe(401);
    expect(meB.body).toEqual(PASSWORD_CHANGED_ME);

    const meMobile = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${mobile.accessToken}`);
    expect(meMobile.status).toBe(401);
    expect(meMobile.body).toEqual(PASSWORD_CHANGED_ME);

    const refresh = await request(app)
      .post(`${authBase}/mobile/refresh`)
      .send({ refresh_token: mobile.refreshToken });
    expect(refresh.status).toBe(401);
    expect(refresh.body).toEqual(PASSWORD_CHANGED_REFRESH);

    const caller = await readRevocation(sessionA.sid);
    expect(caller.revokedAt).toBeNull();
    expect(caller.revokedReason).toBeNull();
    expect((await readRevocation(sessionB.sid)).revokedReason).toBe('password_changed');
    expect((await readRevocation(mobile.sid)).revokedReason).toBe('password_changed');

    const oldPassword = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: ORIGINAL_PASSWORD });
    expect(oldPassword.status).toBe(401);

    const newPassword = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: NEW_PASSWORD });
    expect(newPassword.status).toBe(200);
  });

  it('keeps the mobile caller signed in and ends the web session', async () => {
    const account = await createVerifiedAccount();
    const web = await webLogin(account, CHROME_MAC_USER_AGENT);
    const mobile = await mobileLogin(account);

    const changed = await postChangePassword(
      { current_password: ORIGINAL_PASSWORD, new_password: NEW_PASSWORD },
      { bearer: mobile.accessToken }
    );

    expect(changed.status).toBe(200);
    expect(changed.body).toEqual({ message: 'Password changed', revoked_count: 1 });

    const meMobile = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${mobile.accessToken}`);
    expect(meMobile.status).toBe(200);

    const refresh = await request(app)
      .post(`${authBase}/mobile/refresh`)
      .send({ refresh_token: mobile.refreshToken });
    expect(refresh.status).toBe(200);
    const nextAccess: unknown = refresh.body.access_token;
    if (typeof nextAccess !== 'string') {
      throw new Error('Refresh returned no access token');
    }
    const meRefreshed = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${nextAccess}`);
    expect(meRefreshed.status).toBe(200);

    const meWeb = await request(app).get(`${authBase}/me`).set('Cookie', `jwt=${web.token}`);
    expect(meWeb.status).toBe(401);
    expect(meWeb.body).toEqual(PASSWORD_CHANGED_ME);
  });

  it('rejects a wrong current password and leaves every session signed in', async () => {
    const account = await createVerifiedAccount();
    const sessionA = await webLogin(account, CHROME_MAC_USER_AGENT);
    const sessionB = await webLogin(account, FIREFOX_WINDOWS_USER_AGENT);

    const changed = await postChangePassword(
      { current_password: 'Wrong-pass1', new_password: NEW_PASSWORD },
      { cookie: `jwt=${sessionA.token}` }
    );

    expect(changed.status).toBe(400);
    expect(changed.body).toEqual({
      message: 'Current password is incorrect',
      code: 'current_password_incorrect',
    });
    expect((await readRevocation(sessionA.sid)).revokedAt).toBeNull();
    expect((await readRevocation(sessionB.sid)).revokedAt).toBeNull();

    const meB = await request(app).get(`${authBase}/me`).set('Cookie', `jwt=${sessionB.token}`);
    expect(meB.status).toBe(200);

    const stillOriginal = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: ORIGINAL_PASSWORD });
    expect(stillOriginal.status).toBe(200);
  });

  it('rejects a new password that breaks the sign-up rule and leaves every session signed in', async () => {
    const account = await createVerifiedAccount();
    const sessionA = await webLogin(account, CHROME_MAC_USER_AGENT);
    const sessionB = await webLogin(account, FIREFOX_WINDOWS_USER_AGENT);

    const changed = await postChangePassword(
      { current_password: ORIGINAL_PASSWORD, new_password: 'alllowercase' },
      { cookie: `jwt=${sessionA.token}` }
    );

    expect(changed.status).toBe(400);
    expect(changed.body).toEqual({
      message: 'New password does not meet the requirements',
      code: 'invalid_new_password',
    });
    expect((await readRevocation(sessionA.sid)).revokedAt).toBeNull();
    expect((await readRevocation(sessionB.sid)).revokedAt).toBeNull();

    const stillOriginal = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: ORIGINAL_PASSWORD });
    expect(stillOriginal.status).toBe(200);
  });

  it('returns 401 when the caller is not signed in', async () => {
    const res = await request(app).post(`${accountBase}/change-password`).send({
      current_password: ORIGINAL_PASSWORD,
      new_password: NEW_PASSWORD,
    });

    expect(res.status).toBe(401);
  });
});
