/* eslint-disable @typescript-eslint/no-non-null-assertion -- callers validate env before use (management-api, workers startup). */

import type { BucketProvider } from './bucketProvider.js';
import { BUCKET_PROVIDERS, isBucketProvider } from './bucketProvider.js';

export const SUPPORTED_BUCKET_PROVIDERS = BUCKET_PROVIDERS;

export type BucketRuntimeConfig = {
  provider: BucketProvider;
  accessKey: string;
  secretKey: string;
  region: string;
  endpoint?: string;
  forcePathStyle: boolean;
  /** Empty string means uploads omit `x-amz-acl` (bucket policy / provider behavior). */
  uploadPublicAcl: string;
};

export type BucketStorageConfig = {
  bucket: string;
  cdnBaseUrl: string;
};

const BUCKET_STORAGE_REQUIRED_VARS = [
  'BUCKET_ACCESS_KEY',
  'BUCKET_SECRET_KEY',
  'BUCKET_REGION',
  'BUCKET_NAME',
  'BUCKET_CDN_BASE_URL',
] as const;

const isEnvVarSet = (value: string | undefined): boolean => {
  return value !== undefined && value.trim() !== '';
};

function parseBucketEndpoint(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (trimmed === undefined || trimmed === '') {
    return undefined;
  }
  return trimmed;
}

function defaultForcePathStyle(provider: BucketProvider): boolean {
  switch (provider) {
    case 'digitalocean':
    case 'aws-s3':
      return false;
    case 'backblaze-b2':
    case 'garage':
    case 's3-compatible':
      return true;
  }
}

function defaultUploadPublicAcl(provider: BucketProvider): string {
  switch (provider) {
    case 'digitalocean':
    case 'aws-s3':
    case 'backblaze-b2':
      return 'public-read';
    case 'garage':
    case 's3-compatible':
      return '';
  }
}

function resolveForcePathStyle(provider: BucketProvider, raw: string | undefined): boolean {
  const trimmed = raw?.trim();
  if (trimmed === undefined || trimmed === '') {
    return defaultForcePathStyle(provider);
  }
  if (trimmed === 'true') {
    return true;
  }
  return false;
}

/** True when any bucket-related env hints are present (used for validation messaging). */
export function hasAnyBucketProviderEnvSet(): boolean {
  return isEnvVarSet(process.env.BUCKET_PROVIDER);
}

/** Full image-shrink / object-storage feature is on when provider is valid and all required vars are set. */
export function isBucketStorageEnabled(): boolean {
  const provider = process.env.BUCKET_PROVIDER?.trim();
  return (
    provider !== undefined &&
    isBucketProvider(provider) &&
    BUCKET_STORAGE_REQUIRED_VARS.every((key) => isEnvVarSet(process.env[key]))
  );
}

/** Reads bucket + S3 client wiring after startup validation (including `BUCKET_PROVIDER`). */
export function readBucketRuntimeConfig(): BucketRuntimeConfig {
  const providerRaw = process.env.BUCKET_PROVIDER!.trim();
  if (!isBucketProvider(providerRaw)) {
    throw new Error(`Invalid BUCKET_PROVIDER: "${providerRaw}"`);
  }
  const provider = providerRaw;
  return {
    provider,
    accessKey: process.env.BUCKET_ACCESS_KEY!,
    secretKey: process.env.BUCKET_SECRET_KEY!,
    region: process.env.BUCKET_REGION!,
    endpoint: parseBucketEndpoint(process.env.BUCKET_ENDPOINT),
    forcePathStyle: resolveForcePathStyle(provider, process.env.BUCKET_FORCE_PATH_STYLE),
    uploadPublicAcl: defaultUploadPublicAcl(provider),
  };
}

/** Returns storage config from provider-agnostic env (`BUCKET_NAME`, `BUCKET_CDN_BASE_URL`). */
export function readBucketStorageConfig(): BucketStorageConfig {
  return {
    bucket: process.env.BUCKET_NAME!,
    cdnBaseUrl: process.env.BUCKET_CDN_BASE_URL!,
  };
}
