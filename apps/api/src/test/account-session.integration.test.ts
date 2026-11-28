import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  COOKIE_WRITE_INTENT_HEADER,
  COOKIE_WRITE_INTENT_VALUE,
  sha256Hex,
} from '@podverse/helpers';
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

const TEST_PASSWORD = 'IntegrationTest1!';
const CHROME_MAC_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

type TestAccount = { id: number; idText: string; email: string };

type SessionRowState = {
  client_type: string;
  device_label: string | null;
  last_seen_at: Date;
  idle_expires_at: Date;
  refresh_token_hash: string | null;
  revoked_reason: string | null;
};

function readDate(row: object, column: string): Date {
  const value: unknown = Reflect.get(row, column);
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  throw new Error(`account_session.${column} is not a timestamp`);
}

function readNullableText(row: object, column: string): string | null {
  const value: unknown = Reflect.get(row, column);
  if (value === null || typeof value === 'string') {
    return value;
  }
  throw new Error(`account_session.${column} is not text`);
}

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

describe('account sessions (real session store)', () => {
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
      throw new Error('ORM context required for account session integration test');
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
    const email = `account-session-${Date.now()}-${accountCounter}@example.com`;
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
    return { id: account.id, idText: account.id_text, email };
  }

  async function query(sql: string, parameters: unknown[]): Promise<unknown[]> {
    if (!ormContext) {
      throw new Error('ORM context required');
    }
    const result: unknown = await ormContext.dataSourceReadWrite.query(sql, parameters);
    return Array.isArray(result) ? result : [];
  }

  async function readSession(sessionIdText: string): Promise<SessionRowState> {
    const [row] = await query(
      `SELECT client_type, device_label, last_seen_at, idle_expires_at, refresh_token_hash,
              revoked_reason
         FROM account_session
        WHERE id_text = $1`,
      [sessionIdText]
    );
    if (typeof row !== 'object' || row === null) {
      throw new Error(`No account_session row for ${sessionIdText}`);
    }
    const clientType: unknown = Reflect.get(row, 'client_type');
    if (typeof clientType !== 'string') {
      throw new Error('account_session.client_type is not text');
    }
    return {
      client_type: clientType,
      device_label: readNullableText(row, 'device_label'),
      last_seen_at: readDate(row, 'last_seen_at'),
      idle_expires_at: readDate(row, 'idle_expires_at'),
      refresh_token_hash: readNullableText(row, 'refresh_token_hash'),
      revoked_reason: readNullableText(row, 'revoked_reason'),
    };
  }

  async function countSessions(accountId: number): Promise<number> {
    const [row] = await query(
      'SELECT count(*)::int AS count FROM account_session WHERE account_id = $1',
      [accountId]
    );
    const count: unknown = typeof row === 'object' && row !== null ? Reflect.get(row, 'count') : 0;
    return typeof count === 'number' ? count : Number(count);
  }

  async function revokeSessionInDatabase(sessionIdText: string, reason: string): Promise<void> {
    await query(
      `UPDATE account_session
          SET revoked_at = now(), revoked_reason = $2
        WHERE id_text = $1`,
      [sessionIdText, reason]
    );
  }

  async function webLogin(
    account: TestAccount,
    cookie?: string
  ): Promise<{ res: request.Response; token: string; sid: string }> {
    const pending = request(app)
      .post(`${authBase}/login`)
      .set('User-Agent', CHROME_MAC_USER_AGENT)
      .send({ email: account.email, password: TEST_PASSWORD });
    const res = cookie === undefined ? await pending : await pending.set('Cookie', cookie);
    expect(res.status).toBe(200);
    const token = jwtCookieValue(res);
    if (token === null || token === '') {
      throw new Error('Login set no jwt cookie');
    }
    return { res, token, sid: readClaim(token, 'sid') };
  }

  async function mobileLogin(
    account: TestAccount
  ): Promise<{ accessToken: string; refreshToken: string; sid: string }> {
    const res = await request(app)
      .post(`${authBase}/mobile/token`)
      .send({ email: account.email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    const accessToken: unknown = res.body.access_token;
    const refreshToken: unknown = res.body.refresh_token;
    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      throw new Error('Mobile token response is missing tokens');
    }
    return { accessToken, refreshToken, sid: readClaim(accessToken, 'sid') };
  }

  async function refresh(refreshToken: string): Promise<request.Response> {
    return request(app).post(`${authBase}/mobile/refresh`).send({ refresh_token: refreshToken });
  }

  it('a web login creates a labeled web session, and its cookie authenticates', async () => {
    const account = await createVerifiedAccount();
    const { token, sid } = await webLogin(account);

    const row = await readSession(sid);
    expect(row.client_type).toBe('web');
    expect(row.device_label).toBe('Chrome · macOS');
    expect(row.revoked_reason).toBeNull();

    const check = await request(app).get(`${authBase}/check-session`).set('Cookie', `jwt=${token}`);
    expect(check.status).toBe(200);
  });

  it('checks the real password: a wrong one is 401 and creates no session', async () => {
    const account = await createVerifiedAccount();

    const wrong = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: 'not-the-password' });
    expect(wrong.status).toBe(401);
    expect(await countSessions(account.id)).toBe(0);

    const right = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: TEST_PASSWORD });
    expect(right.status).toBe(200);
    expect(await countSessions(account.id)).toBe(1);
  });

  it('renews the web cookie and the row at most once a day of use', async () => {
    const account = await createVerifiedAccount();
    const { token, sid } = await webLogin(account);
    await query(
      `UPDATE account_session
          SET last_seen_at = now() - interval '2 days',
              idle_expires_at = now() + interval '30 days'
        WHERE id_text = $1`,
      [sid]
    );
    const aged = await readSession(sid);

    const first = await request(app).get(`${authBase}/check-session`).set('Cookie', `jwt=${token}`);
    expect(first.status).toBe(200);
    const renewedToken = jwtCookieValue(first);
    expect(renewedToken).not.toBeNull();
    expect(renewedToken).not.toBe('');
    if (renewedToken !== null) {
      expect(readClaim(renewedToken, 'sid')).toBe(sid);
    }

    const renewed = await readSession(sid);
    expect(renewed.last_seen_at.getTime()).toBeGreaterThan(aged.last_seen_at.getTime());
    expect(renewed.idle_expires_at.getTime()).toBeGreaterThan(aged.idle_expires_at.getTime());

    const second = await request(app)
      .get(`${authBase}/check-session`)
      .set('Cookie', `jwt=${renewedToken ?? token}`);
    expect(second.status).toBe(200);
    expect(jwtCookieValue(second)).toBeNull();
  });

  it('logout ends the session; replaying its cookie is a plain 401 that clears the cookie', async () => {
    const account = await createVerifiedAccount();
    const { token, sid } = await webLogin(account);

    const logout = await request(app)
      .post(`${authBase}/logout`)
      .set('Cookie', `jwt=${token}`)
      .set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE);
    expect(logout.status).toBe(200);
    expect((await readSession(sid)).revoked_reason).toBe('signed_out');

    const replay = await request(app)
      .get(`${authBase}/check-session`)
      .set('Cookie', `jwt=${token}`);
    expect(replay.status).toBe(401);
    expect(replay.body).toEqual({ message: 'Unauthorized' });
    expectJwtCookieCleared(replay);
  });

  it('a session ended elsewhere gets its notice on signed-in routes and is anonymous on public ones', async () => {
    const account = await createVerifiedAccount();
    const { token, sid } = await webLogin(account);
    await revokeSessionInDatabase(sid, 'signed_out_elsewhere');

    const me = await request(app).get(`${authBase}/me`).set('Cookie', `jwt=${token}`);
    expect(me.status).toBe(401);
    expect(me.body).toEqual({
      message: 'Unauthorized',
      code: 'session_ended',
      notice: 'signed_out_elsewhere',
    });
    expectJwtCookieCleared(me);

    const publicProfile = await request(app)
      .get(`${accountBase}/${account.idText}`)
      .set('Cookie', `jwt=${token}`);
    expect(publicProfile.status).not.toBe(401);
    expect(jwtCookieValue(publicProfile)).toBeNull();
  });

  it('a second web login in the same browser ends the first session', async () => {
    const account = await createVerifiedAccount();
    const first = await webLogin(account);
    const second = await webLogin(account, `jwt=${first.token}`);

    expect(second.sid).not.toBe(first.sid);
    expect((await readSession(first.sid)).revoked_reason).toBe('signed_out');
    expect((await readSession(second.sid)).revoked_reason).toBeNull();
  });

  it('an unexpired mobile access token stops working once its session is ended', async () => {
    const account = await createVerifiedAccount();
    const { accessToken, sid } = await mobileLogin(account);
    expect((await readSession(sid)).client_type).toBe('mobile');

    const before = await request(app)
      .get(`${authBase}/check-session`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(before.status).toBe(200);

    await revokeSessionInDatabase(sid, 'admin_force_logout');

    const after = await request(app)
      .get(`${authBase}/check-session`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(after.status).toBe(401);
    expect(after.body).toEqual({
      message: 'Unauthorized',
      code: 'session_ended',
      notice: 'admin_force_logout',
    });
  });

  it('rotates refresh tokens, accepts the previous one, and ends the session on reuse', async () => {
    const account = await createVerifiedAccount();
    const { refreshToken: r0, sid } = await mobileLogin(account);

    const toR1 = await refresh(r0);
    expect(toR1.status).toBe(200);
    const r1: unknown = toR1.body.refresh_token;
    if (typeof r1 !== 'string') {
      throw new Error('Refresh returned no refresh token');
    }

    const toR2 = await refresh(r0);
    expect(toR2.status).toBe(200);
    const r2: unknown = toR2.body.refresh_token;
    if (typeof r2 !== 'string') {
      throw new Error('Refresh returned no refresh token');
    }

    const reuse = await refresh(r1);
    expect(reuse.status).toBe(401);
    expect(reuse.body).toEqual({
      message: 'Invalid refresh token',
      code: 'session_ended',
      notice: 'security',
    });
    expect((await readSession(sid)).revoked_reason).toBe('refresh_reuse');

    const afterReuse = await refresh(r2);
    expect(afterReuse.status).toBe(401);
  });

  it('two refreshes racing with the same token both succeed and the session stays usable', async () => {
    const account = await createVerifiedAccount();
    const { refreshToken: r0, sid } = await mobileLogin(account);

    const responses = await Promise.all([refresh(r0), refresh(r0)]);
    for (const res of responses) {
      expect(res.status).toBe(200);
    }
    const row = await readSession(sid);
    expect(row.revoked_reason).toBeNull();

    const tokens = responses.map((res): unknown => res.body.refresh_token);
    const latest = tokens.find(
      (token): token is string =>
        typeof token === 'string' && sha256Hex(readClaim(token, 'rid')) === row.refresh_token_hash
    );
    if (latest === undefined) {
      throw new Error('Neither racing refresh returned the current refresh token');
    }

    const next = await refresh(latest);
    expect(next.status).toBe(200);
  });

  it('mobile revoke ends the session, and a later refresh is a plain 401', async () => {
    const account = await createVerifiedAccount();
    const { refreshToken, sid } = await mobileLogin(account);

    const revoke = await request(app)
      .post(`${authBase}/mobile/revoke`)
      .send({ refresh_token: refreshToken });
    expect(revoke.status).toBe(200);
    expect(revoke.body).toEqual({ message: 'Mobile session revoked' });
    expect((await readSession(sid)).revoked_reason).toBe('signed_out');

    const later = await refresh(refreshToken);
    expect(later.status).toBe(401);
    expect(later.body).toEqual({ message: 'Invalid refresh token' });
  });

  it('stores the device_label the app sends, else the platform from the client header', async () => {
    const account = await createVerifiedAccount();

    const labeled = await request(app)
      .post(`${authBase}/mobile/token`)
      .send({ email: account.email, password: TEST_PASSWORD, device_label: 'Test Phone' });
    expect(labeled.status).toBe(200);
    const labeledToken: unknown = labeled.body.access_token;
    if (typeof labeledToken !== 'string') {
      throw new Error('Mobile token response is missing the access token');
    }
    expect((await readSession(readClaim(labeledToken, 'sid'))).device_label).toBe('Test Phone');

    const fromHeader = await request(app)
      .post(`${authBase}/mobile/token`)
      .set('X-Podverse-Client-Platform', 'ios')
      .send({ email: account.email, password: TEST_PASSWORD });
    expect(fromHeader.status).toBe(200);
    const headerToken: unknown = fromHeader.body.access_token;
    if (typeof headerToken !== 'string') {
      throw new Error('Mobile token response is missing the access token');
    }
    expect((await readSession(readClaim(headerToken, 'sid'))).device_label).toBe('iOS');
  });
});
