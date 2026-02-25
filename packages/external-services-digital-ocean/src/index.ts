import { S3mini } from 's3mini';

export type DigitalOceanServiceParams = {
  accessKey: string;
  secretKey: string;
  region: string;
  endpoint?: string;
};

export type DigitalOceanUploadParams = {
  bucket: string;
  key: string;
  body: Uint8Array;
  contentType: string;
  cacheControl?: string;
};

export type DigitalOceanDeleteParams = {
  bucket: string;
  key: string;
};

export type DigitalOceanObjectExistsParams = {
  bucket: string;
  key: string;
};

export type DigitalOceanPublicUrlParams = {
  cdnBaseUrl: string;
  key: string;
};

export type DigitalOceanListObjectsParams = {
  bucket: string;
  prefix?: string;
  continuationToken?: string;
  maxKeys?: number;
};

export type DigitalOceanListObject = {
  key: string;
  lastModified?: Date;
};

export type DigitalOceanListObjectsResult = {
  objects: DigitalOceanListObject[];
  nextContinuationToken?: string;
  isTruncated: boolean;
};

/**
 * Builds the S3-compatible endpoint URL for a bucket.
 * When no custom endpoint is set: virtual-hosted style https://{bucket}.{region}.digitaloceanspaces.com.
 * When custom endpoint is set (e.g. https://nyc3.digitaloceanspaces.com): https://{bucket}.{host}.
 */
function endpointForBucket(bucket: string, region: string, customEndpoint?: string): string {
  const base = customEndpoint ?? `https://${region}.digitaloceanspaces.com`;
  const parsed = new URL(base);
  return `https://${bucket}.${parsed.hostname}`;
}

export class DigitalOceanService {
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly region: string;
  private readonly endpoint: string | undefined;
  private readonly clientCache = new Map<string, S3mini>();

  constructor(params: DigitalOceanServiceParams) {
    this.accessKey = params.accessKey;
    this.secretKey = params.secretKey;
    this.region = params.region;
    this.endpoint = params.endpoint;
  }

  private getClient(bucket: string): S3mini {
    let client = this.clientCache.get(bucket);
    if (client === undefined) {
      const endpointUrl = endpointForBucket(bucket, this.region, this.endpoint);
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

  async uploadResizedImage(params: DigitalOceanUploadParams): Promise<void> {
    const client = this.getClient(params.bucket);
    const additionalHeaders: Record<string, string> = { 'x-amz-acl': 'public-read' };
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

  async deleteImageByKey(params: DigitalOceanDeleteParams): Promise<void> {
    const client = this.getClient(params.bucket);
    await client.deleteObject(params.key);
  }

  async objectExists(params: DigitalOceanObjectExistsParams): Promise<boolean> {
    const client = this.getClient(params.bucket);
    const result = await client.objectExists(params.key);
    return result === true;
  }

  async listObjects(params: DigitalOceanListObjectsParams): Promise<DigitalOceanListObjectsResult> {
    const client = this.getClient(params.bucket);
    const prefix = params.prefix ?? '';
    const maxKeys = params.maxKeys ?? 1000;
    const result = await client.listObjectsPaged('/', prefix, maxKeys, params.continuationToken);
    if (result === null || result === undefined) {
      return { objects: [], nextContinuationToken: undefined, isTruncated: false };
    }
    const objects: DigitalOceanListObject[] = (result.objects ?? []).map((item) => ({
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

  getPublicUrl(params: DigitalOceanPublicUrlParams): string {
    const base = params.cdnBaseUrl.replace(/\/+$/, '');
    const key = params.key.replace(/^\/+/, '');
    return `${base}/${key}`;
  }
}
