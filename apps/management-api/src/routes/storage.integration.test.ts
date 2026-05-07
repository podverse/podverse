import { Readable } from 'node:stream';

import { app } from '@mgmt-api/app.js';
import { config } from '@mgmt-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const basePath = `${config.api.prefix}${config.api.version}/storage`;

const superuser = {
  id: 1,
  id_text: 'pvMgtSu001',
  admin_account_role_id: 1,
  admin_account_role: { role: 'superuser' },
  admin_account_credentials: { email: 'super@example.com' },
  permissions: {
    feedsCrud: 15,
    feedTakedownReasonsCrud: 15,
    adminsCrud: 15,
    statsCrud: 15,
    billingPricesCrud: 15,
    bucketCrud: 15,
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
};

const adminNoBucketRead = {
  id: 3,
  id_text: 'pvMgtAd003',
  admin_account_role_id: 2,
  admin_account_role: { role: 'admin' },
  admin_account_credentials: { email: 'nobucket@example.com' },
  permissions: {
    feedsCrud: 15,
    feedTakedownReasonsCrud: 0,
    adminsCrud: 0,
    statsCrud: 0,
    billingPricesCrud: 0,
    bucketCrud: 0,
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
};

const {
  isBucketStorageEnabledMock,
  listObjectsMock,
  headObjectMock,
  getObjectStreamMock,
  deleteObjectsByKeysMock,
  getWithRoleAndPermissionsMock,
} = vi.hoisted(() => ({
  isBucketStorageEnabledMock: vi.fn(() => false),
  listObjectsMock: vi.fn(async () => ({
    objects: [] as { key: string; size: number; lastModified?: Date; etag?: string }[],
    isTruncated: false,
  })),
  headObjectMock: vi.fn(async () => null),
  getObjectStreamMock: vi.fn(async () => null),
  deleteObjectsByKeysMock: vi.fn(async () => ({
    deleted: [] as string[],
    failed: [] as { key: string; error: string }[],
  })),
  getWithRoleAndPermissionsMock: vi.fn(async (id: number) => {
    if (id === 1) {
      return superuser;
    }
    if (id === 3) {
      return adminNoBucketRead;
    }
    return null;
  }),
}));

vi.mock('@podverse/external-services-object-storage', () => ({
  isBucketStorageEnabled: () => isBucketStorageEnabledMock(),
  readBucketRuntimeConfig: () => ({
    provider: 'aws-s3',
    accessKey: 'test-access',
    secretKey: 'test-secret',
    region: 'us-east-1',
    endpoint: undefined,
    forcePathStyle: false,
    uploadPublicAcl: 'public-read',
  }),
  readBucketStorageConfig: () => ({
    bucket: 'test-bucket',
    cdnBaseUrl: 'https://cdn.example.test',
  }),
  ObjectStorageService: vi.fn().mockImplementation(() => ({
    listObjects: listObjectsMock,
    headObject: headObjectMock,
    getObjectStream: getObjectStreamMock,
    deleteObjectsByKeys: deleteObjectsByKeysMock,
  })),
}));

vi.mock('@mgmt-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async getWithRoleAndPermissions(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
  }
  return { AdminAccountService };
});

const superuserAuthHeaders = (): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: 1, id_text: 'pvMgtSu001' }, JWT_SECRET, { expiresIn: '1h' })}`,
});

const noBucketAdminAuthHeaders = (): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: 3, id_text: 'pvMgtAd003' }, JWT_SECRET, { expiresIn: '1h' })}`,
});

