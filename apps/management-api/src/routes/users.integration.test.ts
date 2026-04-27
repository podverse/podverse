import { app } from '@mgmt-api/app.js';
import { config } from '@mgmt-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const usersBase = `${config.api.prefix}${config.api.version}/users`;

const { readQueryMock, readWriteQueryMock, hashPasswordMock, generateRandomIdTextMock } =
  vi.hoisted(() => ({
    readQueryMock: vi.fn(),
    readWriteQueryMock: vi.fn(),
    hashPasswordMock: vi.fn<Promise<string>, [string]>(async (p: string) => `hashed_${p}`),
    generateRandomIdTextMock: vi.fn<string, []>(() => 'abc123XYZ'),
  }));

vi.mock('@mgmt-api/orm/db/appDb.js', () => ({
  AppDbDataSourceRead: { query: readQueryMock },
  AppDbDataSourceReadWrite: { query: readWriteQueryMock },
}));

vi.mock('@podverse/orm', () => ({
  hashPassword: (p: string) => hashPasswordMock(p),
  generateRandomIdText: () => generateRandomIdTextMock(),
}));

const superuserAuthHeaders = (): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: 1, id_text: 'pvMgtSu001' }, JWT_SECRET, { expiresIn: '1h' })}`,
});

const adminAuthHeaders = (): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: 2, id_text: 'pvMgtAd002' }, JWT_SECRET, { expiresIn: '1h' })}`,
});

const _unauthenticatedHeaders = (): { Authorization: string } => ({
  Authorization: 'Bearer invalid-token',
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /users', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(usersBase);
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-superuser', async () => {
    readQueryMock.mockResolvedValueOnce([{ total: 0 }]);
    const res = await request(app).get(usersBase).set(adminAuthHeaders());
    expect(res.status).toBe(403);
  });

  it('returns paginated users for superuser', async () => {
    readQueryMock.mockResolvedValueOnce([{ total: 2 }]); // count query
    readQueryMock.mockResolvedValueOnce([
      {
        id: 1,
        id_text: 'abc123',
        verified: true,
        sharable_status_id: 3,
        created_at: new Date('2025-01-01'),
        email: 'user1@example.com',
        username: 'user1',
      },
      {
        id: 2,
        id_text: 'def456',
        verified: false,
        sharable_status_id: 3,
        created_at: new Date('2025-02-01'),
        email: null,
        username: 'user2',
      },
    ]);

    const res = await request(app).get(usersBase).set(superuserAuthHeaders());

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    expect(res.body.users[0].email).toBe('user1@example.com');
    expect(res.body.users[1].username).toBe('user2');
    expect(res.body.pagination).toEqual({ page: 1, limit: 25, total: 2, totalPages: 1 });
  });

  it('supports search query parameter', async () => {
    readQueryMock.mockResolvedValueOnce([{ total: 1 }]);
    readQueryMock.mockResolvedValueOnce([
      {
        id: 1,
        id_text: 'abc123',
        verified: true,
        sharable_status_id: 3,
        created_at: new Date(),
        email: 'found@example.com',
        username: null,
      },
    ]);

    const res = await request(app).get(`${usersBase}?search=found`).set(superuserAuthHeaders());

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
  });
});

describe('GET /users/:id', () => {
  it('returns user by id', async () => {
    readQueryMock.mockResolvedValueOnce([
      {
        id: 1,
        id_text: 'abc123',
        verified: true,
        sharable_status_id: 3,
        created_at: new Date('2025-01-01'),
        email: 'user1@example.com',
        username: 'user1',
      },
    ]);

    const res = await request(app).get(`${usersBase}/1`).set(superuserAuthHeaders());

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('user1@example.com');
    expect(res.body.user.username).toBe('user1');
  });

  it('returns 404 for non-existent user', async () => {
    readQueryMock.mockResolvedValueOnce([]);

    const res = await request(app).get(`${usersBase}/99999`).set(superuserAuthHeaders());

    expect(res.status).toBe(404);
  });
});

