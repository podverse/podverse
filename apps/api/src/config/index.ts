/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup in lib/startup/validation.ts */

import type { AccountSignupMode } from '@podverse/helpers';
import {
  DEFAULT_AUTH_JWT_EXPIRATION,
  DEFAULT_FREE_TRIAL_EXPIRATION,
  DEFAULT_RESET_PASSWORD_TOKEN_EXPIRATION,
  DEFAULT_VERIFY_AND_EMAIL_CHANGE_TOKEN_EXPIRATION,
  MS_PER_SECOND,
  readOptionalPositiveExpirationEnv,
  readRequiredPositiveExpirationEnv,
} from '@podverse/helpers';

type SocialConfig = {
  pageUrl: string;
  imageUrl: string;
};

type Config = {
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
  extensions: {
    prometheus: {
      enabled: boolean;
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
};

export const config: Config = {
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
  extensions: {
    prometheus: {
      enabled: process.env.EXT_PROMETHEUS_ENABLED === 'true',
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
};
