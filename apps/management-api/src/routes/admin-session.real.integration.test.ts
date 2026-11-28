import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import { AppDataSourceRead, AppDataSourceReadWrite } from '@management-api/orm/db/index.js';
import { AdminAccountService } from '@management-api/orm/services/adminAccount.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  COOKIE_WRITE_INTENT_HEADER,
  COOKIE_WRITE_INTENT_VALUE,
  sha256Hex,
} from '@podverse/helpers';

const ADMIN_AUTH_COOKIE_NAME = 'pv_mgmt_auth';
const TEST_PASSWORD = 'AdminSessionTest1!';
const CHROME_MAC_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const authBase = `${config.api.prefix}${config.api.version}/auth`;

type TestAdmin = { id: number; email: string };

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
  throw new Error(`admin_session.${column} is not a timestamp`);
}

function readNullableText(row: object, column: string): string | null {
  const value: unknown = Reflect.get(row, column);
  if (value === null || typeof value === 'string') {
    return value;
  }
  throw new Error(`admin_session.${column} is not text`);
}

function setCookies(res: request.Response): string[] {
  const header: unknown = res.headers['set-cookie'];
  if (Array.isArray(header)) {
    return header.filter((value): value is string => typeof value === 'string');
  }
  return typeof header === 'string' ? [header] : [];
}

