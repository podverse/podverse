import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';

import { config } from '@mgmt-api/config/index.js';
import { ensureAuthenticated } from '@mgmt-api/lib/auth/index.js';
import { requireCrud } from '@mgmt-api/lib/authz/requireCrud.js';
import {
  storageBulkDeleteBodySchema,
  storageDeleteAllByPrefixBodySchema,
} from '@mgmt-api/schemas/storage.js';
import type { Response } from 'express';
import express from 'express';

import {
  isBucketStorageEnabled,
  ObjectStorageService,
  readBucketRuntimeConfig,
  readBucketStorageConfig,
} from '@podverse/external-services-object-storage';

const router = express.Router();

const DEFAULT_LIST_MAX_KEYS = 100;
const MAX_LIST_MAX_KEYS = 1000;
const STORAGE_COUNT_AND_DELETE_CAP = 10_000;

let cachedStorageService: ObjectStorageService | null = null;

function getObjectStorageService(): ObjectStorageService {
  if (cachedStorageService === null) {
    const runtime = readBucketRuntimeConfig();
    cachedStorageService = new ObjectStorageService({
      accessKey: runtime.accessKey,
      secretKey: runtime.secretKey,
      region: runtime.region,
      provider: runtime.provider,
      endpoint: runtime.endpoint,
      forcePathStyle: runtime.forcePathStyle,
      uploadPublicAcl: runtime.uploadPublicAcl,
    });
  }
  return cachedStorageService;
}

function sendFeatureDisabled(res: Response): void {
  res.status(404).json({ message: 'Bucket storage feature disabled' });
}

function isSafeObjectKey(key: string): boolean {
  const trimmed = key.trim();
  if (trimmed === '') {
    return false;
  }
  if (trimmed.includes('..')) {
    return false;
  }
  if (trimmed.startsWith('/')) {
    return false;
  }
  return true;
}

function parseListMaxKeys(raw: unknown): number {
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return DEFAULT_LIST_MAX_KEYS;
  }
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) {
    return DEFAULT_LIST_MAX_KEYS;
  }
  return Math.min(MAX_LIST_MAX_KEYS, Math.floor(n));
}

