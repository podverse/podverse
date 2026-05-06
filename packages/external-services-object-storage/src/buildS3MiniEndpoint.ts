import type { BucketProvider } from './bucketProvider.js';

export type BuildS3MiniEndpointParams = {
  provider: BucketProvider;
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle: boolean;
};

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Builds the full endpoint URL string passed to `s3mini` (`S3mini` extracts bucket from
 * virtual-hosted hostname or first path segment — see s3mini README).
 */
export function buildS3MiniEndpoint(params: BuildS3MiniEndpointParams): string {
  const bucket = params.bucket;
  const ep = params.endpoint?.trim();

  if (params.forcePathStyle) {
    let base: string;
    if (params.provider === 'backblaze-b2') {
      base =
        ep && ep !== '' ? trimTrailingSlashes(ep) : `https://s3.${params.region}.backblazeb2.com`;
    } else {
      if (ep === undefined || ep === '') {
        throw new Error(
          `BUCKET_ENDPOINT is required for path-style access with provider "${params.provider}"`
        );
      }
      base = trimTrailingSlashes(ep);
    }
    return `${base}/${bucket}`;
  }

  switch (params.provider) {
    case 'digitalocean': {
      const base = ep && ep !== '' ? ep : `https://${params.region}.digitaloceanspaces.com`;
      const parsed = new URL(base);
      return `https://${bucket}.${parsed.hostname}`;
    }
    case 'aws-s3':
      return `https://${bucket}.s3.${params.region}.amazonaws.com`;
    case 'backblaze-b2': {
      const base =
        ep && ep !== '' ? trimTrailingSlashes(ep) : `https://s3.${params.region}.backblazeb2.com`;
      return `${base}/${bucket}`;
    }
    case 'garage':
    case 's3-compatible': {
      if (ep === undefined || ep === '') {
        throw new Error(`BUCKET_ENDPOINT is required for provider "${params.provider}"`);
      }
      const parsed = new URL(ep);
      return `https://${bucket}.${parsed.hostname}`;
    }
    default: {
      const _exhaustive: never = params.provider;
      throw new Error(`Unsupported bucket provider "${String(_exhaustive)}"`);
    }
  }
}