describe('PATCH /users/:id', () => {
  it('updates user email and username', async () => {
    readQueryMock.mockResolvedValueOnce([{ id: 1 }]); // existence check
    readQueryMock.mockResolvedValueOnce([]); // duplicate check
    readWriteQueryMock.mockResolvedValueOnce(undefined); // update account
    readWriteQueryMock.mockResolvedValueOnce(undefined); // update credentials
    readQueryMock.mockResolvedValueOnce([
      {
        id: 1,
        id_text: 'abc123',
        verified: true,
        sharable_status_id: 3,
        created_at: new Date(),
        email: 'new@example.com',
        username: 'newname',
      },
    ]);

    const res = await request(app)
      .patch(`${usersBase}/1`)
      .set(superuserAuthHeaders())
      .send({ email: 'new@example.com', username: 'newname' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('new@example.com');
  });

  it('returns 409 for duplicate email', async () => {
    readQueryMock.mockResolvedValueOnce([{ id: 1 }]); // existence check
    readQueryMock.mockResolvedValueOnce([{ id: 2 }]); // duplicate check

    const res = await request(app)
      .patch(`${usersBase}/1`)
      .set(superuserAuthHeaders())
      .send({ email: 'taken@example.com' });

    expect(res.status).toBe(409);
  });

  it('returns 404 for non-existent user', async () => {
    readQueryMock.mockResolvedValueOnce([]); // existence check

    const res = await request(app)
      .patch(`${usersBase}/99999`)
      .set(superuserAuthHeaders())
      .send({ email: 'x@example.com' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /users/:id', () => {
  it('deletes a user', async () => {
    readQueryMock.mockResolvedValueOnce([{ id: 1 }]);
    readWriteQueryMock.mockResolvedValueOnce(undefined);

    const res = await request(app).delete(`${usersBase}/1`).set(superuserAuthHeaders());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User deleted');
  });

  it('returns 404 for non-existent user', async () => {
    readQueryMock.mockResolvedValueOnce([]);

    const res = await request(app).delete(`${usersBase}/99999`).set(superuserAuthHeaders());

    expect(res.status).toBe(404);
  });
});

describe('POST /users/:id/change-password', () => {
  it('changes user password', async () => {
    readQueryMock.mockResolvedValueOnce([{ id: 1 }]);
    hashPasswordMock.mockResolvedValueOnce('hashed_newpass');
    readWriteQueryMock.mockResolvedValueOnce(undefined); // update credentials
    readWriteQueryMock.mockResolvedValueOnce(undefined); // delete set-password

    const res = await request(app)
      .post(`${usersBase}/1/change-password`)
      .set(superuserAuthHeaders())
      .send({ password: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password updated');
  });

  it('returns 400 for invalid password', async () => {
    const res = await request(app)
      .post(`${usersBase}/1/change-password`)
      .set(superuserAuthHeaders())
      .send({ password: 'short' });

    expect(res.status).toBe(400);
  });
});

describe('Invite link endpoints', () => {
  describe('GET /users/:id/invite-link', () => {
    it('returns null when no invite link exists', async () => {
      readQueryMock.mockResolvedValueOnce([]);

      const res = await request(app).get(`${usersBase}/1/invite-link`).set(superuserAuthHeaders());

      expect(res.status).toBe(200);
      expect(res.body.invite_link).toBeNull();
    });

    it('returns active invite link', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      readQueryMock.mockResolvedValueOnce([
        { set_password_token: 'test-token', set_password_token_expires_at: futureDate },
      ]);

      const res = await request(app).get(`${usersBase}/1/invite-link`).set(superuserAuthHeaders());

      expect(res.status).toBe(200);
      expect(res.body.invite_link).not.toBeNull();
      expect(res.body.invite_link.url).toContain('test-token');
      expect(res.body.invite_link.is_expired).toBe(false);
    });

    it('returns null for expired invite link', async () => {
      const pastDate = new Date(Date.now() - 1000);
      readQueryMock.mockResolvedValueOnce([
        { set_password_token: 'expired-token', set_password_token_expires_at: pastDate },
      ]);

      const res = await request(app).get(`${usersBase}/1/invite-link`).set(superuserAuthHeaders());

      expect(res.status).toBe(200);
      expect(res.body.invite_link).toBeNull();
    });
  });

  describe('POST /users/:id/invite-link', () => {
    it('generates a new invite link', async () => {
      readQueryMock.mockResolvedValueOnce([{ id: 1 }]); // existence check
      readWriteQueryMock.mockResolvedValueOnce(undefined); // upsert

      const res = await request(app).post(`${usersBase}/1/invite-link`).set(superuserAuthHeaders());

      expect(res.status).toBe(201);
      expect(res.body.invite_link.url).toBeDefined();
      expect(res.body.invite_link.is_expired).toBe(false);
    });

    it('returns 404 for non-existent user', async () => {
      readQueryMock.mockResolvedValueOnce([]);

      const res = await request(app)
        .post(`${usersBase}/99999/invite-link`)
        .set(superuserAuthHeaders());

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /users/:id/invite-link', () => {
    it('revokes invite link', async () => {
      readWriteQueryMock.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .delete(`${usersBase}/1/invite-link`)
        .set(superuserAuthHeaders());

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Invite link revoked');
    });
  });
});

describe('Authz: non-superuser cannot access user endpoints', () => {
  it('rejects list for non-superuser', async () => {
    const res = await request(app).get(usersBase).set(adminAuthHeaders());
    expect(res.status).toBe(403);
  });

  it('rejects get for non-superuser', async () => {
    const res = await request(app).get(`${usersBase}/1`).set(adminAuthHeaders());
    expect(res.status).toBe(403);
  });

  it('rejects delete for non-superuser', async () => {
    const res = await request(app).delete(`${usersBase}/1`).set(adminAuthHeaders());
    expect(res.status).toBe(403);
  });
});