function parsePrefix(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseContinuationToken(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

router.get('/', ensureAuthenticated, requireCrud('bucket', 'read'), (_req, res) => {
  if (!isBucketStorageEnabled()) {
    res.json({ enabled: false });
    return;
  }
  const runtime = readBucketRuntimeConfig();
  const storage = readBucketStorageConfig();
  res.json({
    enabled: true,
    provider: runtime.provider,
    bucketName: storage.bucket,
  });
});

router.get(
  '/objects',
  ensureAuthenticated,
  requireCrud('bucket', 'read'),
  async (req, res, next) => {
    try {
      if (!isBucketStorageEnabled()) {
        sendFeatureDisabled(res);
        return;
      }
      const prefix = parsePrefix(req.query.prefix);
      const continuationToken = parseContinuationToken(req.query.continuationToken);
      const maxKeys = parseListMaxKeys(req.query.maxKeys);
      const storage = readBucketStorageConfig();
      const svc = getObjectStorageService();
      const list = await svc.listObjects({
        bucket: storage.bucket,
        prefix,
        continuationToken,
        maxKeys,
      });
      res.json({
        objects: list.objects.map((o) => ({
          key: o.key,
          size: o.size,
          lastModified: o.lastModified !== undefined ? o.lastModified.toISOString() : null,
          etag: o.etag ?? null,
        })),
        nextContinuationToken: list.nextContinuationToken ?? null,
        isTruncated: list.isTruncated,
        prefix: prefix ?? '',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/objects/count',
  ensureAuthenticated,
  requireCrud('bucket', 'read'),
  async (req, res, next) => {
    try {
      if (!isBucketStorageEnabled()) {
        sendFeatureDisabled(res);
        return;
      }
      const prefix = parsePrefix(req.query.prefix);
      const storage = readBucketStorageConfig();
      const svc = getObjectStorageService();
      const outcome = await svc.countObjects({
        bucket: storage.bucket,
        prefix,
        cap: STORAGE_COUNT_AND_DELETE_CAP,
      });
      res.json(outcome);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/objects/metadata',
  ensureAuthenticated,
  requireCrud('bucket', 'read'),
  async (req, res, next) => {
    try {
      if (!isBucketStorageEnabled()) {
        sendFeatureDisabled(res);
        return;
      }
      const keyRaw = req.query.key;
      if (typeof keyRaw !== 'string' || !isSafeObjectKey(keyRaw)) {
        res.status(400).json({ message: 'Invalid key' });
        return;
      }
      const storage = readBucketStorageConfig();
      const svc = getObjectStorageService();
      const head = await svc.headObject({ bucket: storage.bucket, key: keyRaw });
      if (head === null) {
        res.status(404).json({ message: 'Object not found' });
        return;
      }
      res.json({
        key: keyRaw,
        contentType: head.contentType,
        contentLength: head.contentLength,
        lastModified: head.lastModified !== undefined ? head.lastModified.toISOString() : null,
        etag: head.etag ?? null,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/objects/download',
  ensureAuthenticated,
  requireCrud('bucket', 'read'),
  async (req, res, next) => {
    try {
      if (!isBucketStorageEnabled()) {
        sendFeatureDisabled(res);
        return;
      }
      const keyRaw = req.query.key;
      if (typeof keyRaw !== 'string' || !isSafeObjectKey(keyRaw)) {
        res.status(400).json({ message: 'Invalid key' });
        return;
      }
      const storage = readBucketStorageConfig();
      const svc = getObjectStorageService();
      const streamResult = await svc.getObjectStream({ bucket: storage.bucket, key: keyRaw });
      if (streamResult === null) {
        res.status(404).json({ message: 'Object not found' });
        return;
      }
      const filenameSegment = keyRaw.includes('/')
        ? keyRaw.slice(keyRaw.lastIndexOf('/') + 1)
        : keyRaw;
      const safeFilename = filenameSegment === '' ? 'download' : filenameSegment;
      res.setHeader('Content-Type', streamResult.contentType);
      if (streamResult.contentLength > 0) {
        res.setHeader('Content-Length', String(streamResult.contentLength));
      }
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename.replace(/"/g, '')}"`
      );
      if (streamResult.etag !== undefined && streamResult.etag !== '') {
        res.setHeader('ETag', `"${streamResult.etag}"`);
      }
      const webStream = streamResult.body as ReadableStream<Uint8Array>;
      const nodeReadable = Readable.fromWeb(webStream, { highWaterMark: 64 * 1024 });
      nodeReadable.on('error', (err) => {
        if (!res.headersSent) {
          next(err);
          return;
        }
        res.destroy(err);
      });
      nodeReadable.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/objects',
  ensureAuthenticated,
  requireCrud('bucket', 'delete'),
  async (req, res, next) => {
    try {
      if (!isBucketStorageEnabled()) {
        sendFeatureDisabled(res);
        return;
      }
      const keyRaw = req.query.key;
      if (typeof keyRaw !== 'string' || !isSafeObjectKey(keyRaw)) {
        res.status(400).json({ message: 'Invalid key' });
        return;
      }
      const storage = readBucketStorageConfig();
      const svc = getObjectStorageService();
      const outcome = await svc.deleteObjectsByKeys({ bucket: storage.bucket, keys: [keyRaw] });
      if (outcome.failed.length > 0) {
        res.status(502).json({ message: 'Delete failed', failed: outcome.failed });
        return;
      }
      res.json({ deleted: outcome.deleted });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/objects/bulk-delete',
  ensureAuthenticated,
  requireCrud('bucket', 'delete'),
  async (req, res, next) => {
    try {
      if (!isBucketStorageEnabled()) {
        sendFeatureDisabled(res);
        return;
      }
      const parsed = storageBulkDeleteBodySchema.validate(req.body);
      if (parsed.error) {
        res.status(400).json({ message: parsed.error.message });
        return;
      }
      const keys: string[] = [];
      for (const key of parsed.value.keys) {
        if (typeof key !== 'string' || !isSafeObjectKey(key)) {
          res.status(400).json({ message: 'One or more keys are invalid' });
          return;
        }
        keys.push(key);
      }
      const storage = readBucketStorageConfig();
      const svc = getObjectStorageService();
      const outcome = await svc.deleteObjectsByKeys({ bucket: storage.bucket, keys });
      res.json(outcome);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/objects/delete-all-by-prefix',
  ensureAuthenticated,
  requireCrud('bucket', 'delete'),
  async (req, res, next) => {
    try {
      if (!isBucketStorageEnabled()) {
        sendFeatureDisabled(res);
        return;
      }
      const parsed = storageDeleteAllByPrefixBodySchema.validate(req.body);
      if (parsed.error) {
        res.status(400).json({ message: parsed.error.message });
        return;
      }
      const rawPrefix = parsed.value.prefix;
      const prefix = rawPrefix.trim() === '' ? undefined : rawPrefix.trim();
      const storage = readBucketStorageConfig();
      const svc = getObjectStorageService();
      const outcome = await svc.deleteAllByPrefix({
        bucket: storage.bucket,
        prefix,
        cap: STORAGE_COUNT_AND_DELETE_CAP,
      });
      res.json(outcome);
    } catch (error) {
      next(error);
    }
  }
);

const storageRoot = express.Router();
storageRoot.use(`${config.api.prefix}${config.api.version}/storage`, router);
export const storageRouter = storageRoot;
