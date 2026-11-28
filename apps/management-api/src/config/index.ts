/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup in lib/startup/validation.ts */

import { resolveAdminSessionRetentionDays } from '@management-api/lib/auth/adminSessionPurge.js';

import type { SecondFactorMode } from '@podverse/helpers';
import {
  DEFAULT_AUTH_ACCESS_TOKEN_EXPIRATION,
  DEFAULT_AUTH_SESSION_IDLE_EXPIRATION,
  DEFAULT_SET_PASSWORD_EXPIRATION,
  isSecondFactorMode,
  MS_PER_SECOND,
  parseCountPerWindowEnvFromKey,
  readOptionalPositiveExpirationEnv,
} from '@podverse/helpers';
import type { BillingProcessorEnv, CatalogConfig } from '@podverse/helpers-config';
import { buildCatalogConfigFromEnv, readBillingProcessorEnv } from '@podverse/helpers-config';
import type { ObservabilityConfig } from '@podverse/observability/config';
import { buildObservabilityConfigFromEnv } from '@podverse/observability/config';

type Config = {
  nodeEnv: string;
  userAgent: string;
  brandName: string;
  secondFactor: {
    mode: () => SecondFactorMode;
    keyHex: () => string;
    emailPerAccountHour: () => number;
    emailPerAccountDay: () => number;
    emailPerIpHour: () => number;
  };
  mailer: {
    host: string;
    port: string;
    username: string;
    password: string;
    from: string;
  };
  log: {
    level: string;
    dir: string;
  };
  observability: ObservabilityConfig;
  extensions: {
    prometheus: {
      enabled: boolean;
    };
    otel: {
      otlpEndpoint: string;
      serviceName: string;
      resourceAttributes: string | undefined;
    };
  };
  auth: {
    jwtSecret: string;
    /** Idle limit in seconds for every admin session; each use renews it. */
    sessionIdleExpiration: number;
    sessionCookieMaxAgeMs: number;
    /** From AUTH_ACCESS_TOKEN_EXPIRATION. Silently refreshed; does not bound sign-in length. */
    accessTokenExpiration: number;
    allowTokenInResponseBody: boolean;
  };
  /** Days an admin_session row is kept after idle expiry. Blank uses 30; unparseable stays NaN. */
  adminSessionRetentionDays: number;
  api: {
    port: number;
    prefix: string;
    version: string;
    release: string;
    cookie: {
      domain: string;
    };
    allowedCORSOrigins: string[];
  };
  database: {
    host: string;
    port: number;
    read_username: string;
    read_password: string;
    read_write_username: string;
    read_write_password: string;
    database: string;
    ssl_connection: boolean;
  };
  appDatabase: {
    host: string;
    port: number;
    read_username: string;
    read_password: string;
    read_write_username: string;
    read_write_password: string;
    database: string;
    ssl_connection: boolean;
  };
  keyvaldb: {
    host: string;
    port: number;
    password: string;
  };
  /** Main app web origin: user invite / set-password links */
  appWeb: {
    protocol: string;
    domain: string;
  };
  /** Management web app origin: admin redeem-invite links */
  managementWeb: {
    protocol: string;
    domain: string;
  };
  setUserPasswordExpiration: number;
  billing: {
    /** `BILLING_ALLOW_TEST_ADAPTER`, for staging deployments that run with production settings. */
    allowTestAdapter: boolean;
    /** Raw `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS`. */
    sandboxAllowedAccountIds: string | undefined;
    /** `BILLING_SANDBOX_GRANT_ALL`. Every sandbox purchase grants while `NODE_ENV` is production. */
    grantAllSandboxPurchases: boolean;
    processors: BillingProcessorEnv;
  };
  catalog: CatalogConfig;
  /** Blank when the Podcast Index secret is not mounted. Directory search needs all three. */
  podcastIndex: {
    authKey: string | undefined;
    baseUrl: string | undefined;
    secretKey: string | undefined;
  };
};

