/**
 * E2E harness flag as a process.env read with no React Native imports, so Node unit tests can
 * load modules that record storage-read counts.
 */
export const isMobileE2eFromEnv = (): boolean => process.env.EXPO_PUBLIC_MOBILE_E2E === '1';
