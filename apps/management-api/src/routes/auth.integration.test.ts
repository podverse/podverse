import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import {
  adminSessionStoreStub,
  TEST_ADMIN_SESSION_CLAIMS,
  TEST_ADMIN_SESSION_ID_TEXT,
} from '@management-api/test/adminSessionStoreStub.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  API_KEY_TOKEN_PREFIX,
  COOKIE_WRITE_INTENT_HEADER,
  COOKIE_WRITE_INTENT_VALUE,
} from '@podverse/helpers';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const ADMIN_AUTH_COOKIE_NAME = 'pv_mgmt_auth';

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

const mockSuperuserAdmin = {
  id: 1,
  id_text: 'pvMgtAu001',
  admin_account_role_id: 1,
  admin_account_role: { role: 'superuser' },
  admin_account_credentials: {
    email: 'admin@example.com',
    username: null,
    password: 'hash',
    id: 1,
    admin_account_id: 1,
  },
  permissions: {
    id: 1,
    admin_account_id: 1,
    feedsCrud: 15,
    feedTakedownReasonsCrud: 15,
    adminsCrud: 15,
    statsCrud: 15,
    billingPricesCrud: 15,
    bucketCrud: 15,
    created_at: new Date('2020-01-01T00:00:00.000Z'),
    updated_at: new Date('2020-01-01T00:00:00.000Z'),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const { verifyPasswordMock, getWithRoleAndPermissionsMock } = vi.hoisted(() => ({
  verifyPasswordMock: vi.fn<
    (
      email: string,
      password: string
    ) => Promise<{ id: number; id_text: string; created_at: Date } | null>
  >(async () => ({
    id: 1,
    id_text: 'pvMgtAu001',
    created_at: new Date('2020-01-01T00:00:00.000Z'),
  })),
  getWithRoleAndPermissionsMock: vi.fn<(id: number) => Promise<typeof mockSuperuserAdmin | null>>(
    async (id: number) => {
      if (id === 1) {
        return mockSuperuserAdmin;
      }
      return null;
    }
  ),
}));

vi.mock('@management-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async verifyPassword(email: string, password: string) {
      return verifyPasswordMock(email, password);
    }
    async getWithRoleAndPermissions(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
  }
  return { AdminAccountService };
});

// Avoid loading management orm/entities (auditLog imports orm DataSource; see feeds test).
vi.mock('@management-api/lib/database/auditLog.js', () => {
  class AuditLogService {
    async record() {
      return;
    }
  }
  return { AuditLogService };
});

const authBase = `${config.api.prefix}${config.api.version}/auth`;

