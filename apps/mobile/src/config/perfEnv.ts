/**
 * Dev perf-recording flag as a process.env read with no React Native imports, so Node unit
 * tests can load modules that record timelines. Production builds leave this unset.
 */
export const isMobilePerfEnabledFromEnv = (): boolean =>
  process.env.EXPO_PUBLIC_MOBILE_PERF === '1';
