import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmbedDemoConfigValidationError } from '@podverse/orm';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const showcaseBase = `${config.api.prefix}${config.api.version}/web/embed-demo`;

const superuserWithEmbedDemoCrud = {
  id: 1,
  id_text: 'pvMgtSu001',
  admin_account_role_id: 1,
  admin_account_role: { role: 'superuser' },
  admin_account_credentials: { email: 'super@example.com' },
  permissions: {
    id: 1,
    admin_account_id: 1,
    feedsCrud: 15,
    feedTakedownReasonsCrud: 15,
    adminsCrud: 15,
    statsCrud: 15,
    billingPricesCrud: 15,
    embed_demo_crud: 15,
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const adminWithoutEmbedDemoCrud = {
  id: 2,
  id_text: 'pvMgtAd002',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'reader@example.com' },
  permissions: {
    id: 2,
    admin_account_id: 2,
    feedsCrud: 15,
    feedTakedownReasonsCrud: 0,
    adminsCrud: 0,
    statsCrud: 0,
    billingPricesCrud: 0,
    embed_demo_crud: 0,
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const {
  getWithRoleAndPermissionsMock,
  getAdminShowcaseSlotsMock,
  upsertShowcaseMock,
  deleteShowcaseMock,
  auditRecordMock,
} = vi.hoisted(() => ({
  getWithRoleAndPermissionsMock: vi.fn(async (id: number) => {
    if (id === 1) {
      return superuserWithEmbedDemoCrud;
    }
    if (id === 2) {
      return adminWithoutEmbedDemoCrud;
    }
    return null;
  }),
  getAdminShowcaseSlotsMock: vi.fn(async () => [
    {
      showcaseId: 'episode-audio',
      routeKind: 'episode',
      resourceIdText: 'embSmpEpAud1',
    },
    {
      showcaseId: 'track-audio',
      routeKind: 'track',
      resourceIdText: null,
    },
  ]),
  upsertShowcaseMock: vi.fn(async (showcaseId: string, resourceIdText: string) => ({
    showcase_id: showcaseId,
    resource_id_text: resourceIdText,
  })),
  deleteShowcaseMock: vi.fn(async () => true),
  auditRecordMock: vi.fn(async () => undefined),
}));

vi.mock('@management-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async getWithRoleAndPermissions(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
  }
  return { AdminAccountService };
});

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class EmbedDemoConfigService {
    async getAdminShowcaseSlots() {
      return getAdminShowcaseSlotsMock();
    }

    async upsertShowcase(showcaseId: string, resourceIdText: string) {
      return upsertShowcaseMock(showcaseId, resourceIdText);
    }

    async deleteShowcase(showcaseId: string) {
      return deleteShowcaseMock(showcaseId);
    }
  }

  return {
    ...actual,
    EmbedDemoConfigService,
  };
});

vi.mock('@management-api/lib/database/auditLog.js', () => {
  class AuditLogService {
    async record(entry: unknown) {
      return auditRecordMock(entry);
    }
  }
  return { AuditLogService };
});

const superuserAuthHeaders = (): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: 1, id_text: 'pvMgtSu001' }, JWT_SECRET, { expiresIn: '1h' })}`,
});

const readerAuthHeaders = (): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: 2, id_text: 'pvMgtAd002' }, JWT_SECRET, { expiresIn: '1h' })}`,
});

describe('Management embed demo showcase API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertShowcaseMock.mockImplementation(async (showcaseId: string, resourceIdText: string) => ({
      showcase_id: showcaseId,
      resource_id_text: resourceIdText,
    }));
    deleteShowcaseMock.mockResolvedValue(true);
  });

  it('GET /web/embed-demo/showcase requires authentication and embed_demo read permission', async () => {
    await request(app).get(`${showcaseBase}/showcase`).expect(401);

    await request(app).get(`${showcaseBase}/showcase`).set(readerAuthHeaders()).expect(403);

    const response = await request(app)
      .get(`${showcaseBase}/showcase`)
      .set(superuserAuthHeaders())
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(getAdminShowcaseSlotsMock).toHaveBeenCalledTimes(1);
  });

  it('PUT /web/embed-demo/showcase/:showcaseId validates body and unknown showcase ids', async () => {
    await request(app)
      .put(`${showcaseBase}/showcase/not-a-slot`)
      .set(superuserAuthHeaders())
      .send({ resourceIdText: 'embSmpEpAud1' })
      .expect(400);

    await request(app)
      .put(`${showcaseBase}/showcase/episode-audio`)
      .set(superuserAuthHeaders())
      .send({ resourceIdText: '' })
      .expect(400);

    upsertShowcaseMock.mockRejectedValueOnce(
      new EmbedDemoConfigValidationError('Item not found: missing-id')
    );

    await request(app)
      .put(`${showcaseBase}/showcase/episode-audio`)
      .set(superuserAuthHeaders())
      .send({ resourceIdText: 'missing-id' })
      .expect(400);

    const response = await request(app)
      .put(`${showcaseBase}/showcase/episode-audio`)
      .set(superuserAuthHeaders())
      .send({ resourceIdText: 'embSmpEpAud1' })
      .expect(200);

    expect(response.body.data).toEqual({
      showcaseId: 'episode-audio',
      resourceIdText: 'embSmpEpAud1',
    });
    expect(auditRecordMock).toHaveBeenCalledTimes(1);
  });

  it('DELETE /web/embed-demo/showcase/:showcaseId clears a configured slot', async () => {
    await request(app)
      .delete(`${showcaseBase}/showcase/not-a-slot`)
      .set(superuserAuthHeaders())
      .expect(400);

    deleteShowcaseMock.mockResolvedValueOnce(false);

    await request(app)
      .delete(`${showcaseBase}/showcase/episode-audio`)
      .set(superuserAuthHeaders())
      .expect(404);

    deleteShowcaseMock.mockResolvedValueOnce(true);

    await request(app)
      .delete(`${showcaseBase}/showcase/episode-audio`)
      .set(superuserAuthHeaders())
      .expect(204);

    expect(deleteShowcaseMock).toHaveBeenCalledWith('episode-audio');
    expect(auditRecordMock).toHaveBeenCalledTimes(1);
  });
});
