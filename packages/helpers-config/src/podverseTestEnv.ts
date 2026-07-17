/**
 * Canonical Podverse test environment for Vitest integration tests and Playwright E2E servers.
 * Ports 5732 (Postgres) and 6679 (Valkey) are Podverse test-only; dev uses 5432/6379.
 */

/** Minimum seconds for any `*_EXPIRATION` in default test env (1 day). */
export const PODVERSE_TEST_MIN_EXPIRATION = 86400;

const exp = String(PODVERSE_TEST_MIN_EXPIRATION);

export type PodverseApiTestEnvProfile = 'apiVitest' | 'apiWebE2e' | 'apiMobileE2e';

export type BuildPodverseApiTestEnvOptions = {
  profile: PodverseApiTestEnvProfile;
};

export type PodverseManagementApiTestEnvProfile = 'managementApiVitest' | 'managementApiE2e';

export type ManagementApiE2eBucketMode = 'off' | 'fakeAws';

export type BuildPodverseManagementApiTestEnvOptions = {
  profile: PodverseManagementApiTestEnvProfile;
  /** Only used when profile is managementApiE2e. */
  bucketMode?: ManagementApiE2eBucketMode;
};

const apiTestEnvBase = (): Record<string, string> => ({
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  LOG_DIR: '',
  BRAND_NAME: 'PodverseTest',
  USER_AGENT: 'Example Bot test/API/5',
  AUTH_JWT_SECRET: '11111111-1111-4111-8111-111111111111',
  AUTH_JWT_EXPIRATION: exp,
  AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY: 'false',
  API_PREFIX: '/api',
  API_VERSION: '/v2',
  API_RELEASE: 'test-release',
  COOKIE_DOMAIN: 'localhost',
  DB_HOST: '127.0.0.1',
  DB_PORT: '5732',
  DB_APP_NAME: 'podverse_app_test',
  DB_APP_READ_USER: 'podverse_app_read',
  DB_APP_READ_PASSWORD: 'test',
  DB_APP_READ_WRITE_USER: 'podverse_app_read_write',
  DB_APP_READ_WRITE_PASSWORD: 'test',
  WEB_PROTOCOL: 'http',
  WEB_DOMAIN: 'localhost',
  MESSAGE_QUEUE_PROTOCOL: 'tcp',
  MESSAGE_QUEUE_HOST: 'localhost',
  MESSAGE_QUEUE_USERNAME: 'test',
  MESSAGE_QUEUE_PASSWORD: 'test',
  MESSAGE_QUEUE_PORT: '61616',
  KEYVALDB_HOST: '127.0.0.1',
  KEYVALDB_PORT: '6679',
  KEYVALDB_CACHE_EXPIRATION: exp,
  MAILER_HOST: 'localhost',
  MAILER_PORT: '1025',
  MAILER_USERNAME: 'test',
  MAILER_PASSWORD: 'test',
  MAILER_FROM: 'test@localhost',
  BRAND_COLOR_PRIMARY: '#000000',
  BRAND_BANNER_IMAGE_3X1_URL: 'https://example.test/brand-banner-3x1.png',
  ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY: 'test-e2e-encryption-key',
  EMAIL_CHANGE_VERIFICATION_TOKEN_EXPIRATION: exp,
  LEGAL_NAME: 'Test Legal',
  LEGAL_ADDRESS: 'Test Address',
  TERMS_OF_SERVICE_VERSION: '2026-01-01',
  PAYPAL_CLIENT_ID: 'test',
  PAYPAL_CLIENT_SECRET: 'test',
  PODCAST_INDEX_AUTH_KEY: 'test',
  PODCAST_INDEX_BASE_URL: 'https://api.podcastindex.org/api/1.8.1',
  PODCAST_INDEX_SECRET_KEY: 'test',
  SOCIAL_FACEBOOK_PAGE_URL: '',
  SOCIAL_FACEBOOK_IMAGE_URL: '',
  SOCIAL_GITHUB_PAGE_URL: '',
  SOCIAL_GITHUB_IMAGE_URL: '',
  SOCIAL_REDDIT_PAGE_URL: '',
  SOCIAL_REDDIT_IMAGE_URL: '',
  SOCIAL_TWITTER_PAGE_URL: '',
  SOCIAL_TWITTER_IMAGE_URL: '',
  VERIFY_EMAIL_TOKEN_EXPIRATION: exp,
  RESET_PASSWORD_TOKEN_EXPIRATION: exp,
  MEMBERSHIP_PREMIUM_COST_MONTHLY: '3',
  MEMBERSHIP_PREMIUM_COST_ANNUALLY: '30',
  MEMBERSHIP_FREE_TRIAL_EXPIRATION: exp,
  METABOOST_SIGNING_KEY_PEM: '',
  METABOOST_APP_ASSERTION_ISS: '',
  PODCAST_FEED_URL: '',
  OTEL_SERVICE_NAME: 'podverse-api',
  OTEL_TRACES_EXPORT: 'none',
  DEFAULT_ACCOUNT_SETTINGS_LOCALE: 'en',
});

