import { app } from '@mgmt-api/app.js';
import { config } from '@mgmt-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';

const { adminAccountGetMock } = vi.hoisted(() => {
  const adminAccountGetMock = vi.fn<
    Promise<{ id: number; id_text: string; created_at: Date } | null>,
    [number]
  >(async (id: number) => {
    if (id === 1 || id === 2) {
      return {
        id,
        id_text: String(id),
        created_at: new Date('2020-01-01T00:00:00.000Z'),
      };
    }
    return null;
  });
  return { adminAccountGetMock };
});

vi.mock('@mgmt-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async get(id: number) {
      return adminAccountGetMock(id);
    }
  }
  return { AdminAccountService };
});

const adminBase = `${config.api.prefix}${config.api.version}/admin-account`;

describe('GET admin-account/:id authz', () => {
  beforeEach(() => {
    adminAccountGetMock.mockClear();
  });

  it('returns admin data when the path id matches the JWT subject', async () => {
    const token = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app).get(`${adminBase}/1`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      id_text: '1',
      created_at: expect.any(String),
    });
    expect(adminAccountGetMock).toHaveBeenCalled();
  });

  it('returns 403 when the path id does not match the JWT subject', async () => {
    const token = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app).get(`${adminBase}/2`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ message: 'Forbidden' });
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get(`${adminBase}/1`);

    expect(res.status).toBe(401);
  });

  it('returns 404 when admin account does not exist', async () => {
    // First call: auth middleware verifyToken (needs valid account for id 2)
    // Second call: route handler get (returns null to simulate not found)
    adminAccountGetMock
      .mockResolvedValueOnce({
        id: 2,
        id_text: 'admin-2',
        created_at: new Date('2020-01-01T00:00:00.000Z'),
      })
      .mockResolvedValueOnce(null);

    const token = jwt.sign({ id: 2 }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app).get(`${adminBase}/2`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
