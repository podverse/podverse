import type { ReadableStream } from 'node:stream/web';

import { S3mini } from 's3mini';

import type { BucketProvider } from './bucketProvider.js';
import { buildS3MiniEndpoint } from './buildS3MiniEndpoint.js';

export type { BucketProvider } from './bucketProvider.js';
export { BUCKET_PROVIDERS, isBucketProvider } from './bucketProvider.js';
export { buildS3MiniEndpoint } from './buildS3MiniEndpoint.js';
export type { BuildS3MiniEndpointParams } from './buildS3MiniEndpoint.js';

export type { BucketRuntimeConfig, BucketStorageConfig } from './env.js';
export {
  hasAnyBucketProviderEnvSet,
  isBucketStorageEnabled,
  readBucketRuntimeConfig,
  readBucketStorageConfig,
  SUPPORTED_BUCKET_PROVIDERS,
} from './env.js';

export type ObjectStorageServiceParams = {
  accessKey: string;
  secretKey: string;
  region: string;
  provider: BucketProvider;
  endpoint?: string;
  forcePathStyle: boolean;
  /** When empty, `uploadResizedImage` does not send `x-amz-acl` (bucket policy / provider default). */
  uploadPublicAcl: string;
};

export type ObjectStorageUploadParams = {
  bucket: string;
  key: string;
  body: Uint8Array;
  contentType: string;
  cacheControl?: string;
};

export type ObjectStorageDeleteParams = {
  bucket: string;
  key: string;
};

export type ObjectStorageObjectExistsParams = {
  bucket: string;
  key: string;
};

export type ObjectStoragePublicUrlParams = {
  cdnBaseUrl: string;
  key: string;
};

export type ObjectStorageListObjectsParams = {
  bucket: string;
  prefix?: string;
  continuationToken?: string;
  maxKeys?: number;
};

export type ObjectStorageListObject = {
  key: string;
  size: number;
  lastModified?: Date;
  etag?: string;
};

export type ObjectStorageHeadObjectParams = {
  bucket: string;
  key: string;
};

export type ObjectStorageHeadObjectResult = {
  contentType: string;
  contentLength: number;
  lastModified?: Date;
  etag?: string;
};

export type ObjectStorageGetObjectStreamParams = {
  bucket: string;
  key: string;
};

export type ObjectStorageGetObjectStreamResult = {
  body: ReadableStream;
  contentType: string;
  contentLength: number;
  lastModified?: Date;
  etag?: string;
};

export type ObjectStorageDeleteObjectsParams = {
  bucket: string;
  keys: string[];
};

export type ObjectStorageDeleteObjectsResult = {
  deleted: string[];
  failed: { key: string; error: string }[];
};

export type ObjectStorageCountObjectsParams = {
  bucket: string;
  prefix?: string;
  cap: number;
};

export type ObjectStorageCountObjectsResult = {
  count: number;
  exact: boolean;
};

export type ObjectStorageDeleteAllByPrefixParams = {
  bucket: string;
  prefix?: string;
  cap: number;
};

export type ObjectStorageDeleteAllByPrefixResult = {
  deleted: number;
  failed: { key: string; error: string }[];
  requested: number;
};

export type ObjectStorageListObjectsResult = {
  objects: ObjectStorageListObject[];
  nextContinuationToken?: string;
  isTruncated: boolean;
};

export class ObjectStorageService {
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly region: string;
  private readonly provider: BucketProvider;
  private readonly endpoint: string | undefined;
  private readonly forcePathStyle: boolean;
  private readonly uploadPublicAcl: string;
  private readonly clientCache = new Map<string, S3mini>();

  constructor(params: ObjectStorageServiceParams) {
    this.accessKey = params.accessKey;
    this.secretKey = params.secretKey;
    this.region = params.region;
    this.provider = params.provider;
    this.endpoint = params.endpoint;
    this.forcePathStyle = params.forcePathStyle;
    this.uploadPublicAcl = params.uploadPublicAcl;
  }