export const config: Config = {
  nodeEnv: process.env.NODE_ENV!,
  userAgent: process.env.USER_AGENT!,
  brandName: process.env.BRAND_NAME!,
  secondFactor: {
    mode(): SecondFactorMode {
      const value = process.env.MANAGEMENT_AUTH_SECOND_FACTOR_MODE;
      if (!isSecondFactorMode(value)) {
        throw new Error('MANAGEMENT_AUTH_SECOND_FACTOR_MODE must be optional or required');
      }
      return value;
    },
    keyHex(): string {
      return process.env.MANAGEMENT_AUTH_SECOND_FACTOR_KEY ?? '';
    },
    emailPerAccountHour(): number {
      return parseCountPerWindowEnvFromKey({
        envValue: process.env.MANAGEMENT_AUTH_SECOND_FACTOR_EMAIL_MAX_PER_HOUR,
        key: 'MANAGEMENT_AUTH_SECOND_FACTOR_EMAIL_MAX_PER_HOUR',
        defaultMax: 3,
      }).max;
    },
    emailPerAccountDay(): number {
      return parseCountPerWindowEnvFromKey({
        envValue: process.env.MANAGEMENT_AUTH_SECOND_FACTOR_EMAIL_MAX_PER_DAY,
        key: 'MANAGEMENT_AUTH_SECOND_FACTOR_EMAIL_MAX_PER_DAY',
        defaultMax: 5,
      }).max;
    },
    emailPerIpHour(): number {
      return parseCountPerWindowEnvFromKey({
        envValue: process.env.MANAGEMENT_AUTH_SECOND_FACTOR_EMAIL_IP_MAX_PER_HOUR,
        key: 'MANAGEMENT_AUTH_SECOND_FACTOR_EMAIL_IP_MAX_PER_HOUR',
        defaultMax: 5,
      }).max;
    },
  },
  mailer: {
    host: process.env.MAILER_HOST ?? '',
    port: process.env.MAILER_PORT ?? '',
    username: process.env.MAILER_USERNAME ?? '',
    password: process.env.MAILER_PASSWORD ?? '',
    from: process.env.MAILER_FROM ?? '',
  },
  log: {
    level: process.env.LOG_LEVEL!,
    dir: process.env.LOG_DIR ?? '',
  },
  observability: buildObservabilityConfigFromEnv(process.env),
  extensions: {
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED === 'true',
    },
    otel: {
      otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT!,
      serviceName: process.env.OTEL_SERVICE_NAME!,
      resourceAttributes: process.env.OTEL_RESOURCE_ATTRIBUTES,
    },
  },
  auth: (() => {
    const sessionIdleExpiration = readOptionalPositiveExpirationEnv(
      'AUTH_SESSION_IDLE_EXPIRATION',
      DEFAULT_AUTH_SESSION_IDLE_EXPIRATION
    );
    return {
      jwtSecret: process.env.AUTH_JWT_SECRET!,
      sessionIdleExpiration,
      sessionCookieMaxAgeMs: sessionIdleExpiration * MS_PER_SECOND,
      accessTokenExpiration: readOptionalPositiveExpirationEnv(
        'AUTH_ACCESS_TOKEN_EXPIRATION',
        DEFAULT_AUTH_ACCESS_TOKEN_EXPIRATION
      ),
      allowTokenInResponseBody: process.env.AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY === 'true',
    };
  })(),
  adminSessionRetentionDays: resolveAdminSessionRetentionDays(
    process.env.ADMIN_SESSION_RETENTION_DAYS
  ),
  api: {
    port: parseInt(process.env.API_PORT!, 10),
    prefix: process.env.API_PREFIX!,
    version: process.env.API_VERSION!,
    release: process.env.API_RELEASE!,
    cookie: {
      domain: process.env.COOKIE_DOMAIN!,
    },
    allowedCORSOrigins: process.env
      .API_ALLOWED_CORS_ORIGINS!.split(',')
      .map((origin) => origin.trim()),
  },
  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!, 10),
    read_username: process.env.DB_MANAGEMENT_READ_USER!,
    read_password: process.env.DB_MANAGEMENT_READ_PASSWORD!,
    read_write_username: process.env.DB_MANAGEMENT_READ_WRITE_USER!,
    read_write_password: process.env.DB_MANAGEMENT_READ_WRITE_PASSWORD!,
    database: process.env.DB_MANAGEMENT_NAME!,
    ssl_connection: process.env.DB_SSL_CONNECTION === 'true',
  },
  appDatabase: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!, 10),
    read_username: process.env.DB_APP_READ_USER!,
    read_password: process.env.DB_APP_READ_PASSWORD!,
    read_write_username: process.env.DB_APP_READ_WRITE_USER!,
    read_write_password: process.env.DB_APP_READ_WRITE_PASSWORD!,
    database: process.env.DB_APP_NAME!,
    ssl_connection: process.env.DB_SSL_CONNECTION === 'true',
  },
  keyvaldb: {
    host: process.env.KEYVALDB_HOST!,
    port: parseInt(process.env.KEYVALDB_PORT!, 10),
    password: process.env.KEYVALDB_PASSWORD!,
  },
  appWeb: {
    protocol: process.env.APP_WEB_PROTOCOL!,
    domain: process.env.APP_WEB_DOMAIN!,
  },
  managementWeb: {
    protocol: process.env.MANAGEMENT_WEB_PROTOCOL!,
    domain: process.env.MANAGEMENT_WEB_DOMAIN!,
  },
  setUserPasswordExpiration: readOptionalPositiveExpirationEnv(
    'MANAGEMENT_API_SET_PASSWORD_EXPIRATION',
    DEFAULT_SET_PASSWORD_EXPIRATION
  ),
  billing: {
    allowTestAdapter: process.env.BILLING_ALLOW_TEST_ADAPTER === 'true',
    sandboxAllowedAccountIds: process.env.BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS,
    grantAllSandboxPurchases: process.env.BILLING_SANDBOX_GRANT_ALL === 'true',
    processors: readBillingProcessorEnv(process.env),
  },
  catalog: buildCatalogConfigFromEnv(process.env, ''),
  podcastIndex: {
    authKey: process.env.PODCAST_INDEX_AUTH_KEY,
    baseUrl: process.env.PODCAST_INDEX_BASE_URL,
    secretKey: process.env.PODCAST_INDEX_SECRET_KEY,
  },
};
