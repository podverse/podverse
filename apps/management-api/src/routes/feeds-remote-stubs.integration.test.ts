import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import type { RemoteStubDetail } from '@management-api/lib/feed/feedRemoteStubsAppDb.js';
import { TEST_ADMIN_SESSION_CLAIMS } from '@management-api/test/adminSessionStoreStub.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const stubsBase = `${config.api.prefix}${config.api.version}/feeds/remote-stubs`;

const sampleStub: RemoteStubDetail = {
  id: 9,
  index_provider: 'podcast_index',
  provider_feed_id: '87654321',
  title: 'Stub Show',
  author: 'Host',
  feed_url: 'https://stub.example/feed.xml',
  feed_guid: '11111111-1111-4111-8111-111111111111',
  medium_value: 'podcast',
  alias_count: 1,
  item_stub_count: 1,
  pending_action: null,
  resolved_at: '2026-01-01T00:00:00.000Z',
  created_at: '2025-12-01T00:00:00.000Z',
  image_url: 'https://stub.example/art.jpg',
  aliases: [{ key_kind: 'feed_url', key_value: 'https://stub.example/feed.xml' }],
  item_stubs: [],
  jobs: [],
};

function queuedJob(jobType: string) {
  return {
    id: 44,
    job_type: jobType,
    status: 'pending',
    run_after: new Date('2026-03-01T00:00:00.000Z'),
  };
}

const { getWithRoleAndPermissionsMock, admins } = vi.hoisted(() => {
  function mockAdmin(id: number, idText: string, role: string, feedsCrud: number) {
    return {
      id,
      id_text: idText,
      admin_account_role_id: role === 'superuser' ? 1 : 2,
      admin_account_role: { role },
      admin_account_credentials: { email: `${idText}@example.com` },
      permissions: {
        id,
        admin_account_id: id,
        feedsCrud,
        feedTakedownReasonsCrud: 0,
        adminsCrud: 0,
        statsCrud: 0,
        billingPricesCrud: 0,
        created_at: new Date('2020-01-01T00:00:00.000Z'),
        updated_at: new Date('2020-01-01T00:00:00.000Z'),
      },
      created_at: new Date('2020-01-01T00:00:00.000Z'),
      updated_at: new Date('2020-01-01T00:00:00.000Z'),
    };
  }

  const adminRows = {
    1: mockAdmin(1, 'pvMgtSu001', 'superuser', 15),
    2: mockAdmin(2, 'pvMgtAd002', 'admin', 13),
    3: mockAdmin(3, 'pvMgtAd003', 'admin', 11),
    4: mockAdmin(4, 'pvMgtAd004', 'admin', 14),
    5: mockAdmin(5, 'pvMgtAd005', 'admin', 7),
  };

  return {
    admins: adminRows,
    getWithRoleAndPermissionsMock: vi.fn(async (id: number) => {
      if (id === 1) {
        return adminRows[1];
      }
      if (id === 2) {
        return adminRows[2];
      }
      if (id === 3) {
        return adminRows[3];
      }
      if (id === 4) {
        return adminRows[4];
      }
      if (id === 5) {
        return adminRows[5];
      }
      return null;
    }),
  };
});

const { listStubs, getStub, scheduleRecheck, scheduleRepoint, schedulePromote, deleteStub, audit } =
  vi.hoisted(() => ({
    listStubs: vi.fn(),
    getStub: vi.fn(),
    scheduleRecheck: vi.fn(),
    scheduleRepoint: vi.fn(),
    schedulePromote: vi.fn(),
    deleteStub: vi.fn(),
    audit: vi.fn(),
  }));

vi.mock('@management-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async get(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
    async getWithRoleAndPermissions(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
  }
  return { AdminAccountService };
});

