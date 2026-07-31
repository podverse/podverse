/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup in lib/startup/validation.ts */

import type { AccountSignupMode } from '@podverse/helpers';
import {
  DEFAULT_AUTH_JWT_EXPIRATION,
  DEFAULT_FREE_TRIAL_EXPIRATION,
  DEFAULT_RESET_PASSWORD_TOKEN_EXPIRATION,
  DEFAULT_VERIFY_AND_EMAIL_CHANGE_TOKEN_EXPIRATION,
  MS_PER_SECOND,
  parseCountPerWindowEnvFromKey,
  readOptionalPositiveExpirationEnv,
  readRequiredPositiveExpirationEnv,
} from '@podverse/helpers';
import type { ObservabilityConfig } from '@podverse/observability/config';
import { buildObservabilityConfigFromEnv } from '@podverse/observability/config';

type SocialConfig = {
  pageUrl: string;
  imageUrl: string;
};

type Config = {
  rateLimits: {
    authLogin: { windowMs: number; max: number };
    accountCreate: { windowMs: number; max: number };
    accountSendVerificationEmail: { windowMs: number; max: number };
    accountVerifyEmail: { windowMs: number; max: number };
    accountSendChangeEmail: { windowMs: number; max: number };
    accountVerifyEmailChange: { windowMs: number; max: number };
    accountSendResetPasswordEmail: { windowMs: number; max: number };
    accountResetPassword: { windowMs: number; max: number };
    accountSetPassword: { windowMs: number; max: number };
    accountDownloadData: { windowMs: number; max: number };
    accountOpmlExport: { windowMs: number; max: number };
    accountOpmlImportEnqueue: { windowMs: number; max: number };
    accountAddByRssParseEnqueue: { windowMs: number; max: number };
    accountAddByRssChaptersTranscript: { windowMs: number; max: number };
    mqRssOnDemand: { windowMs: number; max: number };
  };
  nodeEnv: string;
  serverEnv: string;
  userAgent: string;
  brandName: string;
  brand: {
    bannerImage3x1Url: string;
    colorPrimary: string;
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
    /** From AUTH_JWT_EXPIRATION. */
    jwtExpiration: number;
    sessionCookieMaxAgeMs: number;
    /** When true, login may include JWT in JSON if the client sends includeTokenInResponseBody (non-cookie clients only). */
    allowTokenInResponseBody: boolean;
  };
  api: {
    port: string;
    prefix: string;
    version: string;
    release: string;
    cookie: {
      domain: string;
    };
    allowedCORSOrigins: string[];
  };
  emailChangeVerification: {
    tokenExpiration: number;
  };
  legal: {
    name: string;
    address: string;
  };
  terms: {
    version: string;
  };
  mailer: {
    disabled: boolean;
    host: string;
    port: string;
    username: string;
    password: string;
    from: string;
  };
  paypal: {
    clientId: string;
    clientSecret: string;
  };
  podcastIndex: {
    authKey: string;
    baseUrl: string;
    searchMax: number;
    secretKey: string;
  };
  activeMQArtemis: {
    protocol: string;
    host: string;
    username: string;
    password: string;
    port: number;
  };
  keyvaldb: {
    host: string;
    port: number;
    password: string;
    cacheExpiration: number;
  };
  resetPassword: {
    tokenExpiration: number;
  };
  social: {
    facebook: SocialConfig;
    github: SocialConfig;
    reddit: SocialConfig;
    twitter: SocialConfig;
  };
  verifyEmail: {
    tokenExpiration: number;
  };
  web: {
    protocol: string;
    domain: string;
  };
  premium: {
    costMonthly: number;
    costAnnually: number;
    signupMode: AccountSignupMode;
    freeTrialExpiration: number;
  };
  e2e: {
    /** When true (apiMobileE2e), use deterministic local fixtures instead of live PI / MQ. */
    fixturesEnabled: boolean;
  };
  opmlImport: {
    /** Max new (PI enqueue / add-by-RSS) feeds per account per hour. */
    maxFeedsPerHour: number;
  };
};

