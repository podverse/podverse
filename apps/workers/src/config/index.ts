/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup for running command */

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

export type DigitalOceanConfig = {
  accessKey: string;
  secretKey: string;
  region: string;
};

export function getDigitalOceanConfig(): DigitalOceanConfig {
  return {
    accessKey: process.env.DIGITAL_OCEAN_ACCESS_KEY!,
    secretKey: process.env.DIGITAL_OCEAN_SECRET_KEY!,
    region: process.env.IMAGE_CDN_REGION!,
  };
}

/** Provider-agnostic config for image shrink storage (bucket + CDN base URL). */
export type ImageShrinkStorageConfig = {
  bucket: string;
  cdnBaseUrl: string;
};

/** Returns storage config from provider-agnostic env (IMAGE_CDN_BUCKET, IMAGE_CDN_BASE_URL). */
export function getImageShrinkStorageConfig(): ImageShrinkStorageConfig {
  return {
    bucket: process.env.IMAGE_CDN_BUCKET!,
    cdnBaseUrl: process.env.IMAGE_CDN_BASE_URL!,
  };
}

export type ImageShrinkConfig = {
  widthPx: number;
  batchSize: number;
  concurrency: number;
  rps: number;
};

const IMAGE_SHRINK_REQUIRED_VARS = [
  'DIGITAL_OCEAN_ACCESS_KEY',
  'DIGITAL_OCEAN_SECRET_KEY',
  'IMAGE_CDN_REGION',
  'IMAGE_CDN_BUCKET',
  'IMAGE_CDN_BASE_URL',
  'IMAGE_SHRINK_WIDTH_PX',
  'IMAGE_SHRINK_BATCH_SIZE',
  'IMAGE_SHRINK_CONCURRENCY',
  'IMAGE_SHRINK_RPS',
] as const;

const isEnvVarSet = (value: string | undefined): boolean => {
  return value !== undefined && value.trim() !== '';
};

export function hasAnyImageShrinkEnvSet(): boolean {
  return IMAGE_SHRINK_REQUIRED_VARS.some((key) => isEnvVarSet(process.env[key]));
}

export function isImageShrinkEnabled(): boolean {
  return IMAGE_SHRINK_REQUIRED_VARS.every((key) => isEnvVarSet(process.env[key]));
}

export function getImageShrinkConfig(): ImageShrinkConfig {
  return {
    widthPx: Number(process.env.IMAGE_SHRINK_WIDTH_PX!),
    batchSize: Number(process.env.IMAGE_SHRINK_BATCH_SIZE!),
    concurrency: Number(process.env.IMAGE_SHRINK_CONCURRENCY!),
    rps: Number(process.env.IMAGE_SHRINK_RPS!),
  };
}

export type KeyvaldbConfig = {
  host: string;
  port: number;
  password: string;
  cacheTTLSeconds: number;
};

export function getKeyvaldbConfig(): KeyvaldbConfig {
  return {
    host: process.env.KEYVALDB_HOST!,
    port: Number(process.env.KEYVALDB_PORT!),
    password: process.env.KEYVALDB_PASSWORD!,
    cacheTTLSeconds: Number(process.env.KEYVALDB_CACHE_TTL_SECONDS!),
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
