/**
 * Build env prefix string for the API server in E2E web mode.
 * Values mirror apps/api/src/test/setup.ts — the canonical test env.
 * Podverse test stack: DB port 5732, Valkey port 6679.
 * Web E2E ports: API 4030, sidecar 4031, web 4032.
 */

export function buildE2eWebApiEnvPrefix(): string {
  return [
    `NODE_ENV=test`,
    `SERVER_ENV=local`,
    `BRAND_NAME=PodverseTest`,
    // Quoted: value contains spaces; unquoted breaks sh -c "… Bot …" (command not found: Bot)
    `USER_AGENT="Example Bot test/API/5"`,
    `LOG_LEVEL=error`,
    `LOG_DIR=`,
    // Auth
    `AUTH_JWT_SECRET=11111111-1111-4111-8111-111111111111`,
    `AUTH_JWT_EXPIRATION=31536000`,
    `AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY=false`,
    // API
    `API_PORT=4030`,
    `API_PREFIX=/api`,
    `API_VERSION=/v2`,
    `API_RELEASE=test-release`,
    `COOKIE_DOMAIN=localhost`,
    `API_ALLOWED_CORS_ORIGINS=http://localhost:4032`,
    // Database (test stack: port 5732)
    `DB_HOST=127.0.0.1`,
    `DB_PORT=5732`,
    `DB_APP_NAME=podverse_app_test`,
    `DB_APP_READ_USER=podverse_app_read`,
    `DB_APP_READ_PASSWORD=test`,
    `DB_APP_READ_WRITE_USER=podverse_app_read_write`,
    `DB_APP_READ_WRITE_PASSWORD=test`,
    // Web
    `WEB_PROTOCOL=http`,
    `WEB_DOMAIN=localhost`,
    // Message Queue (stubs)
    `MESSAGE_QUEUE_PROTOCOL=tcp`,
    `MESSAGE_QUEUE_HOST=localhost`,
    `MESSAGE_QUEUE_USERNAME=test`,
    `MESSAGE_QUEUE_PASSWORD=test`,
    `MESSAGE_QUEUE_PORT=61616`,
    // Key-Value DB (test stack: port 6679)
    `KEYVALDB_HOST=127.0.0.1`,
    `KEYVALDB_PORT=6679`,
    `KEYVALDB_PASSWORD=test`,
    `KEYVALDB_CACHE_EXPIRATION=86400`,
    // Mailer (disabled for tests via ACCOUNT_SIGNUP_MODE=admin_only_username)
    `MAILER_HOST=localhost`,
    `MAILER_PORT=1025`,
    `MAILER_USERNAME=test`,
    `MAILER_PASSWORD=test`,
    `MAILER_FROM=test@localhost`,
    // Podcast Index (stubs)
    `PODCAST_INDEX_AUTH_KEY=test`,
    `PODCAST_INDEX_BASE_URL=https://api.podcastindex.org/api/1.8.1`,
    `PODCAST_INDEX_SECRET_KEY=test`,
    // Add-by-RSS
    `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY=test-e2e-encryption-key`,
    // Premium / signup
    `ACCOUNT_SIGNUP_MODE=admin_only_username`,
    // Defaults
    `DEFAULT_ACCOUNT_SETTINGS_LOCALE=en`,
  ].join(' ');
}

/**
 * NEXT_PUBLIC_* env vars shared by sidecar and web app build.
 * Sidecar serves these via /runtime-config; next build inlines them.
 * Values from apps/web/sidecar/.env.example adapted for E2E ports.
 */
const WEB_E2E_NEXT_PUBLIC_ENV = [
  // API Configuration (SSR)
  `NEXT_PUBLIC_SSR_API_PROTOCOL=http`,
  `NEXT_PUBLIC_SSR_API_HOST=localhost`,
  `NEXT_PUBLIC_SSR_API_PORT=4030`,
  // API Configuration (Client)
  `NEXT_PUBLIC_API_PROTOCOL=http`,
  `NEXT_PUBLIC_API_HOST=localhost`,
  `NEXT_PUBLIC_API_PORT=4030`,
  `NEXT_PUBLIC_API_PREFIX=/api`,
  `NEXT_PUBLIC_API_VERSION=/v2`,
  // Web Configuration
  `NEXT_PUBLIC_WEB_PROTOCOL=http`,
  `NEXT_PUBLIC_WEB_DOMAIN=localhost:4032`,
  `NEXT_PUBLIC_BRAND_NAME=PodverseE2E`,
  `NEXT_PUBLIC_CONTACT_EMAIL=contact-e2e@example.com`,
  // Website Features
  `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES=all-available`,
  `NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE=en-US`,
  // Theme Configuration
  `NEXT_PUBLIC_SUPPORTED_THEMES=all-available`,
  `NEXT_PUBLIC_DEFAULT_THEME=dark`,
  // Account / Membership
  `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE=admin_only_username`,
  // Server Environment
  `NEXT_PUBLIC_SERVER_ENV=local`,
  // Proxy Configuration
  `NEXT_PUBLIC_IMAGE_PROXY_ENABLED=false`,
  `NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED=false`,
  `NEXT_PUBLIC_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS="86400"`,
].join(' ');

/**
 * Env prefix for the web sidecar in E2E mode.
 * Sidecar needs NEXT_PUBLIC_* vars to serve them via /runtime-config.
 */
export function buildE2eWebSidecarEnvPrefix(): string {
  return [`PORT=4031`, `API_URL=http://localhost:4030`, WEB_E2E_NEXT_PUBLIC_ENV].join(' ');
}

/**
 * Env prefix for the web app build and start in E2E mode.
 * next build inlines NEXT_PUBLIC_* vars at compile time.
 */
export function buildE2eWebAppEnvPrefix(): string {
  return [
    `PORT=4032`,
    `RUNTIME_CONFIG_URL=http://localhost:4031`,
    `NODE_OPTIONS=--disable-warning=DEP0060`,
    WEB_E2E_NEXT_PUBLIC_ENV,
  ].join(' ');
}
