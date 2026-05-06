import { S3mini } from 's3mini';

import type { BucketProvider } from './bucketProvider.js';
import { buildS3MiniEndpoint } from './buildS3MiniEndpoint.js';

export type { BucketProvider } from './bucketProvider.js';
export { BUCKET_PROVIDERS, isBucketProvider } from './bucketProvider.js';
export { buildS3MiniEndpoint } from './buildS3MiniEndpoint.js';
export type { BuildS3MiniEndpointParams } from './buildS3MiniEndpoint.js';

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
  lastModified?: Date;
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
    const objects: ObjectStorageListObject[] = (result.objects ?? []).map((item) => ({
      key: item.Key,
      lastModified: item.LastModified,
    }));
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
}