const apiProfileOverrides: Record<PodverseApiTestEnvProfile, Record<string, string>> = {
  apiVitest: {
    SERVER_ENV: 'local',
    API_PORT: '29999',
    API_ALLOWED_CORS_ORIGINS: 'http://localhost:3000',
    KEYVALDB_PASSWORD: 'test',
    ACCOUNT_SIGNUP_MODE: 'user_signup_email',
    API_PUBLIC_BASE_URL: 'http://localhost:29999',
  },
  apiWebE2e: {
    SERVER_ENV: 'local',
    API_PORT: '4030',
    API_ALLOWED_CORS_ORIGINS: 'http://localhost:4032',
    KEYVALDB_PASSWORD: 'test',
    ACCOUNT_SIGNUP_MODE: 'admin_only_email',
    API_PUBLIC_BASE_URL: 'http://localhost:4030',
    PODVERSE_STARTUP_VALIDATION_SILENT: '1',
  },
  apiMobileE2e: {
    SERVER_ENV: 'local',
    API_PORT: '4230',
    API_ALLOWED_CORS_ORIGINS: 'http://localhost:8081,http://localhost:19006,http://127.0.0.1:8081',
    KEYVALDB_PASSWORD: 'test',
    ACCOUNT_SIGNUP_MODE: 'admin_only_email',
    API_PUBLIC_BASE_URL: 'http://localhost:4230',
    PODVERSE_STARTUP_VALIDATION_SILENT: '1',
    // Deterministic Podcast Index search + add-by-RSS parse (no live PI / MQ).
    PODVERSE_E2E_FIXTURES: '1',
  },
};

export const buildPodverseApiTestEnv = (
  options: BuildPodverseApiTestEnvOptions
): Record<string, string> => ({
  ...apiTestEnvBase(),
  ...apiProfileOverrides[options.profile],
});

const managementApiTestEnvBase = (): Record<string, string> => ({
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  LOG_DIR: '',
  AUTH_JWT_SECRET: '11111111-1111-4111-8111-111111111111',
  AUTH_JWT_EXPIRATION: exp,
  AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY: 'false',
  API_PREFIX: '/api',
  API_VERSION: '/v2',
  API_RELEASE: 'test-release',
  COOKIE_DOMAIN: 'localhost',
  DB_HOST: '127.0.0.1',
  DB_PORT: '5732',
  DB_APP_NAME: 'podverse_app_test',
  DB_APP_READ_USER: 'podverse_app_read',
  DB_APP_READ_PASSWORD: 'test',
  DB_APP_READ_WRITE_USER: 'podverse_app_read_write',
  DB_APP_READ_WRITE_PASSWORD: 'test',
  DB_MANAGEMENT_NAME: 'podverse_management_test',
  DB_MANAGEMENT_READ_USER: 'podverse_management_read',
  DB_MANAGEMENT_READ_PASSWORD: 'test',
  DB_MANAGEMENT_READ_WRITE_USER: 'podverse_management_read_write',
  DB_MANAGEMENT_READ_WRITE_PASSWORD: 'test',
  APP_WEB_PROTOCOL: 'http',
  APP_WEB_DOMAIN: 'localhost',
  MANAGEMENT_WEB_PROTOCOL: 'http',
  MANAGEMENT_WEB_DOMAIN: 'localhost',
  PROMETHEUS_ENABLED: 'false',
  OTEL_SERVICE_NAME: 'podverse-management-api',
  OTEL_TRACES_EXPORT: 'none',
  OTEL_EXPORTER_OTLP_ENDPOINT: '',
});

