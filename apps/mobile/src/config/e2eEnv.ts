/**
 * E2E harness flag as a process.env read with no React Native imports, so Node unit tests can
 * load modules that record storage-read counts.
 */
export const isMobileE2eFromEnv = (): boolean => process.env.EXPO_PUBLIC_MOBILE_E2E === '1';

/**
 * Dev / E2E only: lets add-by-RSS feed credentials travel over plain http, which the local
 * test-assets server (`:2111`) needs. Always on under the E2E harness; production builds leave
 * `EXPO_PUBLIC_MOBILE_ADD_BY_RSS_ALLOW_INSECURE_CREDENTIALS` unset so credentials stay HTTPS-only.
 */
export const isAddByRssInsecureCredentialsAllowedFromEnv = (): boolean =>
  isMobileE2eFromEnv() ||
  process.env.EXPO_PUBLIC_MOBILE_ADD_BY_RSS_ALLOW_INSECURE_CREDENTIALS === '1';
