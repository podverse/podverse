import { app } from '@mgmt-api/app.js';
import { config } from '@mgmt-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const ADMIN_AUTH_COOKIE_NAME = 'pv_mgmt_auth';

const { verifyPasswordMock, getMock } = vi.hoisted(() => ({
  verifyPasswordMock: vi.fn<
    Promise<{ id: number; id_text: string; created_at: Date } | null>,
    [string, string]
  >(async () => ({
    id: 1,
    id_text: 'admin-1',
    created_at: new Date('2020-01-01T00:00:00.000Z'),
  })),
  getMock: vi.fn<Promise<{ id: number; id_text: string; created_at: Date } | null>, [number]>(
    async (id: number) => {
      if (id === 1) {
        return { id: 1, id_text: 'admin-1', created_at: new Date('2020-01-01T00:00:00.000Z') };
      }
      return null;
    }
  ),
}));

vi.mock('@mgmt-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async verifyPassword(email: string, password: string) {
      return verifyPasswordMock(email, password);
    }
    async get(id: number) {
      return getMock(id);
    }
  }
  return { AdminAccountService };
});

const authBase = `${config.api.prefix}${config.api.version}/auth`;

const adminAuthHeaders = (userId: number = 1): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' })}`,
});

describe('management-api auth routes', () => {
  beforeEach(() => {
    verifyPasswordMock.mockClear();
    getMock.mockClear();
  });

  describe('POST /auth/login', () => {
    it('returns 200 and sets JWT cookie with valid credentials', async () => {
      verifyPasswordMock.mockResolvedValueOnce({
        id: 1,
        id_text: 'admin-1',
        created_at: new Date('2020-01-01T00:00:00.000Z'),
      });

      const res = await request(app)
        .post(`${authBase}/login`)
        .send({ email: 'admin@example.com', password: 'test-password' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Authenticated successfully');
      expect(res.headers['set-cookie']).toBeDefined();
      const cookieHeader = res.headers['set-cookie'] as string[];
      const hasAuthCookie = cookieHeader.some((c) => c.startsWith(`${ADMIN_AUTH_COOKIE_NAME}=`));
      expect(hasAuthCookie).toBe(true);
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
      const cookieHeader = res.headers['set-cookie'] as string[] | undefined;
      if (cookieHeader) {
        const hasClearCookie = cookieHeader.some(
          (c) => c.includes(`${ADMIN_AUTH_COOKIE_NAME}=`) && c.includes('Expires')
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
    it('returns 200 with admin data when authenticated', async () => {
      const res = await request(app).get(`${authBase}/me`).set(adminAuthHeaders(1));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 1,
        id_text: 'admin-1',
      });
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
  });

  describe('GET / (health check)', () => {
    it('returns 200 with status message', async () => {
      const baseUrl = `${config.api.prefix}${config.api.version}`;
      const res = await request(app).get(`${baseUrl}/`);

      expect(res.status).toBe(200);
    });
  });
});