/** The `pv_mgmt_auth` value the response sets, '' when it clears the cookie, null when absent. */
function authCookieValue(res: request.Response): string | null {
  const cookie = setCookies(res).find((value) => value.startsWith(`${ADMIN_AUTH_COOKIE_NAME}=`));
  if (cookie === undefined) {
    return null;
  }
  return cookie.slice(`${ADMIN_AUTH_COOKIE_NAME}=`.length).split(';')[0] ?? '';
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

function readBodyString(res: request.Response, field: string): string {
  const value: unknown = Reflect.get(res.body, field);
  if (typeof value !== 'string') {
    throw new Error(`Response body has no ${field}`);
  }
  return value;
}

async function query(sql: string, parameters: unknown[]): Promise<unknown[]> {
  const result: unknown = await AppDataSourceReadWrite.query(sql, parameters);
  if (!Array.isArray(result)) {
    return [];
  }
  if (result.length === 2 && Array.isArray(result[0]) && typeof result[1] === 'number') {
    return result[0];
  }
  return result;
}

async function sessionRow(sessionIdText: string): Promise<SessionRowState> {
  const rows = await query(
    `SELECT client_type, device_label, last_seen_at, idle_expires_at, refresh_token_hash,
            revoked_reason
       FROM admin_session
      WHERE id_text = $1`,
    [sessionIdText]
  );
  const row = rows[0];
  if (typeof row !== 'object' || row === null) {
    throw new Error(`No admin_session row ${sessionIdText}`);
  }
  const clientType: unknown = Reflect.get(row, 'client_type');
  if (typeof clientType !== 'string') {
    throw new Error('admin_session.client_type is not text');
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

async function revokeSessionRow(sessionIdText: string, reason: string): Promise<void> {
  await query(
    `UPDATE admin_session SET revoked_at = now(), revoked_reason = $2 WHERE id_text = $1`,
    [sessionIdText, reason]
  );
}

describe('admin sessions (real session store)', () => {
  const adminService = new AdminAccountService();
  const createdAdminIds = new Set<number>();
  let adminCounter = 0;

  beforeAll(async () => {
    if (!AppDataSourceRead.isInitialized) {
      await AppDataSourceRead.initialize();
    }
    if (!AppDataSourceReadWrite.isInitialized) {
      await AppDataSourceReadWrite.initialize();
    }
  }, 30000);

  afterAll(async () => {
    for (const id of createdAdminIds) {
      await adminService.delete(id);
    }
    if (AppDataSourceReadWrite.isInitialized) {
      await AppDataSourceReadWrite.destroy();
    }
    if (AppDataSourceRead.isInitialized) {
      await AppDataSourceRead.destroy();
    }
  });

  async function createAdmin(): Promise<TestAdmin> {
    adminCounter += 1;
    const email = `admin-session-${Date.now()}-${adminCounter}@example.com`;
    const admin = await adminService.create({ email, password: TEST_PASSWORD });
    createdAdminIds.add(admin.id);
    const verified = await adminService.verifyPassword(email, TEST_PASSWORD);
    if (!verified) {
      throw new Error('Created admin does not verify');
    }
    return { id: admin.id, email };
  }

  async function webLogin(admin: TestAdmin, cookie?: string): Promise<string> {
    const req = request(app)
      .post(`${authBase}/login`)
      .set('User-Agent', CHROME_MAC_USER_AGENT)
      .send({ email: admin.email, password: TEST_PASSWORD });
    const res = await (cookie === undefined
      ? req
      : req.set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=${cookie}`]));
    expect(res.status).toBe(200);
    const token = authCookieValue(res);
    if (token === null || token === '') {
      throw new Error('Login set no pv_mgmt_auth cookie');
    }
    return token;
  }

  async function mobileLogin(
    admin: TestAdmin,
    options: { deviceLabel?: string; platform?: string } = {}
  ): Promise<{ accessToken: string; refreshToken: string; sessionIdText: string }> {
    const body: Record<string, string> = { email: admin.email, password: TEST_PASSWORD };
    if (options.deviceLabel !== undefined) {
      body.device_label = options.deviceLabel;
    }
    const req = request(app).post(`${authBase}/mobile/token`);
    const res = await (options.platform === undefined
      ? req.send(body)
      : req.set('X-Podverse-Client-Platform', options.platform).send(body));
    expect(res.status).toBe(200);
    const accessToken = readBodyString(res, 'access_token');
    return {
      accessToken,
      refreshToken: readBodyString(res, 'refresh_token'),
      sessionIdText: readClaim(accessToken, 'sid'),
    };
  }

  function refresh(refreshToken: string): Promise<request.Response> {
    return request(app).post(`${authBase}/mobile/refresh`).send({ refresh_token: refreshToken });
  }

  function getMeWithCookie(cookie: string): Promise<request.Response> {
    return request(app)
      .get(`${authBase}/me`)
      .set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=${cookie}`]);
  }

  it('a web login creates a labeled web session that its cookie authenticates', async () => {
    const admin = await createAdmin();
    const cookie = await webLogin(admin);
    const sessionIdText = readClaim(cookie, 'sid');

    const row = await sessionRow(sessionIdText);
    expect(row.client_type).toBe('web');
    expect(row.device_label).toBe('Chrome · macOS');
    expect(row.refresh_token_hash).toBeNull();

    const me = await getMeWithCookie(cookie);
    expect(me.status).toBe(200);
    expect(Reflect.get(me.body, 'id')).toBe(admin.id);
  });

  it('a cookie request renews a session last seen two days ago, then not again that day', async () => {
    const admin = await createAdmin();
    const cookie = await webLogin(admin);
    const sessionIdText = readClaim(cookie, 'sid');
    await query(
      `UPDATE admin_session
          SET last_seen_at = last_seen_at - interval '2 days',
              idle_expires_at = idle_expires_at - interval '2 days'
        WHERE id_text = $1`,
      [sessionIdText]
    );
    const before = await sessionRow(sessionIdText);

    const renewing = await getMeWithCookie(cookie);
    expect(renewing.status).toBe(200);
    const renewedCookie = authCookieValue(renewing);
    expect(renewedCookie).toBeTruthy();
    expect(readClaim(renewedCookie ?? '', 'sid')).toBe(sessionIdText);

    const after = await sessionRow(sessionIdText);
    expect(after.last_seen_at.getTime()).toBeGreaterThan(before.last_seen_at.getTime());
    expect(after.idle_expires_at.getTime()).toBeGreaterThan(before.idle_expires_at.getTime());

    const sameDay = await getMeWithCookie(renewedCookie ?? cookie);
    expect(sameDay.status).toBe(200);
    expect(authCookieValue(sameDay)).toBeNull();
  });

  it('logout ends the session, and replaying its cookie is a plain 401 that clears the cookie', async () => {
    const admin = await createAdmin();
    const cookie = await webLogin(admin);
    const sessionIdText = readClaim(cookie, 'sid');

    const logout = await request(app)
      .post(`${authBase}/logout`)
      .set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=${cookie}`])
      .set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE);
    expect(logout.status).toBe(200);
    expect(Reflect.get(logout.body, 'message')).toBe('Logged out successfully');
    expect((await sessionRow(sessionIdText)).revoked_reason).toBe('signed_out');

    const replay = await getMeWithCookie(cookie);
    expect(replay.status).toBe(401);
    expect(replay.body).toEqual({ message: 'Unauthorized' });
    expect(authCookieValue(replay)).toBe('');
  });

  it('a session ended elsewhere answers 401 with its notice', async () => {
    const admin = await createAdmin();
    const cookie = await webLogin(admin);
    await revokeSessionRow(readClaim(cookie, 'sid'), 'signed_out_elsewhere');

    const me = await getMeWithCookie(cookie);
    expect(me.status).toBe(401);
    expect(me.body).toEqual({
      message: 'Unauthorized',
      code: 'session_ended',
      notice: 'signed_out_elsewhere',
    });
  });

  it('a second web login carrying the first cookie ends the first session', async () => {
    const admin = await createAdmin();
    const firstCookie = await webLogin(admin);
    const secondCookie = await webLogin(admin, firstCookie);

    expect((await sessionRow(readClaim(firstCookie, 'sid'))).revoked_reason).toBe('signed_out');
    expect((await sessionRow(readClaim(secondCookie, 'sid'))).revoked_reason).toBeNull();
  });

  it('an unexpired mobile access token stops working once its session is ended', async () => {
    const admin = await createAdmin();
    const { accessToken, sessionIdText } = await mobileLogin(admin);

    const before = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(before.status).toBe(200);

    await revokeSessionRow(sessionIdText, 'admin_force_logout');
    const after = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(after.status).toBe(401);
    expect(after.body).toEqual({
      message: 'Unauthorized',
      code: 'session_ended',
      notice: 'admin_force_logout',
    });
  });

  it('refresh accepts the newest and the previous token, and an older one ends the session', async () => {
    const admin = await createAdmin();
    const { refreshToken: r0, sessionIdText } = await mobileLogin(admin);

    const first = await refresh(r0);
    expect(first.status).toBe(200);
    const r1 = readBodyString(first, 'refresh_token');

    const retry = await refresh(r0);
    expect(retry.status).toBe(200);

    const reused = await refresh(r1);
    expect(reused.status).toBe(401);
    expect(reused.body).toEqual({
      message: 'Invalid refresh token',
      code: 'session_ended',
      notice: 'security',
    });
    expect((await sessionRow(sessionIdText)).revoked_reason).toBe('refresh_reuse');
  });

  it('two concurrent refreshes of one token both succeed and the session stays active', async () => {
    const admin = await createAdmin();
    const { refreshToken: r0, sessionIdText } = await mobileLogin(admin);

    const [a, b] = await Promise.all([refresh(r0), refresh(r0)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);

    const row = await sessionRow(sessionIdText);
    expect(row.revoked_reason).toBeNull();
    const latest = [a, b]
      .map((res) => readBodyString(res, 'refresh_token'))
      .find((token) => sha256Hex(readClaim(token, 'rid')) === row.refresh_token_hash);
    if (latest === undefined) {
      throw new Error('Neither refresh response holds the current refresh token');
    }

    const next = await refresh(latest);
    expect(next.status).toBe(200);
  });

  it('revoke ends the mobile session, and a later refresh is a plain 401', async () => {
    const admin = await createAdmin();
    const { refreshToken, sessionIdText } = await mobileLogin(admin);

    const revoke = await request(app)
      .post(`${authBase}/mobile/revoke`)
      .send({ refresh_token: refreshToken });
    expect(revoke.status).toBe(200);
    expect(revoke.body).toEqual({ message: 'Mobile token family revoked' });
    expect((await sessionRow(sessionIdText)).revoked_reason).toBe('signed_out');

    const later = await refresh(refreshToken);
    expect(later.status).toBe(401);
    expect(later.body).toEqual({ message: 'Invalid refresh token' });
  });

  it('stores the device_label a mobile login sends, else the client platform', async () => {
    const admin = await createAdmin();
    const labeled = await mobileLogin(admin, { deviceLabel: 'Pixel 8' });
    const fromPlatform = await mobileLogin(admin, { platform: 'ios' });

    expect((await sessionRow(labeled.sessionIdText)).device_label).toBe('Pixel 8');
    expect((await sessionRow(fromPlatform.sessionIdText)).device_label).toBe('iOS');
  });

  it('deleting an admin deletes its sessions', async () => {
    const admin = await createAdmin();
    await webLogin(admin);
    await mobileLogin(admin);

    await adminService.delete(admin.id);
    createdAdminIds.delete(admin.id);

    const rows = await query(
      `SELECT count(*)::int AS count FROM admin_session WHERE admin_account_id = $1`,
      [admin.id]
    );
    expect(rows[0]).toEqual({ count: 0 });
  });
});
