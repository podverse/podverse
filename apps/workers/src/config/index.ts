/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup for running command */

import type {
  BucketRuntimeConfig,
  BucketStorageConfig,
} from '@podverse/external-services-object-storage';
import {
  hasAnyBucketProviderEnvSet,
  isBucketStorageEnabled,
  readBucketRuntimeConfig,
  readBucketStorageConfig,
} from '@podverse/external-services-object-storage';
import {
  DEFAULT_NOTIFICATION_RETENTION_DAYS,
  DEFAULT_ON_DEMAND_PARSER_EVENT_RETENTION_DAYS,
  DEFAULT_SCHEDULED_JOB_RETENTION_DAYS,
  DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS,
  parseCountPerWindowEnvFromKey,
  readOptionalPositiveExpirationEnv,
  readRequiredPositiveExpirationEnv,
} from '@podverse/helpers';
import type { ObservabilityConfig } from '@podverse/observability/config';
import { buildObservabilityConfigFromEnv } from '@podverse/observability/config';

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
export {
  BUCKET_PROVIDERS,
  isBucketProvider,
  SUPPORTED_BUCKET_PROVIDERS,
} from '@podverse/external-services-object-storage';

export type { BucketRuntimeConfig };

/** Reads bucket + S3 client wiring after startup validation (including `BUCKET_PROVIDER`). */
export function getBucketRuntimeConfig(): BucketRuntimeConfig {
  return readBucketRuntimeConfig();
}

/** Provider-agnostic config for image shrink storage (bucket + CDN base URL). */
export type ImageShrinkStorageConfig = BucketStorageConfig;

/** Returns storage config from provider-agnostic env (BUCKET_NAME, BUCKET_CDN_BASE_URL). */
export function getImageShrinkStorageConfig(): ImageShrinkStorageConfig {
  return readBucketStorageConfig();
}

