import { Readable } from 'node:stream';

import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ObjectStorageCountObjectsParams,
  ObjectStorageDeleteAllByPrefixParams,
} from '@podverse/external-services-object-storage';

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

vi.mock('@podverse/external-services-object-storage', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@podverse/external-services-object-storage')>();

  class MockObjectStorageService {
    listObjects = listObjectsMock;
    headObject = headObjectMock;
    getObjectStream = getObjectStreamMock;
    deleteObjectsByKeys = deleteObjectsByKeysMock;

    async countObjects(p: ObjectStorageCountObjectsParams) {
      return actual.ObjectStorageService.prototype.countObjects.call(this, p);
    }

    async deleteAllByPrefix(p: ObjectStorageDeleteAllByPrefixParams) {
      return actual.ObjectStorageService.prototype.deleteAllByPrefix.call(this, p);
    }
  }

  return {
    ...actual,
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
    ObjectStorageService: MockObjectStorageService,
  };
});

vi.mock('@management-api/orm/services/adminAccount.js', () => {
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

  it('returns 401 when unauthenticated for objects count', async () => {
    const res = await request(app).get(`${basePath}/objects/count`).expect(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('returns 404 for objects count when bucket storage is disabled', async () => {
    const res = await request(app)
      .get(`${basePath}/objects/count`)
      .set(superuserAuthHeaders())
      .expect(404);
    expect(res.body.message).toBe('Bucket storage feature disabled');
  });

  it('returns object count when bucket storage is enabled', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    listObjectsMock
      .mockResolvedValueOnce({
        objects: [
          { key: 'p/a', size: 1, lastModified: new Date('2024-01-01T00:00:00.000Z'), etag: 'e' },
        ],
        nextContinuationToken: 't1',
        isTruncated: true,
      })
      .mockResolvedValueOnce({
        objects: [
          { key: 'p/b', size: 2, lastModified: new Date('2024-01-02T00:00:00.000Z'), etag: 'e2' },
        ],
        isTruncated: false,
      });
    const res = await request(app)
      .get(`${basePath}/objects/count`)
      .query({ prefix: 'p/' })
      .set(superuserAuthHeaders())
      .expect(200);
    expect(res.body).toEqual({ count: 2, exact: true });
  });

  it('returns inexact count when listing exceeds the cap', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    listObjectsMock.mockResolvedValue({
      objects: Array.from({ length: 1000 }, (_, i) => ({
        key: `k${i}`,
        size: 1,
        lastModified: new Date('2024-01-01T00:00:00.000Z'),
        etag: 'e',
      })),
      nextContinuationToken: 'more',
      isTruncated: true,
    });
    const res = await request(app)
      .get(`${basePath}/objects/count`)
      .set(superuserAuthHeaders())
      .expect(200);
    expect(res.body).toEqual({ count: 10000, exact: false });
    expect(listObjectsMock.mock.calls.length).toBe(10);
  });

  it('returns 403 for objects count when admin lacks bucket read', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    const res = await request(app)
      .get(`${basePath}/objects/count`)
      .set(noBucketAdminAuthHeaders())
      .expect(403);
    expect(res.body.message).toBe('Insufficient permissions');
  });

  it('delete-all-by-prefix batches deletes across list pages', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    listObjectsMock
      .mockResolvedValueOnce({
        objects: [
          { key: 'a/1', size: 1, lastModified: new Date('2024-01-01T00:00:00.000Z'), etag: 'e' },
          { key: 'a/2', size: 1, lastModified: new Date('2024-01-02T00:00:00.000Z'), etag: 'e' },
        ],
        nextContinuationToken: 'tok',
        isTruncated: true,
      })
      .mockResolvedValueOnce({
        objects: [
          { key: 'a/3', size: 1, lastModified: new Date('2024-01-03T00:00:00.000Z'), etag: 'e' },
        ],
        isTruncated: false,
      });
    deleteObjectsByKeysMock
      .mockResolvedValueOnce({ deleted: ['a/1', 'a/2'], failed: [] })
      .mockResolvedValueOnce({ deleted: ['a/3'], failed: [] });

    const res = await request(app)
      .post(`${basePath}/objects/delete-all-by-prefix`)
      .set(superuserAuthHeaders())
      .send({ prefix: 'a/' })
      .expect(200);
    expect(res.body).toEqual({
      deleted: 3,
      failed: [],
      requested: 3,
    });
    expect(deleteObjectsByKeysMock).toHaveBeenCalledTimes(2);
    expect(deleteObjectsByKeysMock.mock.calls[0][0].keys).toEqual(['a/1', 'a/2']);
    expect(deleteObjectsByKeysMock.mock.calls[1][0].keys).toEqual(['a/3']);
  });

  it('returns 404 for delete-all-by-prefix when bucket storage is disabled', async () => {
    const res = await request(app)
      .post(`${basePath}/objects/delete-all-by-prefix`)
      .set(superuserAuthHeaders())
      .send({ prefix: '' })
      .expect(404);
    expect(res.body.message).toBe('Bucket storage feature disabled');
  });

  it('returns 400 for delete-all-by-prefix when body is invalid', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    const res = await request(app)
      .post(`${basePath}/objects/delete-all-by-prefix`)
      .set(superuserAuthHeaders())
      .send({})
      .expect(400);
    expect(typeof res.body.message).toBe('string');
  });

  it('returns 403 for delete-all-by-prefix when admin lacks bucket delete', async () => {
    isBucketStorageEnabledMock.mockReturnValue(true);
    const res = await request(app)
      .post(`${basePath}/objects/delete-all-by-prefix`)
      .set(noBucketAdminAuthHeaders())
      .send({ prefix: '' })
      .expect(403);
    expect(res.body.message).toBe('Insufficient permissions');
  });
});
