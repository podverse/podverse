/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup for running command */

import type { BucketProvider } from '@podverse/external-services-object-storage';
import { BUCKET_PROVIDERS, isBucketProvider } from '@podverse/external-services-object-storage';
import {
  readOptionalPositiveExpirationEnv,
  readRequiredPositiveExpirationEnv,
} from '@podverse/helpers';

/**
 * Category-scoped config getters. Each getter reads only its env vars.
 * Call only the getters for the command's categories (see getCategoriesForCommand).
 */

export type BaseConfig = {
  userAgent: string;
  log: {
    level: string;
    dir: string;
    timer: boolean;
  };
};

export function getBaseConfig(): BaseConfig {
  return {
    userAgent: process.env.USER_AGENT!,
    log: {
      level: process.env.LOG_LEVEL!,
      dir: process.env.LOG_DIR ?? '',
      timer: process.env.LOG_TIMER === 'true',
    },
  };
}

export type MQConfig = {
  protocol: string;
  host: string;
  username: string;
  password: string;
  port: number;
};

export function getMQConfig(): MQConfig {
  return {
    protocol: process.env.MESSAGE_QUEUE_PROTOCOL!,
    host: process.env.MESSAGE_QUEUE_HOST!,
    username: process.env.MESSAGE_QUEUE_USERNAME!,
    password: process.env.MESSAGE_QUEUE_PASSWORD!,
    port: Number(process.env.MESSAGE_QUEUE_PORT!),
  };
}

/** Allowed `BUCKET_PROVIDER` values for image shrink (single source of truth with validation). */
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