describe('Storage routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isBucketStorageEnabledMock.mockReturnValue(false);
  });

  it('returns 401 when unauthenticated for feature probe', async () => {
    const res = await request(app).get(basePath).expect(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('returns enabled false when bucket storage is not configured', async () => {
    const res = await request(app).get(basePath).set(superuserAuthHeaders()).expect(200);
    expect(res.body).toEqual({ enabled: false });
  });

  it('returns feature details when bucket storage is enabled', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    const res = await request(app).get(basePath).set(superuserAuthHeaders()).expect(200);
    expect(res.body).toEqual({
      enabled: true,
      provider: 'aws-s3',
      bucketName: 'test-bucket',
    });
  });

  it('returns 403 when admin lacks bucket read permission', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    const res = await request(app).get(basePath).set(noBucketAdminAuthHeaders()).expect(403);
    expect(res.body.message).toBe('Insufficient permissions');
  });

  it('returns 404 for list when bucket storage is disabled', async () => {
    const res = await request(app)
      .get(`${basePath}/objects`)
      .set(superuserAuthHeaders())
      .expect(404);
    expect(res.body.message).toBe('Bucket storage feature disabled');
  });

  it('lists objects when bucket storage is enabled', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    listObjectsMock.mockResolvedValueOnce({
      objects: [
        {
          key: 'a/b.txt',
          size: 4,
          lastModified: new Date('2024-01-02T00:00:00.000Z'),
          etag: 'etag1',
        },
      ],
      nextContinuationToken: 'tok',
      isTruncated: true,
    });
    const res = await request(app)
      .get(`${basePath}/objects`)
      .query({ prefix: 'a/', maxKeys: 10 })
      .set(superuserAuthHeaders())
      .expect(200);
    expect(res.body.prefix).toBe('a/');
    expect(res.body.isTruncated).toBe(true);
    expect(res.body.nextContinuationToken).toBe('tok');
    expect(res.body.objects).toHaveLength(1);
    expect(res.body.objects[0].key).toBe('a/b.txt');
    expect(res.body.objects[0].size).toBe(4);
    expect(res.body.objects[0].lastModified).toBe('2024-01-02T00:00:00.000Z');
    expect(res.body.objects[0].etag).toBe('etag1');
  });

  it('returns 400 for metadata when key is unsafe', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    const res = await request(app)
      .get(`${basePath}/objects/metadata`)
      .query({ key: '../etc/passwd' })
      .set(superuserAuthHeaders())
      .expect(400);
    expect(res.body.message).toBe('Invalid key');
  });

  it('returns metadata JSON when object exists', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    headObjectMock.mockResolvedValueOnce({
      contentType: 'text/plain',
      contentLength: 3,
      lastModified: new Date('2024-03-04T00:00:00.000Z'),
      etag: 'abc',
    });
    const res = await request(app)
      .get(`${basePath}/objects/metadata`)
      .query({ key: 'notes/readme.txt' })
      .set(superuserAuthHeaders())
      .expect(200);
    expect(res.body.key).toBe('notes/readme.txt');
    expect(res.body.contentType).toBe('text/plain');
    expect(res.body.contentLength).toBe(3);
    expect(res.body.etag).toBe('abc');
  });

  it('streams download when object exists', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    const nodeReadable = Readable.from(Buffer.from('hey'));
    const webBody = Readable.toWeb(nodeReadable);
    getObjectStreamMock.mockResolvedValueOnce({
      body: webBody,
      contentType: 'text/plain',
      contentLength: 3,
      lastModified: new Date('2024-03-04T00:00:00.000Z'),
      etag: 'e1',
    });
    const res = await request(app)
      .get(`${basePath}/objects/download`)
      .query({ key: 'dir/file.txt' })
      .set(superuserAuthHeaders())
      .buffer(true)
      .expect(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('file.txt');
    const downloaded = Buffer.isBuffer(res.body) ? res.body.toString('utf8') : res.text;
    expect(downloaded).toBe('hey');
  });

  it('deletes a single object', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    deleteObjectsByKeysMock.mockResolvedValueOnce({ deleted: ['k1'], failed: [] });
    const res = await request(app)
      .delete(`${basePath}/objects`)
      .query({ key: 'k1' })
      .set(superuserAuthHeaders())
      .expect(200);
    expect(res.body.deleted).toEqual(['k1']);
  });

  it('bulk-deletes keys', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    deleteObjectsByKeysMock.mockResolvedValueOnce({
      deleted: ['a', 'b'],
      failed: [],
    });
    const res = await request(app)
      .post(`${basePath}/objects/bulk-delete`)
      .set(superuserAuthHeaders())
      .send({ keys: ['a', 'b'] })
      .expect(200);
    expect(res.body.deleted).toEqual(['a', 'b']);
    expect(res.body.failed).toEqual([]);
  });

  it('returns 400 for bulk-delete when a key is unsafe', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    const res = await request(app)
      .post(`${basePath}/objects/bulk-delete`)
      .set(superuserAuthHeaders())
      .send({ keys: ['ok', '../bad'] })
      .expect(400);
    expect(res.body.message).toBe('One or more keys are invalid');
  });
});