  private getClient(bucket: string): S3mini {
    let client = this.clientCache.get(bucket);
    if (client === undefined) {
      const endpointUrl = buildS3MiniEndpoint({
        provider: this.provider,
        bucket,
        region: this.region,
        endpoint: this.endpoint,
        forcePathStyle: this.forcePathStyle,
      });
      client = new S3mini({
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey,
        endpoint: endpointUrl,
        region: this.region,
      });
      this.clientCache.set(bucket, client);
    }
    return client;
  }

  async uploadResizedImage(params: ObjectStorageUploadParams): Promise<void> {
    const client = this.getClient(params.bucket);
    const additionalHeaders: Record<string, string> = {};
    if (this.uploadPublicAcl !== '') {
      additionalHeaders['x-amz-acl'] = this.uploadPublicAcl;
    }
    if (params.cacheControl !== undefined && params.cacheControl !== '') {
      additionalHeaders['Cache-Control'] = params.cacheControl;
    }
    await client.putObject(
      params.key,
      params.body,
      params.contentType,
      undefined,
      additionalHeaders as Parameters<S3mini['putObject']>[4]
    );
  }

  async deleteImageByKey(params: ObjectStorageDeleteParams): Promise<void> {
    const client = this.getClient(params.bucket);
    await client.deleteObject(params.key);
  }

  async objectExists(params: ObjectStorageObjectExistsParams): Promise<boolean> {
    const client = this.getClient(params.bucket);
    const result = await client.objectExists(params.key);
    return result === true;
  }

  async listObjects(
    params: ObjectStorageListObjectsParams
  ): Promise<ObjectStorageListObjectsResult> {
    const client = this.getClient(params.bucket);
    const prefix = params.prefix ?? '';
    const maxKeys = params.maxKeys ?? 1000;
    const result = await client.listObjectsPaged('/', prefix, maxKeys, params.continuationToken);
    if (result === null || result === undefined) {
      return { objects: [], nextContinuationToken: undefined, isTruncated: false };
    }
    const objects: ObjectStorageListObject[] = (result.objects ?? []).map((item) => {
      const etagRaw = item.ETag;
      const etag =
        typeof etagRaw === 'string' && etagRaw !== '' ? etagRaw.replace(/^"|"$/g, '') : undefined;
      return {
        key: item.Key,
        size: typeof item.Size === 'number' && Number.isFinite(item.Size) ? item.Size : 0,
        lastModified: item.LastModified,
        etag,
      };
    });
    return {
      objects,
      nextContinuationToken: result.nextContinuationToken,
      isTruncated:
        result.nextContinuationToken !== undefined && result.nextContinuationToken.length > 0,
    };
  }

  getPublicUrl(params: ObjectStoragePublicUrlParams): string {
    const base = params.cdnBaseUrl.replace(/\/+$/, '');
    const key = params.key.replace(/^\/+/, '');
    return `${base}/${key}`;
  }

  async headObject(
    params: ObjectStorageHeadObjectParams
  ): Promise<ObjectStorageHeadObjectResult | null> {
    const client = this.getClient(params.bucket);
    const key = params.key;
    const exists = await client.objectExists(key);
    if (exists === false) {
      return null;
    }
    const contentLength = await client.getContentLength(key);
    const etagFromHead = await client.getEtag(key);
    const etag = etagFromHead !== null && etagFromHead !== '' ? etagFromHead : undefined;
    let contentType = 'application/octet-stream';
    let lastModified: Date | undefined;
    try {
      const res = await client.getObjectRaw(key, false, 0, 1);
      const ct = res.headers.get('content-type');
      if (ct !== null && ct !== '') {
        contentType = ct;
      }
      const lm = res.headers.get('last-modified');
      if (lm !== null && lm !== '') {
        const parsed = new Date(lm);
        if (!Number.isNaN(parsed.getTime())) {
          lastModified = parsed;
        }
      }
      await res.body?.cancel();
    } catch {
      // Zero-byte or non-range-safe objects: HEAD-derived fields only.
    }
    return {
      contentType,
      contentLength,
      lastModified,
      etag,
    };
  }