/** Reads bucket + S3 client wiring after startup validation (including `BUCKET_PROVIDER`). */
export function getBucketRuntimeConfig(): BucketRuntimeConfig {
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

/** Provider-agnostic config for image shrink storage (bucket + CDN base URL). */
export type ImageShrinkStorageConfig = {
  bucket: string;
  cdnBaseUrl: string;
};

/** Returns storage config from provider-agnostic env (BUCKET_NAME, BUCKET_CDN_BASE_URL). */
export function getImageShrinkStorageConfig(): ImageShrinkStorageConfig {
  return {
    bucket: process.env.BUCKET_NAME!,
    cdnBaseUrl: process.env.BUCKET_CDN_BASE_URL!,
  };
}

export type ImageShrinkConfig = {
  widthPx: number;
  batchSize: number;
  concurrency: number;
  rps: number;
  maxSourceBytes: number;
};

export type ImageShrinkCleanupConfig = {
  dryRun: boolean;
  maxDelete: number | null;
  minAgeExpiration: number;
  pageSize: number;
};

const IMAGE_SHRINK_REQUIRED_VARS = [
  'BUCKET_ACCESS_KEY',
  'BUCKET_SECRET_KEY',
  'BUCKET_REGION',
  'BUCKET_NAME',
  'BUCKET_CDN_BASE_URL',
  'IMAGE_SHRINK_WIDTH_PX',
  'IMAGE_SHRINK_BATCH_SIZE',
  'IMAGE_SHRINK_CONCURRENCY',
  'IMAGE_SHRINK_RPS',
] as const;

const isEnvVarSet = (value: string | undefined): boolean => {
  return value !== undefined && value.trim() !== '';
};

export function hasAnyImageShrinkEnvSet(): boolean {
  return isEnvVarSet(process.env.BUCKET_PROVIDER);
}

export function isImageShrinkEnabled(): boolean {
  const provider = process.env.BUCKET_PROVIDER?.trim();
  return (
    provider !== undefined &&
    isBucketProvider(provider) &&
    IMAGE_SHRINK_REQUIRED_VARS.every((key) => isEnvVarSet(process.env[key]))
  );
}

const DEFAULT_IMAGE_SHRINK_MAX_SOURCE_BYTES = 20 * 1024 * 1024;

const parseOptionalNumber = (value: string | undefined): number | null => {
  if (!value || value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
};

export function getImageShrinkConfig(): ImageShrinkConfig {
  const maxSourceBytesParsed = parseOptionalNumber(process.env.IMAGE_SHRINK_MAX_SOURCE_BYTES);
  const maxSourceBytes =
    maxSourceBytesParsed !== null &&
    maxSourceBytesParsed > 0 &&
    Number.isInteger(maxSourceBytesParsed)
      ? maxSourceBytesParsed
      : DEFAULT_IMAGE_SHRINK_MAX_SOURCE_BYTES;
  return {
    widthPx: Number(process.env.IMAGE_SHRINK_WIDTH_PX!),
    batchSize: Number(process.env.IMAGE_SHRINK_BATCH_SIZE!),
    concurrency: Number(process.env.IMAGE_SHRINK_CONCURRENCY!),
    rps: Number(process.env.IMAGE_SHRINK_RPS!),
    maxSourceBytes,
  };
}

const DEFAULT_ORPHAN_MIN_AGE_EXPIRATION = 7 * 24 * 60 * 60;
const DEFAULT_ORPHAN_CLEANUP_PAGE_SIZE = 500;

export function getImageShrinkCleanupConfig(): ImageShrinkCleanupConfig {
  const maxDelete = parseOptionalNumber(process.env.IMAGE_SHRINK_ORPHAN_CLEANUP_MAX_DELETE);
  const minAgeExpiration = readOptionalPositiveExpirationEnv(
    'IMAGE_SHRINK_ORPHAN_MIN_AGE_EXPIRATION',
    DEFAULT_ORPHAN_MIN_AGE_EXPIRATION
  );
  const pageSize =
    parseOptionalNumber(process.env.IMAGE_SHRINK_ORPHAN_CLEANUP_PAGE_SIZE) ??
    DEFAULT_ORPHAN_CLEANUP_PAGE_SIZE;

  return {
    dryRun: process.env.IMAGE_SHRINK_ORPHAN_CLEANUP_DRY_RUN !== 'false',
    maxDelete: maxDelete && maxDelete > 0 ? maxDelete : null,
    minAgeExpiration,
    pageSize: pageSize > 0 ? pageSize : DEFAULT_ORPHAN_CLEANUP_PAGE_SIZE,
  };
}

export type KeyvaldbConfig = {
  host: string;
  port: number;
  password: string;
  cacheExpiration: number;
};

export function getKeyvaldbConfig(): KeyvaldbConfig {
  return {
    host: process.env.KEYVALDB_HOST!,
    port: Number(process.env.KEYVALDB_PORT!),
    password: process.env.KEYVALDB_PASSWORD!,
    cacheExpiration: readRequiredPositiveExpirationEnv('KEYVALDB_CACHE_EXPIRATION'),
  };
}

export type PodcastIndexConfig = {
  authKey: string;
  baseUrl: string;
  secretKey: string;
  rateLimitDelay?: number;
};

export function getPodcastIndexConfig(): PodcastIndexConfig {
  const rateLimitDelay = process.env.PODCAST_INDEX_API_RATE_LIMIT_DELAY
    ? parseInt(process.env.PODCAST_INDEX_API_RATE_LIMIT_DELAY, 10)
    : 0;
  return {
    authKey: process.env.PODCAST_INDEX_AUTH_KEY!,
    baseUrl: process.env.PODCAST_INDEX_BASE_URL!,
    secretKey: process.env.PODCAST_INDEX_SECRET_KEY!,
    ...(rateLimitDelay > 0 && { rateLimitDelay }),
  };
}

export type ExternalServicesConfig = {
  firebase: {
    notifications_enabled: boolean;
    admin_json_key_path: string | undefined;
  };
  web: {
    protocol: string;
    host: string;
    icon_image_url: string | undefined;
  };
};

export function getExternalServicesConfig(): ExternalServicesConfig {
  return {
    firebase: {
      notifications_enabled: process.env.GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED === 'true',
      admin_json_key_path: process.env.GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH,
    },
    web: {
      protocol: process.env.WEB_PROTOCOL!,
      host: process.env.WEB_DOMAIN!,
      icon_image_url: process.env.WEB_ICON_IMAGE_PATH,
    },
  };
}

export type NotificationsConfig = {
  brandName: string;
  web: {
    protocol: string;
    host: string;
    icon_image_path: string | undefined;
  };
  webpush: {
    enabled: boolean;
    vapid_public_key: string | undefined;
    vapid_private_key: string | undefined;
    vapid_subject: string | undefined;
  };
};

export function getNotificationsConfig(): NotificationsConfig {
  return {
    brandName: process.env.BRAND_NAME!,
    web: {
      protocol: process.env.WEB_PROTOCOL!,
      host: process.env.WEB_DOMAIN!,
      icon_image_path: process.env.WEB_ICON_IMAGE_PATH,
    },
    webpush: {
      enabled: process.env.WEBPUSH_ENABLED === 'true',
      vapid_public_key: process.env.WEBPUSH_VAPID_PUBLIC_KEY,
      vapid_private_key: process.env.WEBPUSH_VAPID_PRIVATE_KEY,
      vapid_subject: process.env.WEBPUSH_VAPID_SUBJECT,
    },
  };
}