vi.mock('@management-api/lib/feed/feedRemoteStubsAppDb.js', () => ({
  listRemoteStubs: (...args: unknown[]) => listStubs(...args),
  getRemoteStub: (...args: unknown[]) => getStub(...args),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();
  return {
    ...actual,
    scheduleRemoteStubRecheck: (id: number) => scheduleRecheck(id),
    scheduleRemoteStubRepoint: (id: number, providerFeedId: string) =>
      scheduleRepoint(id, providerFeedId),
    scheduleRemoteStubPromote: (indexProvider: string, providerFeedId: string) =>
      schedulePromote(indexProvider, providerFeedId),
    RemoteChannelStubService: class {
      async deleteById(id: number) {
        return deleteStub(id);
      }
    },
  };
});

vi.mock('@management-api/lib/database/auditLog.js', () => {
  class AuditLogService {
    async record(args: unknown) {
      return audit(args);
    }
  }
  return { AuditLogService };
});

const adminAuthHeaders = (userId: number): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign(
    {
      id: userId,
      id_text: admins[userId]?.id_text ?? 'pvMgtSu001',
      ...TEST_ADMIN_SESSION_CLAIMS,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  )}`,
});

const beforeSnapshot = {
  id: 9,
  index_provider: 'podcast_index',
  provider_feed_id: '87654321',
  title: 'Stub Show',
  feed_url: 'https://stub.example/feed.xml',
};

describe('feed remote stub routes', () => {
  beforeEach(() => {
    listStubs.mockReset();
    getStub.mockReset();
    scheduleRecheck.mockReset();
    scheduleRepoint.mockReset();
    schedulePromote.mockReset();
    deleteStub.mockReset();
    audit.mockReset();
    listStubs.mockResolvedValue({ rows: [sampleStub], total: 1 });
    getStub.mockResolvedValue(sampleStub);
    scheduleRecheck.mockResolvedValue(queuedJob('remote-stub-recheck'));
    scheduleRepoint.mockResolvedValue(queuedJob('remote-stub-repoint'));
    schedulePromote.mockResolvedValue(queuedJob('remote-stub-promote'));
    deleteStub.mockResolvedValue(true);
    audit.mockResolvedValue(undefined);
  });

  it('GET /feeds/remote-stubs returns 401 without a session', async () => {
    const res = await request(app).get(stubsBase);
    expect(res.status).toBe(401);
    expect(listStubs).not.toHaveBeenCalled();
  });

  it('GET /feeds/remote-stubs returns 403 without feed read', async () => {
    const res = await request(app).get(stubsBase).set(adminAuthHeaders(2));
    expect(res.status).toBe(403);
    expect(listStubs).not.toHaveBeenCalled();
  });

  it('GET /feeds/remote-stubs/:id returns 403 without feed read', async () => {
    const res = await request(app).get(`${stubsBase}/9`).set(adminAuthHeaders(2));
    expect(res.status).toBe(403);
    expect(getStub).not.toHaveBeenCalled();
  });

  it('GET /feeds/remote-stubs passes validated query values through', async () => {
    listStubs.mockResolvedValue({ rows: [sampleStub], total: 30 });
    const res = await request(app)
      .get(stubsBase)
      .query({
        page: 2,
        limit: 10,
        q: '  Show  ',
        sort: 'title',
        order: 'asc',
      })
      .set(adminAuthHeaders(1));
    expect(res.status).toBe(200);
    expect(listStubs).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      q: 'Show',
      sort: 'title',
      order: 'asc',
    });
    expect(res.body.pagination).toEqual({ page: 2, limit: 10, total: 30, totalPages: 3 });
    expect(res.body.remote_stubs).toHaveLength(1);
  });

  it('GET /feeds/remote-stubs uses the default page, limit, sort, and order', async () => {
    const res = await request(app).get(stubsBase).query({ q: '   ' }).set(adminAuthHeaders(1));
    expect(res.status).toBe(200);
    expect(listStubs).toHaveBeenCalledWith({
      page: 1,
      limit: 25,
      sort: 'created_at',
      order: 'desc',
    });
  });

  it('GET /feeds/remote-stubs rejects an unknown sort and a limit over 100', async () => {
    const unknownSort = await request(app)
      .get(stubsBase)
      .query({ sort: 'nope' })
      .set(adminAuthHeaders(1));
    const overLimit = await request(app)
      .get(stubsBase)
      .query({ limit: 101 })
      .set(adminAuthHeaders(1));
    expect(unknownSort.status).toBe(400);
    expect(overLimit.status).toBe(400);
    expect(listStubs).not.toHaveBeenCalled();
  });

  it('GET /feeds/remote-stubs/:id returns the stub', async () => {
    const res = await request(app).get(`${stubsBase}/9`).set(adminAuthHeaders(1));
    expect(res.status).toBe(200);
    expect(res.body.remote_stub.id).toBe(9);
    expect(res.body.remote_stub.feed_url).toBe('https://stub.example/feed.xml');
  });

  it('GET /feeds/remote-stubs/:id returns 404 when the stub is missing', async () => {
    getStub.mockResolvedValueOnce(null);
    const res = await request(app).get(`${stubsBase}/9`).set(adminAuthHeaders(1));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Remote stub not found');
  });

  it('POST recheck returns 404 when the stub is missing', async () => {
    getStub.mockResolvedValueOnce(null);
    const res = await request(app).post(`${stubsBase}/9/recheck`).set(adminAuthHeaders(1));
    expect(res.status).toBe(404);
    expect(scheduleRecheck).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('POST recheck returns 403 without feed update', async () => {
    const res = await request(app).post(`${stubsBase}/9/recheck`).set(adminAuthHeaders(3));
    expect(res.status).toBe(403);
    expect(scheduleRecheck).not.toHaveBeenCalled();
  });

  it('POST recheck queues a job and audits the update', async () => {
    const res = await request(app).post(`${stubsBase}/9/recheck`).set(adminAuthHeaders(1));
    expect(res.status).toBe(202);
    expect(res.body.job).toEqual({
      id: 44,
      job_type: 'remote-stub-recheck',
      status: 'pending',
      run_after: '2026-03-01T00:00:00.000Z',
    });
    expect(scheduleRecheck).toHaveBeenCalledWith(9);
    expect(scheduleRepoint).not.toHaveBeenCalled();
    expect(schedulePromote).not.toHaveBeenCalled();
    expect(audit).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'update',
        tableName: 'remote_channel_stub',
        rowId: 9,
        beforeSnapshot,
        afterSnapshot: expect.objectContaining({
          ...beforeSnapshot,
          scheduled_job_type: 'remote-stub-recheck',
        }),
      })
    );
  });

  it('POST re-point returns 404 when the stub is missing', async () => {
    getStub.mockResolvedValueOnce(null);
    const res = await request(app)
      .post(`${stubsBase}/9/repoint`)
      .set(adminAuthHeaders(1))
      .send({ provider_feed_id: '424242' });
    expect(res.status).toBe(404);
    expect(scheduleRepoint).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('POST re-point returns 403 without feed update', async () => {
    const res = await request(app)
      .post(`${stubsBase}/9/repoint`)
      .set(adminAuthHeaders(3))
      .send({ provider_feed_id: '424242' });
    expect(res.status).toBe(403);
    expect(scheduleRepoint).not.toHaveBeenCalled();
  });

  it('POST re-point returns 400 for a missing, non-numeric, or leading-zero id', async () => {
    const bodies = [{}, { provider_feed_id: '12ab' }, { provider_feed_id: '0123' }];
    for (const body of bodies) {
      const res = await request(app)
        .post(`${stubsBase}/9/repoint`)
        .set(adminAuthHeaders(1))
        .send(body);
      expect(res.status).toBe(400);
    }
    expect(scheduleRepoint).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('POST re-point returns 400 when the target is the current provider feed id', async () => {
    const res = await request(app)
      .post(`${stubsBase}/9/repoint`)
      .set(adminAuthHeaders(1))
      .send({ provider_feed_id: '87654321' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Target equals the current provider feed id');
    expect(scheduleRepoint).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('POST re-point queues a job and audits the target', async () => {
    const res = await request(app)
      .post(`${stubsBase}/9/repoint`)
      .set(adminAuthHeaders(1))
      .send({ provider_feed_id: '424242' });
    expect(res.status).toBe(202);
    expect(res.body.job).toEqual({
      id: 44,
      job_type: 'remote-stub-repoint',
      status: 'pending',
      run_after: '2026-03-01T00:00:00.000Z',
    });
    expect(scheduleRepoint).toHaveBeenCalledWith(9, '424242');
    expect(scheduleRecheck).not.toHaveBeenCalled();
    expect(audit).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'update',
        tableName: 'remote_channel_stub',
        rowId: 9,
        afterSnapshot: expect.objectContaining({
          scheduled_job_type: 'remote-stub-repoint',
          target_provider_feed_id: '424242',
        }),
      })
    );
  });

  it('POST promote returns 404 when the stub is missing', async () => {
    getStub.mockResolvedValueOnce(null);
    const res = await request(app).post(`${stubsBase}/9/promote`).set(adminAuthHeaders(1));
    expect(res.status).toBe(404);
    expect(schedulePromote).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('POST promote returns 403 without feed create', async () => {
    const res = await request(app).post(`${stubsBase}/9/promote`).set(adminAuthHeaders(4));
    expect(res.status).toBe(403);
    expect(schedulePromote).not.toHaveBeenCalled();
  });

  it('POST promote queues a job for the stub provider feed id', async () => {
    const res = await request(app).post(`${stubsBase}/9/promote`).set(adminAuthHeaders(1));
    expect(res.status).toBe(202);
    expect(res.body.job.job_type).toBe('remote-stub-promote');
    expect(res.body.job.run_after).toBe('2026-03-01T00:00:00.000Z');
    expect(schedulePromote).toHaveBeenCalledWith('podcast_index', '87654321');
    expect(scheduleRecheck).not.toHaveBeenCalled();
    expect(audit).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'update',
        afterSnapshot: expect.objectContaining({
          scheduled_job_type: 'remote-stub-promote',
        }),
      })
    );
  });

  it('DELETE returns 403 without feed delete', async () => {
    const res = await request(app).delete(`${stubsBase}/9`).set(adminAuthHeaders(5));
    expect(res.status).toBe(403);
    expect(deleteStub).not.toHaveBeenCalled();
  });

  it('DELETE returns 404 when the stub is missing', async () => {
    getStub.mockResolvedValueOnce(null);
    const res = await request(app).delete(`${stubsBase}/9`).set(adminAuthHeaders(1));
    expect(res.status).toBe(404);
    expect(deleteStub).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('DELETE returns 404 when deleteById returns false', async () => {
    deleteStub.mockResolvedValueOnce(false);
    const res = await request(app).delete(`${stubsBase}/9`).set(adminAuthHeaders(1));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Remote stub not found');
    expect(deleteStub).toHaveBeenCalledWith(9);
    expect(audit).not.toHaveBeenCalled();
  });

  it('DELETE removes the stub and audits the delete', async () => {
    const res = await request(app).delete(`${stubsBase}/9`).set(adminAuthHeaders(1));
    expect(res.status).toBe(204);
    expect(deleteStub).toHaveBeenCalledWith(9);
    expect(audit).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'delete',
        tableName: 'remote_channel_stub',
        rowId: 9,
        beforeSnapshot,
        afterSnapshot: null,
      })
    );
  });
});
