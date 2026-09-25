/**
 * Dev perf flag that skips remote artwork loads so an images-on versus images-off capture can
 * isolate decode cost. Production builds leave this unset.
 */
export const isMobilePerfNoImagesFromEnv = (): boolean =>
  process.env.EXPO_PUBLIC_MOBILE_PERF_NO_IMAGES === '1';
