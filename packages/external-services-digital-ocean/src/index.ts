import {
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

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

export class DigitalOceanService {
  private client: S3Client;

  constructor(params: DigitalOceanServiceParams) {
    const endpoint = params.endpoint ?? `https://${params.region}.digitaloceanspaces.com`;
    this.client = new S3Client({
      region: params.region,
      endpoint,
      credentials: {
        accessKeyId: params.accessKey,
        secretAccessKey: params.secretKey,
      },
    });
  }

  private hasMetadata(value: unknown): value is { $metadata?: { httpStatusCode?: number } } {
    return typeof value === 'object' && value !== null && '$metadata' in value;
  }

  private isNotFoundError(error: unknown): boolean {
    if (!this.hasMetadata(error)) {
      return false;
    }
    return error.$metadata?.httpStatusCode === 404;
  }

  async uploadResizedImage(params: DigitalOceanUploadParams): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl,
      ACL: 'public-read',
    });
    await this.client.send(command);
  }

  async deleteImageByKey(params: DigitalOceanDeleteParams): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });
    await this.client.send(command);
  }

  async objectExists(params: DigitalOceanObjectExistsParams): Promise<boolean> {
    const command = new HeadObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });
    try {
      await this.client.send(command);
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async listObjects(params: DigitalOceanListObjectsParams): Promise<DigitalOceanListObjectsResult> {
    const command = new ListObjectsV2Command({
      Bucket: params.bucket,
      Prefix: params.prefix,
      ContinuationToken: params.continuationToken,
      MaxKeys: params.maxKeys,
    });
    const response = await this.client.send(command);
    const objects =
      response.Contents?.flatMap((item) => {
        if (!item.Key) {
          return [];
        }
        return [
          {
            key: item.Key,
            lastModified: item.LastModified,
          },
        ];
      }) ?? [];
    return {
      objects,
      nextContinuationToken: response.NextContinuationToken,
      isTruncated: response.IsTruncated ?? false,
    };
  }

  getPublicUrl(params: DigitalOceanPublicUrlParams): string {
    const base = params.cdnBaseUrl.replace(/\/+$/, '');
    const key = params.key.replace(/^\/+/, '');
    return `${base}/${key}`;
  }
}