const adminAuthHeaders = (userId: number = 1): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign(
    { id: userId, id_text: 'pvMgtAu001', ...TEST_ADMIN_SESSION_CLAIMS },
    JWT_SECRET,
    { expiresIn: '1h' }
  )}`,
});

const signRefreshToken = (claims: Record<string, unknown>): string =>
  jwt.sign(
    {
      id: 1,
      id_text: 'pvMgtAu001',
      sid: TEST_ADMIN_SESSION_ID_TEXT,
      rid: 'raw-refresh-id',
      scope: 'podverse_management_mobile',
      token_use: 'refresh',
      ...claims,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

describe('management-api auth routes', () => {
  beforeEach(() => {
    verifyPasswordMock.mockClear();
    getWithRoleAndPermissionsMock.mockClear();
    for (const stub of Object.values(adminSessionStoreStub)) {
      stub.mockClear();
    }
  });

  describe('POST /auth/login', () => {
    it('returns 200 and sets JWT cookie with valid credentials', async () => {
      verifyPasswordMock.mockResolvedValueOnce({
        id: 1,
        id_text: 'pvMgtAu001',
        created_at: new Date('2020-01-01T00:00:00.000Z'),
      });

      const res = await request(app)
        .post(`${authBase}/login`)
        .send({ email: 'admin@example.com', password: 'test-password' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Authenticated successfully');
      const cookieToken = authCookieValue(res);
      expect(cookieToken).toBeTruthy();
      expect(jwt.decode(cookieToken ?? '')).toMatchObject({
        id: 1,
        id_text: 'pvMgtAu001',
        sid: TEST_ADMIN_SESSION_ID_TEXT,
        token_use: 'web',
      });
      expect(adminSessionStoreStub.startAdminSession).toHaveBeenCalledWith(
        expect.objectContaining({ adminAccountId: 1, clientType: 'web', withRefreshToken: false })
      );
    });

    it('ends the session in a validly signed cookie the browser already carries', async () => {
      const previousCookie = jwt.sign(
        { id: 1, id_text: 'pvMgtAu001', sid: 'pvMgtSesOld1', token_use: 'web' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post(`${authBase}/login`)
        .set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=${previousCookie}`])
        .send({ email: 'admin@example.com', password: 'test-password' });

      expect(res.status).toBe(200);
      expect(adminSessionStoreStub.endAdminSession).toHaveBeenCalledWith({
        adminAccountId: 1,
        sessionIdText: 'pvMgtSesOld1',
        reason: 'signed_out',
      });
    });

    it('returns 401 with incorrect email', async () => {
      verifyPasswordMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`${authBase}/login`)
        .send({ email: 'nonexistent@example.com', password: 'test-password' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials.');
    });

    it('returns 401 with incorrect password', async () => {
      verifyPasswordMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`${authBase}/login`)
        .send({ email: 'admin@example.com', password: 'wrong-password' });

      expect(res.status).toBe(401);
    });

    it('returns 401 with missing password', async () => {
      const res = await request(app).post(`${authBase}/login`).send({ email: 'admin@example.com' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 200 and clears auth cookie', async () => {
      const res = await request(app).post(`${authBase}/logout`).set(adminAuthHeaders());

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
      expect(authCookieValue(res)).toBe('');
      expect(adminSessionStoreStub.endAdminSession).toHaveBeenCalledWith({
        adminAccountId: 1,
        sessionIdText: TEST_ADMIN_SESSION_ID_TEXT,
        reason: 'signed_out',
      });
    });

    it('returns 200 without auth (idempotent)', async () => {
      const res = await request(app).post(`${authBase}/logout`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
      expect(authCookieValue(res)).toBe('');
      expect(adminSessionStoreStub.endAdminSession).not.toHaveBeenCalled();
    });

    it('rejects a cookie logout without the intent header and does not end the session', async () => {
      const cookie = jwt.sign(
        { id: 1, id_text: 'pvMgtAu001', sid: TEST_ADMIN_SESSION_ID_TEXT, token_use: 'web' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const res = await request(app)
        .post(`${authBase}/logout`)
        .set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=${cookie}`]);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
      expect(authCookieValue(res)).toBeNull();
      expect(adminSessionStoreStub.endAdminSession).not.toHaveBeenCalled();
    });

    it('rejects a cookie logout when the intent header is wrong and does not end the session', async () => {
      const cookie = jwt.sign(
        { id: 1, id_text: 'pvMgtAu001', sid: TEST_ADMIN_SESSION_ID_TEXT, token_use: 'web' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const res = await request(app)
        .post(`${authBase}/logout`)
        .set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=${cookie}`])
        .set(COOKIE_WRITE_INTENT_HEADER, 'cross-site');

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
      expect(authCookieValue(res)).toBeNull();
      expect(adminSessionStoreStub.endAdminSession).not.toHaveBeenCalled();
    });

    it('ends the session when a cookie logout sends the intent header', async () => {
      const cookie = jwt.sign(
        { id: 1, id_text: 'pvMgtAu001', sid: TEST_ADMIN_SESSION_ID_TEXT, token_use: 'web' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const res = await request(app)
        .post(`${authBase}/logout`)
        .set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=${cookie}`])
        .set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
      expect(adminSessionStoreStub.endAdminSession).toHaveBeenCalledWith({
        adminAccountId: 1,
        sessionIdText: TEST_ADMIN_SESSION_ID_TEXT,
        reason: 'signed_out',
      });
    });

    it('ends the session for a bearer logout without the intent header', async () => {
      const res = await request(app).post(`${authBase}/logout`).set(adminAuthHeaders());

      expect(res.status).toBe(200);
      expect(adminSessionStoreStub.endAdminSession).toHaveBeenCalledWith({
        adminAccountId: 1,
        sessionIdText: TEST_ADMIN_SESSION_ID_TEXT,
        reason: 'signed_out',
      });
    });
  });

  describe('GET /auth/me', () => {
    it('returns 200 with admin data including role and permissions when authenticated', async () => {
      const res = await request(app).get(`${authBase}/me`).set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 1,
        id_text: 'pvMgtAu001',
        email: 'admin@example.com',
        username: null,
        role: 'superuser',
        permissions: {
          feeds_crud: 15,
          feed_takedown_reasons_crud: 15,
          admins_crud: 15,
        },
      });
    });

    it('prefers Authorization Bearer over a stale pv_mgmt_auth cookie', async () => {
      const res = await request(app)
        .get(`${authBase}/me`)
        .set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=not.a.valid.jwt`])
        .set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
      expect(res.body.id_text).toBe('pvMgtAu001');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${authBase}/me`);

      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid JWT', async () => {
      const res = await request(app)
        .get(`${authBase}/me`)
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('returns 401 when JWT is missing id', async () => {
      const tokenMissingId = jwt.sign({ scope: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get(`${authBase}/me`)
        .set('Authorization', `Bearer ${tokenMissingId}`);

      expect(res.status).toBe(401);
    });

    it('returns 401 when JWT id is not a number', async () => {
      const tokenStringId = jwt.sign({ id: '1' }, JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get(`${authBase}/me`)
        .set('Authorization', `Bearer ${tokenStringId}`);

      expect(res.status).toBe(401);
    });

    it('returns a plain 401 for a signed token that names no session, without a session lookup', async () => {
      const tokenWithoutSession = jwt.sign({ id: 1, id_text: 'pvMgtAu001' }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const res = await request(app)
        .get(`${authBase}/me`)
        .set('Authorization', `Bearer ${tokenWithoutSession}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'Unauthorized' });
      expect(adminSessionStoreStub.checkAdminSession).not.toHaveBeenCalled();
    });

    it('returns 401 for a refresh token sent as a bearer token', async () => {
      const res = await request(app)
        .get(`${authBase}/me`)
        .set('Authorization', `Bearer ${signRefreshToken({})}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'Unauthorized' });
    });

    it('returns 401 for a Podverse API key sent as a bearer token, without a session lookup', async () => {
      const apiKey = `${API_KEY_TOKEN_PREFIX}${'a'.repeat(43)}`;
      const res = await request(app).get(`${authBase}/me`).set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'Unauthorized' });
      expect(adminSessionStoreStub.checkAdminSession).not.toHaveBeenCalled();

      const cookieToken = jwt.sign(
        { id: 1, id_text: 'pvMgtAu001', ...TEST_ADMIN_SESSION_CLAIMS },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const withCookie = await request(app)
        .get(`${authBase}/me`)
        .set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=${cookieToken}`])
        .set('Authorization', `Bearer ${apiKey}`);

      expect(withCookie.status).toBe(401);
      expect(withCookie.body).toEqual({ message: 'Unauthorized' });
      expect(adminSessionStoreStub.checkAdminSession).not.toHaveBeenCalled();
    });

    it('returns 401 with the notice when the session was ended elsewhere', async () => {
      adminSessionStoreStub.checkAdminSession.mockResolvedValueOnce({
        kind: 'ended',
        notice: 'signed_out_elsewhere',
      });

      const res = await request(app).get(`${authBase}/me`).set(adminAuthHeaders(1));

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        message: 'Unauthorized',
        code: 'session_ended',
        notice: 'signed_out_elsewhere',
      });
      expect(authCookieValue(res)).toBeNull();
    });

    it('clears the cookie on a 401 for a cookie-sourced token', async () => {
      const webTokenWithoutSession = jwt.sign(
        { id: 1, id_text: 'pvMgtAu001', token_use: 'web' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const res = await request(app)
        .get(`${authBase}/me`)
        .set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=${webTokenWithoutSession}`]);

      expect(res.status).toBe(401);
      expect(authCookieValue(res)).toBe('');
    });

    it('sets session_id_text from the token on an authenticated request', async () => {
      const webToken = jwt.sign(
        { id: 1, id_text: 'pvMgtAu001', sid: TEST_ADMIN_SESSION_ID_TEXT, token_use: 'web' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const res = await request(app)
        .get(`${authBase}/me`)
        .set('Cookie', [`${ADMIN_AUTH_COOKIE_NAME}=${webToken}`]);

      expect(res.status).toBe(200);
      expect(adminSessionStoreStub.checkAdminSession).toHaveBeenCalledWith({
        adminAccountId: 1,
        sessionIdText: TEST_ADMIN_SESSION_ID_TEXT,
      });
      expect(authCookieValue(res)).toBeNull();
    });
  });

  describe('GET / (health check)', () => {
    it('returns 200 JSON on unversioned root for informal status', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', message: 'Management API is online' });
    });

    it('returns 200 with status message', async () => {
      const baseUrl = `${config.api.prefix}${config.api.version}`;
      const res = await request(app).get(`${baseUrl}/`);

      expect(res.status).toBe(200);
    });

    it('returns 200 on /health', async () => {
      const baseUrl = `${config.api.prefix}${config.api.version}`;
      const res = await request(app).get(`${baseUrl}/health`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', message: 'The server is running.' });
    });

    it('returns 503 on /health/ready when data sources are not initialized', async () => {
      const baseUrl = `${config.api.prefix}${config.api.version}`;
      const res = await request(app).get(`${baseUrl}/health/ready`);

      expect(res.status).toBe(503);
      expect(res.body).toMatchObject({ status: 'unavailable' });
    });

    it('returns 404 on /extensions/prometheus/metrics (not served by app; sidecar-only scrape)', async () => {
      const baseUrl = `${config.api.prefix}${config.api.version}`;
      const res = await request(app).get(`${baseUrl}/extensions/prometheus/metrics`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /auth/mobile/*', () => {
    it('issues mobile token pair from credentials', async () => {
      const res = await request(app)
        .post(`${authBase}/mobile/token`)
        .send({ email: 'admin@example.com', password: 'test-password' });

      expect(res.status).toBe(200);
      expect(res.body.token_type).toBe('Bearer');
      expect(typeof res.body.access_token).toBe('string');
      expect(typeof res.body.refresh_token).toBe('string');
      expect(jwt.decode(res.body.access_token)).toMatchObject({
        sid: TEST_ADMIN_SESSION_ID_TEXT,
        scope: 'podverse_management_mobile',
        token_use: 'access',
      });
      expect(jwt.decode(res.body.refresh_token)).toMatchObject({
        sid: TEST_ADMIN_SESSION_ID_TEXT,
        scope: 'podverse_management_mobile',
        token_use: 'refresh',
      });
    });

    it('labels the mobile session from device_label, else the client platform header', async () => {
      await request(app)
        .post(`${authBase}/mobile/token`)
        .send({ email: 'admin@example.com', password: 'test-password', device_label: 'Pixel 8' });
      await request(app)
        .post(`${authBase}/mobile/token`)
        .set('X-Podverse-Client-Platform', 'ios')
        .send({ email: 'admin@example.com', password: 'test-password' });

      expect(adminSessionStoreStub.startAdminSession).toHaveBeenNthCalledWith(1, {
        adminAccountId: 1,
        clientType: 'mobile',
        deviceLabel: 'Pixel 8',
        withRefreshToken: true,
      });
      expect(adminSessionStoreStub.startAdminSession).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ deviceLabel: 'iOS' })
      );
    });

    it('returns 400 for a refresh with no refresh_token', async () => {
      const res = await request(app).post(`${authBase}/mobile/refresh`).send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'refresh_token is required' });
    });

    it('returns 401 with the notice when a refresh finds the session ended', async () => {
      adminSessionStoreStub.rotateAdminRefreshToken.mockResolvedValueOnce({
        kind: 'ended',
        notice: 'security',
      });

      const res = await request(app)
        .post(`${authBase}/mobile/refresh`)
        .send({ refresh_token: signRefreshToken({}) });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        message: 'Invalid refresh token',
        code: 'session_ended',
        notice: 'security',
      });
    });

    it('rejects a refresh token without the management mobile scope', async () => {
      const res = await request(app)
        .post(`${authBase}/mobile/refresh`)
        .send({ refresh_token: signRefreshToken({ scope: 'podverse_app_mobile' }) });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'Invalid refresh token' });
      expect(adminSessionStoreStub.rotateAdminRefreshToken).not.toHaveBeenCalled();
    });

    it('revoke answers 200 for no body and an invalid token without ending a session', async () => {
      const noBody = await request(app).post(`${authBase}/mobile/revoke`);
      const invalid = await request(app)
        .post(`${authBase}/mobile/revoke`)
        .send({ refresh_token: 'not-a-jwt' });

      expect(noBody.status).toBe(200);
      expect(noBody.body).toEqual({ message: 'Mobile token family revoked' });
      expect(invalid.status).toBe(200);
      expect(invalid.body).toEqual({ message: 'Mobile token family revoked' });
      expect(adminSessionStoreStub.endAdminSession).not.toHaveBeenCalled();
    });

    it('revoke ends the session named by a valid refresh token', async () => {
      const res = await request(app)
        .post(`${authBase}/mobile/revoke`)
        .send({ refresh_token: signRefreshToken({}) });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Mobile token family revoked' });
      expect(adminSessionStoreStub.endAdminSession).toHaveBeenCalledWith({
        adminAccountId: 1,
        sessionIdText: TEST_ADMIN_SESSION_ID_TEXT,
        reason: 'signed_out',
      });
    });

    it('refreshes from a still-valid refresh JWT', async () => {
      const issue = await request(app)
        .post(`${authBase}/mobile/token`)
        .send({ email: 'admin@example.com', password: 'test-password' });
      const refreshToken = issue.body.refresh_token as string;

      const refreshOne = await request(app)
        .post(`${authBase}/mobile/refresh`)
        .send({ refresh_token: refreshToken });
      expect(refreshOne.status).toBe(200);

      const refreshAgain = await request(app)
        .post(`${authBase}/mobile/refresh`)
        .send({ refresh_token: refreshToken });
      expect(refreshAgain.status).toBe(200);
      expect(typeof refreshAgain.body.access_token).toBe('string');
    });

    it('rejects an access token used as a refresh token', async () => {
      const issue = await request(app)
        .post(`${authBase}/mobile/token`)
        .send({ email: 'admin@example.com', password: 'test-password' });

      const refreshWithAccess = await request(app)
        .post(`${authBase}/mobile/refresh`)
        .send({ refresh_token: issue.body.access_token });
      expect(refreshWithAccess.status).toBe(401);
    });
  });
});
