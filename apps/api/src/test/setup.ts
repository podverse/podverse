/**
 * Vitest setup: set test env before any module that reads process.env is loaded.
 * Uses dedicated test databases (podverse_app_test, podverse_management_test) on port 5732.
 * Valkey test instance on port 6679.
 * All values are hardcoded so test runs are deterministic and not affected by ambient env.
 * Ports 5732/6679 are Podverse test-only; dev uses 5432/6379; Metaboost test uses 5632/6579.
 *
 * All `*_EXPIRATION` values are at least one day (86400s) unless a test file overrides
 * `process.env` to assert expired-token or short-TTL behavior.
 */

/** Minimum seconds for any `*_EXPIRATION` in this default test env (1 day). */
const MIN_TEST_EXPIRATION = 86400;

const testEnv: Record<string, string> = {
  NODE_ENV: 'test',
  SERVER_ENV: 'development',
  LOG_LEVEL: 'error',
  LOG_DIR: '',
  BRAND_NAME: 'PodverseTest',
  USER_AGENT: 'Example Bot test/API/5',
  // Auth
  AUTH_JWT_SECRET: '11111111-1111-4111-8111-111111111111',
  AUTH_JWT_EXPIRATION: String(MIN_TEST_EXPIRATION),
  AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY: 'false',
  // API
  API_PORT: '29999',
  API_PREFIX: '/api',
  API_VERSION: '/v2',
  API_RELEASE: 'test-release',
  COOKIE_DOMAIN: 'localhost',
  API_ALLOWED_CORS_ORIGINS: 'http://localhost:3000',
  // Database (test stack: port 5732)
  DB_HOST: '127.0.0.1',
  DB_PORT: '5732',
  DB_APP_NAME: 'podverse_app_test',
  DB_APP_READ_USER: 'podverse_app_read',
  DB_APP_READ_PASSWORD: 'test',
  DB_APP_READ_WRITE_USER: 'podverse_app_read_write',
  DB_APP_READ_WRITE_PASSWORD: 'test',
  // Web
  WEB_PROTOCOL: 'http',
  WEB_DOMAIN: 'localhost',
  // Message Queue (stubs — not needed for unit-level API tests)
  MESSAGE_QUEUE_PROTOCOL: 'tcp',
  MESSAGE_QUEUE_HOST: 'localhost',
  MESSAGE_QUEUE_USERNAME: 'test',
  MESSAGE_QUEUE_PASSWORD: 'test',
  MESSAGE_QUEUE_PORT: '61616',
  // Key-Value DB (test stack: port 6679)
  KEYVALDB_HOST: '127.0.0.1',
  KEYVALDB_PORT: '6679',
  KEYVALDB_PASSWORD: '',
  KEYVALDB_CACHE_EXPIRATION: String(MIN_TEST_EXPIRATION),
  // Mailer (disabled for tests via missing MAILER_FROM)
  MAILER_HOST: 'localhost',
  MAILER_PORT: '1025',
  MAILER_USERNAME: 'test',
  MAILER_PASSWORD: 'test',
  MAILER_FROM: 'test@localhost',
  // Email
  BRAND_COLOR_PRIMARY: '#000000',
  BRAND_BANNER_IMAGE_3X1_URL: '',
  EMAIL_CHANGE_VERIFICATION_TOKEN_EXPIRATION: String(MIN_TEST_EXPIRATION),
  // Legal
  LEGAL_NAME: 'Test Legal',
  LEGAL_ADDRESS: 'Test Address',
  // PayPal (stubs)
  PAYPAL_CLIENT_ID: 'test',
  PAYPAL_CLIENT_SECRET: 'test',
  // Podcast Index (stubs)
  PODCAST_INDEX_AUTH_KEY: 'test',
  PODCAST_INDEX_BASE_URL: 'https://api.podcastindex.org/api/1.8.1',
  PODCAST_INDEX_SECRET_KEY: 'test',
  // Social (stubs)
  SOCIAL_FACEBOOK_PAGE_URL: '',
  SOCIAL_FACEBOOK_IMAGE_URL: '',
  SOCIAL_GITHUB_PAGE_URL: '',
  SOCIAL_GITHUB_IMAGE_URL: '',
  SOCIAL_REDDIT_PAGE_URL: '',
  SOCIAL_REDDIT_IMAGE_URL: '',
  SOCIAL_TWITTER_PAGE_URL: '',
  SOCIAL_TWITTER_IMAGE_URL: '',
  // Verify email
  VERIFY_EMAIL_TOKEN_EXPIRATION: String(MIN_TEST_EXPIRATION),
  // Reset password
  RESET_PASSWORD_TOKEN_EXPIRATION: String(MIN_TEST_EXPIRATION),
  // Premium / signup
  MEMBERSHIP_PREMIUM_COST_MONTHLY: '3',
  MEMBERSHIP_PREMIUM_COST_ANNUALLY: '30',
  ACCOUNT_SIGNUP_MODE: 'user_signup_email',
  MEMBERSHIP_FREE_TRIAL_EXPIRATION: String(MIN_TEST_EXPIRATION),
  // V4V / Metaboost signing (stubs)
  METABOOST_SIGNING_KEY_PEM: '',
  METABOOST_APP_ASSERTION_ISS: '',
  // Podcast feed
  PODCAST_FEED_URL: '',
  // Public base URL
  API_PUBLIC_BASE_URL: 'http://localhost:29999',
  OTEL_SERVICE_NAME: 'podverse-api',
  OTEL_TRACES_EXPORT: 'none',
};

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] = value;
}
