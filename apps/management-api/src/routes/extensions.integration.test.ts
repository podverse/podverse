import { app } from '@mgmt-api/app.js';
import { config } from '@mgmt-api/config/index.js';
import { extensionRegistry } from '@mgmt-api/lib/extensions/registry.js';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExtensionManifest } from '@podverse/extensions-sdk';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const extensionsBase = `${config.api.prefix}${config.api.version}/extensions`;

const superuserWithAllPerms = {
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
    bucketCrud: 15,
    extensionsCrud: 15,
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const adminWithNoExtensionsPerm = {
  id: 2,
  id_text: 'pvMgtAd002',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'reader@example.com' },
  permissions: {
    id: 2,
    admin_account_id: 2,
    feedsCrud: 15,
    feedTakedownReasonsCrud: 15,
    adminsCrud: 15,
    statsCrud: 15,
    billingPricesCrud: 15,
    bucketCrud: 15,
    extensionsCrud: 0,
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
  updated_at: new Date('2020-01-01T00:00:00.000Z'),
};

const { getWithRoleAndPermissionsMock } = vi.hoisted(() => ({
  getWithRoleAndPermissionsMock: vi.fn(async (id: number) => {
    if (id === 1) {
      return superuserWithAllPerms;
    }
    if (id === 2) {
      return adminWithNoExtensionsPerm;
    }
    return null;
  }),
}));

const {
  storedRows,
  listExtensionSettingsMock,
  getExtensionSettingByIdMock,
  upsertExtensionSettingMock,
} = vi.hoisted(() => {
  const rows = new Map<string, Record<string, unknown>>();

  return {
    storedRows: rows,
    listExtensionSettingsMock: vi.fn(async () => Array.from(rows.values())),
    getExtensionSettingByIdMock: vi.fn(async (id: string) => rows.get(id) ?? null),
    upsertExtensionSettingMock: vi.fn(async (input: Record<string, unknown>) => {
      const id = String(input.id);
      const existing = rows.get(id);
      const next = {
        id,
        enabled: input.enabled === true,
        config: (input.config ?? {}) as Record<string, unknown>,
        updatedByAdminId:
          typeof input.updatedByAdminId === 'number' ? (input.updatedByAdminId as number) : null,
        createdAt: existing?.createdAt ?? new Date('2020-01-01T00:00:00.000Z'),
        updatedAt: new Date('2020-01-02T00:00:00.000Z'),
      };
      rows.set(id, next);
      return next;
    }),
  };
});

const { fakeCacheClient, getExtensionCacheClientMock } = vi.hoisted(() => {
  const del = vi.fn(async () => undefined);
  const publish = vi.fn(async () => 1);
  const cacheClient = {
    del,
    publish,
  };
  return {
    fakeCacheClient: cacheClient,
    getExtensionCacheClientMock: vi.fn(async () => cacheClient),
  };
});

vi.mock('@mgmt-api/orm/services/adminAccount.js', () => {
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

vi.mock('@mgmt-api/lib/extensions/settingsStore.js', () => ({
  listExtensionSettings: () => listExtensionSettingsMock(),
  getExtensionSettingById: (id: string) => getExtensionSettingByIdMock(id),
  upsertExtensionSetting: (input: Record<string, unknown>) => upsertExtensionSettingMock(input),
}));

vi.mock('@mgmt-api/lib/extensions/cacheClient.js', () => ({
  getExtensionCacheClient: () => getExtensionCacheClientMock(),
}));

const adminIdTextByUserId: Record<number, string> = {
  1: 'pvMgtSu001',
  2: 'pvMgtAd002',
};

const adminAuthHeaders = (userId: number): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign(
    { id: userId, id_text: adminIdTextByUserId[userId] ?? 'pvMgtSu001' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )}`,
});

const testExtensionManifest: ExtensionManifest = {
  id: 'test-extension',
  name: 'Test Extension',
  description: 'Used by management-api route integration tests.',
  kind: 'integration',
  defaultEnabled: false,
  configSchema: {
    joi: Joi.object({
      publicKey: Joi.string().required(),
      secretToken: Joi.string().required(),
    }).required(),
    fields: {
      publicKey: {
        secret: false,
        userEditable: true,
        labelKey: 'extensions.test.publicKey',
      },
      secretToken: {
        secret: true,
        userEditable: true,
        labelKey: 'extensions.test.secretToken',
      },
    },
  },
  requires: {},
};

describe('extensions routes', () => {
  beforeEach(() => {
    process.env.EXTENSIONS_ENABLED = 'true';

    getWithRoleAndPermissionsMock.mockClear();

    storedRows.clear();
    listExtensionSettingsMock.mockClear();
    getExtensionSettingByIdMock.mockClear();
    upsertExtensionSettingMock.mockClear();

    fakeCacheClient.del.mockClear();
    fakeCacheClient.publish.mockClear();
    getExtensionCacheClientMock.mockClear();

    extensionRegistry.splice(0, extensionRegistry.length);
    extensionRegistry.push(testExtensionManifest);
  });

  it('GET / returns registered manifest with default state and null updatedAt', async () => {
    const res = await request(app).get(extensionsBase).set(adminAuthHeaders(1));

    expect(res.status).toBe(200);
    expect(res.body.extensions).toEqual([
      {
        id: 'test-extension',
        name: 'Test Extension',
        description: 'Used by management-api route integration tests.',
        kind: 'integration',
        enabled: false,
        updatedAt: null,
        updatedByAdminId: null,
      },
    ]);
  });

  it('GET /:id returns 404 for unknown extension id', async () => {
    const res = await request(app)
      .get(`${extensionsBase}/unknown-extension`)
      .set(adminAuthHeaders(1));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Extension not found');
  });

  it('PUT /:id returns 403 without extensions_crud permission', async () => {
    const res = await request(app)
      .put(`${extensionsBase}/test-extension`)
      .set(adminAuthHeaders(2))
      .send({
        enabled: true,
        config: {
          publicKey: 'pk-live',
          secretToken: 'secret-live',
        },
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Insufficient permissions');
  });

  it('PUT /:id with valid body persists and GET /:id reflects the change', async () => {
    const putRes = await request(app)
      .put(`${extensionsBase}/test-extension`)
      .set(adminAuthHeaders(1))
      .send({
        enabled: true,
        config: {
          publicKey: 'pk-live',
          secretToken: 'secret-live',
        },
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body).toMatchObject({
      id: 'test-extension',
      enabled: true,
      config: {
        publicKey: 'pk-live',
        secretToken: 'secret-live',
      },
      updatedByAdminId: 1,
    });

    const getRes = await request(app)
      .get(`${extensionsBase}/test-extension`)
      .set(adminAuthHeaders(1));

    expect(getRes.status).toBe(200);
    expect(getRes.body).toMatchObject({
      id: 'test-extension',
      enabled: true,
      resolved: {
        enabled: true,
        config: {
          publicKey: 'pk-live',
        },
      },
      config: {
        publicKey: 'pk-live',
      },
      updatedByAdminId: 1,
    });
    expect(getRes.body.config.secretToken).toBeUndefined();
    expect(getRes.body.resolved.config.secretToken).toBeUndefined();
  });

  it('PUT /:id with invalid config returns 400', async () => {
    const res = await request(app)
      .put(`${extensionsBase}/test-extension`)
      .set(adminAuthHeaders(1))
      .send({
        enabled: true,
        config: {
          publicKey: 'pk-live',
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('secretToken');
  });

  it('successful PUT deletes cache key before publish invalidation', async () => {
    const res = await request(app)
      .put(`${extensionsBase}/test-extension`)
      .set(adminAuthHeaders(1))
      .send({
        enabled: true,
        config: {
          publicKey: 'pk-live',
          secretToken: 'secret-live',
        },
      });

    expect(res.status).toBe(200);
    expect(fakeCacheClient.del).toHaveBeenCalledWith('extension:test-extension');
    expect(fakeCacheClient.publish).toHaveBeenCalledWith(
      'extension:invalidated:test-extension',
      'test-extension'
    );

    const delOrder = fakeCacheClient.del.mock.invocationCallOrder[0] ?? 0;
    const publishOrder = fakeCacheClient.publish.mock.invocationCallOrder[0] ?? 0;
    expect(delOrder).toBeLessThan(publishOrder);
  });
});
