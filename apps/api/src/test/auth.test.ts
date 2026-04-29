import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  withMutedExpectedErrorLogs,
} from './helpers/index.js';

const TEST_EMAIL = 'auth-test@example.com';
const TEST_ACCOUNT_ID_TEXT = 'auth-test-user';
const TEST_PASSWORD = 'test-password-123';
const TEST_USER_ID = 1;
const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';

const { getByEmailMock, getMock, verifyPasswordMock, getSenderGuidByAccountIdMock } = vi.hoisted(
  () => ({
    getByEmailMock: vi.fn(async () => ({
      id: TEST_USER_ID,
      id_text: TEST_ACCOUNT_ID_TEXT,
      verified: true,
      account_credentials: { email: TEST_EMAIL, password: 'hashed-password' },
    })),
    getMock: vi.fn(async () => ({
      id: TEST_USER_ID,
      id_text: TEST_ACCOUNT_ID_TEXT,
      account_credentials: { email: TEST_EMAIL },
      account_membership_status: {
        membership_expires_at: new Date(Date.now() + 86400000 * 365),
      },
    })),
    verifyPasswordMock: vi.fn(async () => true),
    getSenderGuidByAccountIdMock: vi.fn(async () => null),
  })
);

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    async getByEmail(email: string, _config?: { relations?: string[] }): Promise<unknown> {
      return getByEmailMock(email);
    }

    async get(
      id: number,
      _options?: { relations?: string[] }
    ): Promise<{
      id: number;
      account_credentials: { email: string; password?: string };
      account_membership_status: { membership_expires_at: Date };
    } | null> {
      return getMock(id);
    }
  }

  class MockAccountMetaboostService {
    async getSenderGuidByAccountId(accountId: number): Promise<string | null> {
      return getSenderGuidByAccountIdMock(accountId);
    }
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountMetaboostService: MockAccountMetaboostService,
  };
});

vi.mock('../lib/auth/password.js', () => ({
  verifyPassword: (...args: unknown[]) => verifyPasswordMock(...args),
}));

let authBase: string;

describe('auth routes', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    authBase = (await getBaseApiUrl()) + '/auth';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  describe('POST /auth/login', () => {
    it('returns 200 and sets JWT cookie with valid credentials', async () => {
      getByEmailMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_ACCOUNT_ID_TEXT,
        verified: true,
        account_credentials: { email: TEST_EMAIL, password: 'hashed-password' },
      });
      verifyPasswordMock.mockResolvedValueOnce(true);

      const res = await request(app)
        .post(`${authBase}/login`)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Authenticated successfully');
      expect(res.headers['set-cookie']).toBeDefined();
      const cookieHeader = res.headers['set-cookie'] as string[];
      const hasJwtCookie = cookieHeader.some((c) => c.startsWith('jwt='));
      expect(hasJwtCookie).toBe(true);
    });

    it('returns 401 when email is not found', async () => {
      getByEmailMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`${authBase}/login`)
        .send({ email: 'nonexistent@example.com', password: TEST_PASSWORD });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('returns 401 when password is incorrect', async () => {
      getByEmailMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        verified: true,
        account_credentials: { email: TEST_EMAIL, password: 'hashed-password' },
      });
      verifyPasswordMock.mockResolvedValueOnce(false);

      const res = await request(app)
        .post(`${authBase}/login`)
        .send({ email: TEST_EMAIL, password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('returns 403 when account is not verified', async () => {
      getByEmailMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        verified: false,
        account_credentials: { email: TEST_EMAIL, password: 'hashed-password' },
      });
      verifyPasswordMock.mockResolvedValueOnce(true);

      const res = await request(app)
        .post(`${authBase}/login`)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Account not verified.');
    });

    it('returns 401 when password is missing', async () => {
      const res = await request(app).post(`${authBase}/login`).send({ email: TEST_EMAIL });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('returns 429 when rate limit is exceeded', async () => {
      getByEmailMock.mockResolvedValue(null);

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post(`${authBase}/login`)
          .send({ email: `ratelimit-${i}@example.com`, password: TEST_PASSWORD });
      }

      const res = await request(app)
        .post(`${authBase}/login`)
        .send({ email: 'ratelimit-6@example.com', password: TEST_PASSWORD });

      expect(res.status).toBe(429);
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 200 and clears the auth cookie', async () => {
      const res = await request(app).post(`${authBase}/logout`).set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
      const cookieHeader = res.headers['set-cookie'] as string[] | undefined;
      if (cookieHeader) {
        const hasClearCookie = cookieHeader.some(
          (c) => c.includes('jwt=') && c.includes('Expires')
        );
        expect(hasClearCookie).toBe(true);
      }
    });

    it('returns 200 without auth (idempotent)', async () => {
      const res = await request(app).post(`${authBase}/logout`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });

  describe('GET /auth/me', () => {
    it('returns 200 with account data when authenticated', async () => {
      getMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      getSenderGuidByAccountIdMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`${authBase}/me`)
        .set(authHeaders(TEST_USER_ID, TEST_ACCOUNT_ID_TEXT));

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(TEST_USER_ID);
      expect(res.body.account_credentials).toBeDefined();
      expect(res.body.account_credentials.password).toBeUndefined();
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${authBase}/me`);

      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid JWT', async () => {
      const res = await withMutedExpectedErrorLogs(async () =>
        request(app).get(`${authBase}/me`).set('Authorization', 'Bearer invalid-token')
      );

      expect(res.status).toBe(401);
    });

    it('returns 401 when JWT is missing id', async () => {
      const tokenMissingId = jwt.sign({ id_text: TEST_ACCOUNT_ID_TEXT }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const res = await withMutedExpectedErrorLogs(async () =>
        request(app).get(`${authBase}/me`).set('Authorization', `Bearer ${tokenMissingId}`)
      );

      expect(res.status).toBe(401);
    });

    it('returns 401 when JWT is missing id_text', async () => {
      const tokenMissingIdText = jwt.sign({ id: TEST_USER_ID }, JWT_SECRET, { expiresIn: '1h' });
      const res = await withMutedExpectedErrorLogs(async () =>
        request(app).get(`${authBase}/me`).set('Authorization', `Bearer ${tokenMissingIdText}`)
      );

      expect(res.status).toBe(401);
    });

    it('returns 401 when JWT id is not a number', async () => {
      const tokenStringId = jwt.sign({ id: '1', id_text: TEST_ACCOUNT_ID_TEXT }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const res = await withMutedExpectedErrorLogs(async () =>
        request(app).get(`${authBase}/me`).set('Authorization', `Bearer ${tokenStringId}`)
      );

      expect(res.status).toBe(401);
    });
  });

  describe('GET /auth/check-session', () => {
    it('returns 200 with valid auth', async () => {
      const res = await request(app)
        .get(`${authBase}/check-session`)
        .set(authHeaders(TEST_USER_ID, TEST_ACCOUNT_ID_TEXT));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Valid auth session');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${authBase}/check-session`);

      expect(res.status).toBe(401);
    });
  });
});
