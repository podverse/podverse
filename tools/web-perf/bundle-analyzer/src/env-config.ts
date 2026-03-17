/**
 * Hard-coded environment variables for bundle analysis builds.
 * These values are suitable for local development/testing purposes only.
 */

export const WEB_APP_ENV = {
  // API Configuration (Client)
  NEXT_PUBLIC_API_PROTOCOL: 'http',
  NEXT_PUBLIC_API_HOST: 'localhost',
  NEXT_PUBLIC_API_PORT: '3000',
  NEXT_PUBLIC_API_PREFIX: '/api',
  NEXT_PUBLIC_API_VERSION: '/v2',

  // API Configuration (SSR)
  NEXT_PUBLIC_SSR_API_PROTOCOL: 'http',
  NEXT_PUBLIC_SSR_API_HOST: 'localhost',
  NEXT_PUBLIC_SSR_API_PORT: '3000',

  // Web Configuration
  NEXT_PUBLIC_WEB_PROTOCOL: 'http',
  NEXT_PUBLIC_WEB_DOMAIN: 'localhost:3002',
  NEXT_PUBLIC_BRAND_NAME: 'Podverse',
  NEXT_PUBLIC_POLLING_INTERVAL_MS: '3000',

  // App Lightning Node (optional)
  NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_NAME: '',
  NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_ADDRESS: '',
  NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_KEY: '',
  NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_VALUE: '',

  // App Lightning LNAddress (optional)
  NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_NAME: '',
  NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_ADDRESS: '',

  // Features
  NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'all-available',
  NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'en-US',

  // Theme
  NEXT_PUBLIC_SUPPORTED_THEMES: 'all-available',
  NEXT_PUBLIC_DEFAULT_THEME: 'dark',

  // Account
  NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE: 'sign-up',

  // Contact & Social
  NEXT_PUBLIC_CONTACT_EMAIL: 'contact@podverse.fm',
  NEXT_PUBLIC_SOCIAL_ACTIVITY_PUB: 'https://podcastindex.social/web/@podverse',
  NEXT_PUBLIC_SOCIAL_DISCORD: 'https://discord.gg/6HkyNKR',
  NEXT_PUBLIC_SOCIAL_GITHUB: 'https://github.com/podverse',
  NEXT_PUBLIC_SOCIAL_MATRIX: 'https://matrix.to/#/#podverse-space:matrix.org',
  NEXT_PUBLIC_SOCIAL_X: 'https://x.com/podverse',

  // Server Environment
  NEXT_PUBLIC_SERVER_ENV: 'local',

  // Proxy
  NEXT_PUBLIC_PROXY_USER_AGENT: 'Podverse Bot Local/Bundle-Analyzer/1',

  // Web Push (optional, can be empty)
  NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY: '',
};

export const MANAGEMENT_WEB_APP_ENV = {
  // API Configuration
  NEXT_PUBLIC_API_PROTOCOL: 'http',
  NEXT_PUBLIC_API_HOST: 'localhost',
  NEXT_PUBLIC_API_PORT: '1999',
  NEXT_PUBLIC_API_PREFIX: '/api',
  NEXT_PUBLIC_API_VERSION: '/v2',

  // Web Configuration
  NEXT_PUBLIC_BRAND_NAME: 'Podverse Management',

  // Features
  NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'all-available',
  NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'en-US',
};

export function getAppEnvironment(appName: string): Record<string, string> {
  switch (appName) {
    case 'web':
      return WEB_APP_ENV;
    case 'management-web':
      return MANAGEMENT_WEB_APP_ENV;
    default:
      throw new Error(`Unknown app: ${appName}`);
  }
}