export const config: Config = {
  rateLimits: {
    authLogin: parseCountPerWindowEnvFromKey({
      envValue: process.env.AUTH_LOGIN_MAX_PER_MINUTE,
      key: 'AUTH_LOGIN_MAX_PER_MINUTE',
      defaultMax: 5,
    }),
    accountCreate: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_CREATE_MAX_PER_10_MINUTES,
      key: 'ACCOUNT_CREATE_MAX_PER_10_MINUTES',
      defaultMax: 3,
    }),
    accountSendVerificationEmail: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_SEND_VERIFICATION_EMAIL_MAX_PER_10_MINUTES,
      key: 'ACCOUNT_SEND_VERIFICATION_EMAIL_MAX_PER_10_MINUTES',
      defaultMax: 4,
    }),
    accountVerifyEmail: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_VERIFY_EMAIL_MAX_PER_10_MINUTES,
      key: 'ACCOUNT_VERIFY_EMAIL_MAX_PER_10_MINUTES',
      defaultMax: 10,
    }),
    accountSendChangeEmail: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_SEND_CHANGE_EMAIL_MAX_PER_10_MINUTES,
      key: 'ACCOUNT_SEND_CHANGE_EMAIL_MAX_PER_10_MINUTES',
      defaultMax: 4,
    }),
    accountVerifyEmailChange: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_VERIFY_EMAIL_CHANGE_MAX_PER_10_MINUTES,
      key: 'ACCOUNT_VERIFY_EMAIL_CHANGE_MAX_PER_10_MINUTES',
      defaultMax: 10,
    }),
    accountSendResetPasswordEmail: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_SEND_RESET_PASSWORD_EMAIL_MAX_PER_10_MINUTES,
      key: 'ACCOUNT_SEND_RESET_PASSWORD_EMAIL_MAX_PER_10_MINUTES',
      defaultMax: 4,
    }),
    accountResetPassword: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_RESET_PASSWORD_MAX_PER_10_MINUTES,
      key: 'ACCOUNT_RESET_PASSWORD_MAX_PER_10_MINUTES',
      defaultMax: 4,
    }),
    accountSetPassword: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_SET_PASSWORD_MAX_PER_10_MINUTES,
      key: 'ACCOUNT_SET_PASSWORD_MAX_PER_10_MINUTES',
      defaultMax: 4,
    }),
    accountDownloadData: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_DOWNLOAD_DATA_MAX_PER_DAY,
      key: 'ACCOUNT_DOWNLOAD_DATA_MAX_PER_DAY',
      defaultMax: 3,
    }),
    accountOpmlExport: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_OPML_EXPORT_MAX_PER_HOUR,
      key: 'ACCOUNT_OPML_EXPORT_MAX_PER_HOUR',
      defaultMax: 10,
    }),
    accountOpmlImportEnqueue: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_OPML_IMPORT_ENQUEUE_MAX_PER_HOUR,
      key: 'ACCOUNT_OPML_IMPORT_ENQUEUE_MAX_PER_HOUR',
      defaultMax: 10,
    }),
    accountAddByRssParseEnqueue: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_ADD_BY_RSS_PARSE_ENQUEUE_MAX_PER_HOUR,
      key: 'ACCOUNT_ADD_BY_RSS_PARSE_ENQUEUE_MAX_PER_HOUR',
      defaultMax: 20,
    }),
    accountAddByRssChaptersTranscript: parseCountPerWindowEnvFromKey({
      envValue: process.env.ACCOUNT_ADD_BY_RSS_CHAPTERS_TRANSCRIPT_MAX_PER_MINUTE,
      key: 'ACCOUNT_ADD_BY_RSS_CHAPTERS_TRANSCRIPT_MAX_PER_MINUTE',
      defaultMax: 30,
    }),
    mqRssOnDemand: parseCountPerWindowEnvFromKey({
      envValue: process.env.MQ_RSS_ON_DEMAND_MAX_PER_HOUR,
      key: 'MQ_RSS_ON_DEMAND_MAX_PER_HOUR',
      defaultMax: 20,
    }),
  },
  nodeEnv: process.env.NODE_ENV!,
  serverEnv: process.env.SERVER_ENV!,
  userAgent: process.env.USER_AGENT!,
  brandName: process.env.BRAND_NAME!,
  brand: {
    bannerImage3x1Url: process.env.BRAND_BANNER_IMAGE_3X1_URL!,
    colorPrimary: process.env.BRAND_COLOR_PRIMARY!,
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
    const jwtExpiration = readOptionalPositiveExpirationEnv(
      'AUTH_JWT_EXPIRATION',
      DEFAULT_AUTH_JWT_EXPIRATION
    );
    return {
      jwtSecret: process.env.AUTH_JWT_SECRET!,
      jwtExpiration,
      sessionCookieMaxAgeMs: jwtExpiration * MS_PER_SECOND,
      allowTokenInResponseBody: process.env.AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY === 'true',
    };
  })(),
  api: {
    port: process.env.API_PORT!,
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
  emailChangeVerification: {
    tokenExpiration: readOptionalPositiveExpirationEnv(
      'EMAIL_CHANGE_VERIFICATION_TOKEN_EXPIRATION',
      DEFAULT_VERIFY_AND_EMAIL_CHANGE_TOKEN_EXPIRATION
    ),
  },
  legal: {
    name: process.env.LEGAL_NAME!,
    address: process.env.LEGAL_ADDRESS!,
  },
  terms: {
    version: process.env.TERMS_OF_SERVICE_VERSION ?? '',
  },
  mailer: {
    disabled:
      process.env.ACCOUNT_SIGNUP_MODE === 'admin_only_username' ||
      !process.env.MAILER_HOST ||
      !process.env.MAILER_PORT ||
      !process.env.MAILER_USERNAME ||
      !process.env.MAILER_PASSWORD ||
      !process.env.MAILER_FROM,
    host: process.env.MAILER_HOST!,
    port: process.env.MAILER_PORT!,
    username: process.env.MAILER_USERNAME!,
    password: process.env.MAILER_PASSWORD!,
    from: process.env.MAILER_FROM!,
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID!,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  },
  podcastIndex: {
    authKey: process.env.PODCAST_INDEX_AUTH_KEY!,
    baseUrl: process.env.PODCAST_INDEX_BASE_URL!,
    searchMax: process.env.PODCAST_INDEX_SEARCH_MAX
      ? parseInt(process.env.PODCAST_INDEX_SEARCH_MAX, 10)
      : 50,
    secretKey: process.env.PODCAST_INDEX_SECRET_KEY!,
  },
  activeMQArtemis: {
    protocol: process.env.MESSAGE_QUEUE_PROTOCOL!,
    host: process.env.MESSAGE_QUEUE_HOST!,
    username: process.env.MESSAGE_QUEUE_USERNAME!,
    password: process.env.MESSAGE_QUEUE_PASSWORD!,
    port: Number(process.env.MESSAGE_QUEUE_PORT!),
  },
  keyvaldb: {
    host: process.env.KEYVALDB_HOST!,
    port: Number(process.env.KEYVALDB_PORT!),
    password: process.env.KEYVALDB_PASSWORD!,
    cacheExpiration: readRequiredPositiveExpirationEnv('KEYVALDB_CACHE_EXPIRATION'),
  },
  resetPassword: {
    tokenExpiration: readOptionalPositiveExpirationEnv(
      'RESET_PASSWORD_TOKEN_EXPIRATION',
      DEFAULT_RESET_PASSWORD_TOKEN_EXPIRATION
    ),
  },
  social: {
    facebook: {
      pageUrl: process.env.SOCIAL_FACEBOOK_PAGE_URL!,
      imageUrl: process.env.SOCIAL_FACEBOOK_IMAGE_URL!,
    },
    github: {
      pageUrl: process.env.SOCIAL_GITHUB_PAGE_URL!,
      imageUrl: process.env.SOCIAL_GITHUB_IMAGE_URL!,
    },
    reddit: {
      pageUrl: process.env.SOCIAL_REDDIT_PAGE_URL!,
      imageUrl: process.env.SOCIAL_REDDIT_IMAGE_URL!,
    },
    twitter: {
      pageUrl: process.env.SOCIAL_TWITTER_PAGE_URL!,
      imageUrl: process.env.SOCIAL_TWITTER_IMAGE_URL!,
    },
  },
  verifyEmail: {
    tokenExpiration: readOptionalPositiveExpirationEnv(
      'VERIFY_EMAIL_TOKEN_EXPIRATION',
      DEFAULT_VERIFY_AND_EMAIL_CHANGE_TOKEN_EXPIRATION
    ),
  },
  web: {
    protocol: process.env.WEB_PROTOCOL!,
    domain: process.env.WEB_DOMAIN!,
  },
  premium: {
    costMonthly: Number(process.env.MEMBERSHIP_PREMIUM_COST_MONTHLY!),
    costAnnually: Number(process.env.MEMBERSHIP_PREMIUM_COST_ANNUALLY!),
    signupMode: process.env.ACCOUNT_SIGNUP_MODE! as AccountSignupMode,
    freeTrialExpiration: readOptionalPositiveExpirationEnv(
      'MEMBERSHIP_FREE_TRIAL_EXPIRATION',
      DEFAULT_FREE_TRIAL_EXPIRATION
    ),
  },
  e2e: {
    fixturesEnabled: process.env.PODVERSE_E2E_FIXTURES === '1',
  },
  opmlImport: {
    maxFeedsPerHour: (() => {
      const raw = process.env.OPML_IMPORT_MAX_FEEDS_PER_HOUR;
      if (raw === undefined || raw.trim() === '') {
        return 50;
      }
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) && parsed >= 1 ? parsed : 50;
    })(),
  },
};
