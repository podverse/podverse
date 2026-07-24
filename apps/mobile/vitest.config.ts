import { defineConfig } from 'vitest/config';

/**
 * Node-only unit tests for the mobile app's **pure** modules (no React Native / Expo). Today this
 * covers the `podverse-media-engine` bridge command serialization and error taxonomy (steps 2.27,
 * 2.28). Scope the `include` narrowly so tests never pull in native/Expo modules — the excluded
 * adapter (`src/bridge/nativePlaybackBridge.ts`) imports `expo-modules-core` and must not be tested
 * here. `apps/mobile` is a standalone install; run with `npm --prefix apps/mobile run test`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['modules/podverse-media-engine/src/**/*.test.ts'],
  },
});