  async getObjectStream(
    params: ObjectStorageGetObjectStreamParams
  ): Promise<ObjectStorageGetObjectStreamResult | null> {
    const client = this.getClient(params.bucket);
    const res = await client.getObjectResponse(params.key);
    if (res === null || res.status === 404) {
      return null;
    }
    const body = res.body;
    if (body === null) {
      return null;
    }
    const contentLengthHeader = res.headers.get('content-length');
    const parsedLength =
      contentLengthHeader !== null && contentLengthHeader !== ''
        ? Number.parseInt(contentLengthHeader, 10)
        : Number.NaN;
    const contentLength = Number.isFinite(parsedLength) ? parsedLength : 0;
    const lastModifiedHeader = res.headers.get('last-modified');
    let lastModified: Date | undefined;
    if (lastModifiedHeader !== null && lastModifiedHeader !== '') {
      const parsed = new Date(lastModifiedHeader);
      if (!Number.isNaN(parsed.getTime())) {
        lastModified = parsed;
      }
    }
    const etagHeader = res.headers.get('etag');
    const etag =
      etagHeader !== null && etagHeader !== '' ? etagHeader.replace(/^"|"$/g, '') : undefined;
    return {
      body,
      contentType: res.headers.get('content-type') ?? 'application/octet-stream',
      contentLength,
      lastModified,
      etag,
    };
  }

  async countObjects(
    params: ObjectStorageCountObjectsParams
  ): Promise<ObjectStorageCountObjectsResult> {
    let count = 0;
    let token: string | undefined;
    for (;;) {
      const res = await this.listObjects({
        bucket: params.bucket,
        prefix: params.prefix,
        continuationToken: token,
        maxKeys: 1000,
      });
      count += res.objects.length;
      const hasMore =
        res.isTruncated &&
        res.nextContinuationToken !== undefined &&
        res.nextContinuationToken !== '';
      if (count >= params.cap) {
        return { count: params.cap, exact: false };
      }
      if (!hasMore) {
        return { count, exact: true };
      }
      token = res.nextContinuationToken;
    }
  }

  async deleteAllByPrefix(
    params: ObjectStorageDeleteAllByPrefixParams
  ): Promise<ObjectStorageDeleteAllByPrefixResult> {
    const failed: { key: string; error: string }[] = [];
    let deleted = 0;
    let requested = 0;
    let token: string | undefined;

    while (requested < params.cap) {
      const res = await this.listObjects({
        bucket: params.bucket,
        prefix: params.prefix,
        continuationToken: token,
        maxKeys: 1000,
      });

      if (res.objects.length === 0) {
        const hasMore =
          res.isTruncated &&
          res.nextContinuationToken !== undefined &&
          res.nextContinuationToken !== '';
        if (!hasMore) {
          break;
        }
        token = res.nextContinuationToken;
        continue;
      }

      const keys = res.objects.map((o) => o.key);
      let offset = 0;
      while (offset < keys.length && requested < params.cap) {
        const room = params.cap - requested;
        const slice = keys.slice(offset, offset + Math.min(1000, room));
        offset += slice.length;
        requested += slice.length;
        const outcome = await this.deleteObjectsByKeys({
          bucket: params.bucket,
          keys: slice,
        });
        deleted += outcome.deleted.length;
        failed.push(...outcome.failed);
      }

      const hasMore =
        res.isTruncated &&
        res.nextContinuationToken !== undefined &&
        res.nextContinuationToken !== '';
      if (!hasMore) {
        break;
      }
      token = res.nextContinuationToken;
    }

    return { deleted, failed, requested };
  }

  async deleteObjectsByKeys(
    params: ObjectStorageDeleteObjectsParams
  ): Promise<ObjectStorageDeleteObjectsResult> {
    const client = this.getClient(params.bucket);
    if (params.keys.length === 0) {
      return { deleted: [], failed: [] };
    }
    const outcomes = await client.deleteObjects(params.keys);
    const deleted: string[] = [];
    const failed: { key: string; error: string }[] = [];
    for (let i = 0; i < params.keys.length; i += 1) {
      const key = params.keys[i];
      if (key === undefined) {
        continue;
      }
      const outcome = outcomes[i];
      if (outcome === true) {
        deleted.push(key);
      } else {
        failed.push({ key, error: 'Delete failed or was rejected by the storage provider' });
      }
    }
    return { deleted, failed };
  }
}