export type ImageShrinkConfig = {
  widthPx: number;
  webpQuality: number;
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

const IMAGE_SHRINK_EXTRA_REQUIRED_VARS = [
  'IMAGE_SHRINK_BATCH_SIZE',
  'IMAGE_SHRINK_CONCURRENCY',
  'IMAGE_SHRINK_RPS',
] as const;

const isEnvVarSet = (value: string | undefined): boolean => {
  return value !== undefined && value.trim() !== '';
};

export function hasAnyImageShrinkEnvSet(): boolean {
  return hasAnyBucketProviderEnvSet();
}

export function isImageShrinkEnabled(): boolean {
  return (
    isBucketStorageEnabled() &&
    IMAGE_SHRINK_EXTRA_REQUIRED_VARS.every((key) => isEnvVarSet(process.env[key]))
  );
}

const DEFAULT_IMAGE_SHRINK_MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const DEFAULT_IMAGE_SHRINK_WIDTH_PX = 400;
const DEFAULT_IMAGE_SHRINK_WEBP_QUALITY = 92;

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

const resolveImageShrinkWidthPx = (): number => {
  const parsed = parseOptionalNumber(process.env.IMAGE_SHRINK_WIDTH_PX);
  if (parsed === null) {
    return DEFAULT_IMAGE_SHRINK_WIDTH_PX;
  }
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return Number.NaN;
};

const resolveImageShrinkWebpQuality = (): number => {
  const parsed = parseOptionalNumber(process.env.IMAGE_SHRINK_WEBP_QUALITY);
  if (parsed === null) {
    return DEFAULT_IMAGE_SHRINK_WEBP_QUALITY;
  }
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 100) {
    return parsed;
  }
  return Number.NaN;
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
    widthPx: resolveImageShrinkWidthPx(),
    webpQuality: resolveImageShrinkWebpQuality(),
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

export type OpmlImportConfig = {
  maxFeedsPerHour: number;
};

export function getOpmlImportConfig(): OpmlImportConfig {
  return {
    maxFeedsPerHour: parseCountPerWindowEnvFromKey({
      envValue: process.env.OPML_IMPORT_MAX_FEEDS_PER_HOUR,
      key: 'OPML_IMPORT_MAX_FEEDS_PER_HOUR',
      defaultMax: 50,
    }).max,
  };
}

export type PodcastIndexConfig = {
  authKey: string;
  baseUrl: string;
  secretKey: string;
  rateLimitDelay?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
};

export function getPodcastIndexConfig(): PodcastIndexConfig {
  const rateLimitDelay = process.env.PODCAST_INDEX_API_RATE_LIMIT_DELAY
    ? parseInt(process.env.PODCAST_INDEX_API_RATE_LIMIT_DELAY, 10)
    : 0;
  const maxRetries = process.env.PODCAST_INDEX_API_MAX_RETRIES
    ? parseInt(process.env.PODCAST_INDEX_API_MAX_RETRIES, 10)
    : undefined;
  const retryBaseDelayMs = process.env.PODCAST_INDEX_API_RETRY_BASE_DELAY_MS
    ? parseInt(process.env.PODCAST_INDEX_API_RETRY_BASE_DELAY_MS, 10)
    : undefined;
  return {
    authKey: process.env.PODCAST_INDEX_AUTH_KEY!,
    baseUrl: process.env.PODCAST_INDEX_BASE_URL!,
    secretKey: process.env.PODCAST_INDEX_SECRET_KEY!,
    ...(rateLimitDelay > 0 && { rateLimitDelay }),
    ...(maxRetries !== undefined && Number.isFinite(maxRetries) && { maxRetries }),
    ...(retryBaseDelayMs !== undefined &&
      Number.isFinite(retryBaseDelayMs) &&
      retryBaseDelayMs > 0 && { retryBaseDelayMs }),
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

export type ExtensionsConfig = {
  prometheus: {
    enabled: boolean;
  };
  otel: {
    otlpEndpoint: string;
    serviceName: string;
    resourceAttributes: string | undefined;
  };
};

export function getObservabilityConfig(): ObservabilityConfig {
  return buildObservabilityConfigFromEnv(process.env);
}

export function getExtensionsConfig(): ExtensionsConfig {
  return {
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED === 'true',
    },
    otel: {
      otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT!,
      serviceName: process.env.OTEL_SERVICE_NAME!,
      resourceAttributes: process.env.OTEL_RESOURCE_ATTRIBUTES,
    },
  };
}

/**
 * A retention window in days, or the default when the variable is absent or blank.
 *
 * Blank is treated as absent because a template ships these keys empty; a deployment that has not
 * filled one in wants the default, not `NaN` days of retention silently deleting everything or
 * nothing. A value that is present but unparseable is left as `NaN` for startup validation to
 * reject, so a typo fails loudly at boot rather than quietly reverting to the default.
 */
const resolveRetentionDays = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  return Number.parseInt(raw, 10);
};

export type StatsConfig = {
  trackEventRetentionDays: number;
};

export function getStatsConfig(): StatsConfig {
  return {
    trackEventRetentionDays: resolveRetentionDays(
      process.env.STATS_TRACK_EVENT_RETENTION_DAYS,
      DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS
    ),
  };
}

export type NotificationsRetentionConfig = {
  retentionDays: number;
};

export function getNotificationsRetentionConfig(): NotificationsRetentionConfig {
  return {
    retentionDays: resolveRetentionDays(
      process.env.NOTIFICATION_RETENTION_DAYS,
      DEFAULT_NOTIFICATION_RETENTION_DAYS
    ),
  };
}

export type ScheduledJobRetentionConfig = {
  retentionDays: number;
};

export function getScheduledJobRetentionConfig(): ScheduledJobRetentionConfig {
  return {
    retentionDays: resolveRetentionDays(
      process.env.SCHEDULED_JOB_RETENTION_DAYS,
      DEFAULT_SCHEDULED_JOB_RETENTION_DAYS
    ),
  };
}

export type OnDemandParserEventRetentionConfig = {
  retentionDays: number;
};

export function getOnDemandParserEventRetentionConfig(): OnDemandParserEventRetentionConfig {
  return {
    retentionDays: resolveRetentionDays(
      process.env.ON_DEMAND_PARSER_EVENT_RETENTION_DAYS,
      DEFAULT_ON_DEMAND_PARSER_EVENT_RETENTION_DAYS
    ),
  };
}