const managementProfileOverrides: Record<
  PodverseManagementApiTestEnvProfile,
  Record<string, string>
> = {
  managementApiVitest: {
    BRAND_NAME: 'VitestBrand',
    USER_AGENT: 'Example Bot test/Management-API/5',
    API_PORT: '19999',
    API_ALLOWED_CORS_ORIGINS: 'http://localhost:3000',
  },
  managementApiE2e: {
    SERVER_ENV: 'local',
    BRAND_NAME: 'PodverseTest',
    USER_AGENT: 'Example Bot test/API/5',
    API_PORT: '4130',
    API_ALLOWED_CORS_ORIGINS: 'http://localhost:4132',
    PODVERSE_STARTUP_VALIDATION_SILENT: '1',
  },
};

const managementE2eBucketOff: Record<string, string> = {
  BUCKET_PROVIDER: '',
};

const managementE2eBucketFakeAws: Record<string, string> = {
  BUCKET_PROVIDER: 'aws-s3',
  BUCKET_ACCESS_KEY: 'test-e2e-access-key',
  BUCKET_SECRET_KEY: 'test-e2e-secret-key',
  BUCKET_REGION: 'us-east-1',
  BUCKET_NAME: 'test-e2e-bucket',
  BUCKET_CDN_BASE_URL: 'https://cdn.example.test',
};

export const buildPodverseManagementApiTestEnv = (
  options: BuildPodverseManagementApiTestEnvOptions
): Record<string, string> => {
  const base = {
    ...managementApiTestEnvBase(),
    ...managementProfileOverrides[options.profile],
  };
  if (options.profile !== 'managementApiE2e') {
    return base;
  }
  const bucketMode = options.bucketMode ?? 'off';
  return {
    ...base,
    ...(bucketMode === 'fakeAws' ? managementE2eBucketFakeAws : managementE2eBucketOff),
  };
};

export const applyPodverseTestEnv = (env: Record<string, string>): void => {
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }
};

const shellQuote = (value: string): string => {
  if (value === '') {
    return '""';
  }
  if (/[\s"'\\$`!]/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
};

/** Build a shell prefix `KEY=value ...` safe for Playwright webServer `sh -c` commands. */
export const toShellEnvPrefix = (env: Record<string, string>): string =>
  Object.entries(env)
    .map(([key, value]) => `${key}=${shellQuote(value)}`)
    .join(' ');

export const PODVERSE_SKIP_DOTENV_ENV: Record<string, string> = {
  PODVERSE_SKIP_DOTENV: 'true',
};

/** When set to `1`, startup env validation logs failures only (E2E / Vitest drift tests). */
export const PODVERSE_STARTUP_VALIDATION_SILENT_ENV = {
  PODVERSE_STARTUP_VALIDATION_SILENT: '1',
} as const satisfies Record<string, string>;

/** Observability env for Playwright-spawned Next.js web app (instrumentation hook). */
export const PODVERSE_WEB_E2E_OBSERVABILITY_ENV = {
  OTEL_SERVICE_NAME: 'podverse-web',
  OTEL_TRACES_EXPORT: 'none',
} as const satisfies Record<string, string>;

/** Observability env for Playwright-spawned Next.js management-web app (instrumentation hook). */
export const PODVERSE_MANAGEMENT_WEB_E2E_OBSERVABILITY_ENV = {
  OTEL_SERVICE_NAME: 'podverse-management-web',
  OTEL_TRACES_EXPORT: 'none',
} as const satisfies Record<string, string>;
