import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import { AppDataSourceRead, AppDataSourceReadWrite } from '@management-api/orm/db/index.js';
import { AdminAccountService } from '@management-api/orm/services/adminAccount.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE } from '@podverse/helpers';

const ADMIN_AUTH_COOKIE_NAME = 'pv_mgmt_auth';
const TEST_PASSWORD = 'AdminSessionTest1!';
const NEW_PASSWORD = 'ChangedAdminPass1';
const CHROME_MAC_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const authBase = `${config.api.prefix}${config.api.version}/auth`;
const adminsBase = `${config.api.prefix}${config.api.version}/admins`;

type TestAdmin = { id: number; email: string };

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

function readBodyString(res: request.Response, field: string): string {
  const value: unknown = Reflect.get(res.body, field);
  if (typeof value !== 'string') {
    throw new Error(`Response body has no ${field}`);
  }
  return value;
}

function readRevokedReason(row: unknown): string | null {
  if (typeof row !== 'object' || row === null) {
    throw new Error('admin_session row is missing');
  }
  const value: unknown = Reflect.get(row, 'revoked_reason');
  if (value === null || typeof value === 'string') {
    return value;
  }
  throw new Error('admin_session.revoked_reason is not text');
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

async function revokedReasons(adminAccountId: number): Promise<Array<string | null>> {
  const rows = await query(
    `SELECT revoked_reason
       FROM admin_session
      WHERE admin_account_id = $1
      ORDER BY id`,
    [adminAccountId]
  );
  return rows.map(readRevokedReason);
}

describe('admin password changes end sessions (real session store)', () => {
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
      // Superuser accounts cannot be deleted through the service.
      await query(`UPDATE admin_account SET admin_account_role_id = 2 WHERE id = $1`, [id]);
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
    const email = `admin-password-session-${Date.now()}-${adminCounter}@example.com`;
    const admin = await adminService.create({ email, password: TEST_PASSWORD });
    createdAdminIds.add(admin.id);
    const verified = await adminService.verifyPassword(email, TEST_PASSWORD);
    if (!verified) {
      throw new Error('Created admin does not verify');
    }
    return { id: admin.id, email };
  }

  /** Accounts are created on the admin role. This one signs in as a superuser. */
  async function createSuperuser(): Promise<TestAdmin> {
    const admin = await createAdmin();
    await query(`UPDATE admin_account SET admin_account_role_id = 1 WHERE id = $1`, [admin.id]);
    return admin;
  }

  async function webLogin(admin: TestAdmin, password: string = TEST_PASSWORD): Promise<string> {
    const res = await request(app)
      .post(`${authBase}/login`)
      .set('User-Agent', CHROME_MAC_USER_AGENT)
      .send({ email: admin.email, password });
    expect(res.status).toBe(200);
    const token = authCookieValue(res);
    if (token === null || token === '') {
      throw new Error('Login set no pv_mgmt_auth cookie');
    }
    return token;
  }

  async function mobileLogin(admin: TestAdmin): Promise<string> {
    const res = await request(app)
      .post(`${authBase}/mobile/token`)
      .send({ email: admin.email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    return readBodyString(res, 'refresh_token');
  }

  function getMeWithCookie(cookie: string): Promise<request.Response> {
    return request(app)
      .get(`${authBase}/me`)
      .set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=${cookie}`]);
  }

  it('redeeming an invite ends every session, and the new password signs in', async () => {
    const admin = await createAdmin();
    const firstCookie = await webLogin(admin);
    const secondCookie = await webLogin(admin);
    const refreshToken = await mobileLogin(admin);
    const { token } = await adminService.upsertInviteToken(admin.id);

    const redeem = await request(app)
      .post(`${adminsBase}/invite-link/redeem`)
      .send({ token, password: NEW_PASSWORD });

    expect(redeem.status).toBe(200);
    expect(redeem.body).toEqual({ message: 'Password updated' });
    expect(await revokedReasons(admin.id)).toEqual([
      'password_changed',
      'password_changed',
      'password_changed',
    ]);

    for (const cookie of [firstCookie, secondCookie]) {
      const me = await getMeWithCookie(cookie);
      expect(me.status).toBe(401);
      expect(me.body).toEqual({
        message: 'Unauthorized',
        code: 'session_ended',
        notice: 'password_changed',
      });
    }

    const refresh = await request(app)
      .post(`${authBase}/mobile/refresh`)
      .send({ refresh_token: refreshToken });
    expect(refresh.status).toBe(401);
    expect(refresh.body).toEqual({
      message: 'Invalid refresh token',
      code: 'session_ended',
      notice: 'password_changed',
    });

    await webLogin(admin, NEW_PASSWORD);
  });

  it('a superuser setting another admin password ends that admin sessions and stays signed in', async () => {
    const adminB = await createAdmin();
    await webLogin(adminB);
    await webLogin(adminB);
    const superuser = await createSuperuser();
    const superuserCookie = await webLogin(superuser);

    const patch = await request(app)
      .patch(`${adminsBase}/${adminB.id}`)
      .set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=${superuserCookie}`])
      .set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE)
      .send({ password: NEW_PASSWORD });

    expect(patch.status).toBe(200);
    expect(await revokedReasons(adminB.id)).toEqual(['admin_password_set', 'admin_password_set']);

    const me = await getMeWithCookie(superuserCookie);
    expect(me.status).toBe(200);
    expect(Reflect.get(me.body, 'id')).toBe(superuser.id);
    expect(await revokedReasons(superuser.id)).toEqual([null]);
  });
});
