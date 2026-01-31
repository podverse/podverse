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
