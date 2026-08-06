import { defineConfig } from 'vitest/config';

/**
 * Node-only unit tests for the mobile app's **pure** modules (no React Native / Expo). Covers the
 * `podverse-media-engine` bridge command serialization and error taxonomy (steps 2.27, 2.28),
 * the Track 13 download eligibility / storage helpers (`src/downloads`, pure logic only), the unified
 * subscriptions merge/map/filter/sort helpers (`src/data/repositories/subscriptionsMerge.ts` — the
 * pure sibling of the SQLite-backed `subscriptionsRepository`, so it pulls in no `expo-sqlite`), the
 * car library-browse mappers/merge (`src/data/repositories/libraryBrowseProjection.ts` — types only,
 * no native imports), the env-driven deep-link scheme / prefix helpers
 * (`src/config/deepLinkSchemes.ts`), deep-link path mapping (`src/navigation/deepLinking.ts`), pure notification
 * payload target extraction (`src/push/notificationTarget.ts`), and the Podcast Index search preview
 * poll helper (`src/screens/search/podcastIndexFeedPreview.ts`). Scope
 * the `include` narrowly so tests never pull in native/Expo modules — the excluded adapter
 * (`src/bridge/nativePlaybackBridge.ts`) imports `expo-modules-core`, and repositories import
 * `expo-sqlite`, so neither is tested here. `apps/mobile` is a standalone install; run with
 * `npm --prefix apps/mobile run test`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'modules/podverse-media-engine/src/**/*.test.ts',
      'src/auth/localDevLoginPrefill.test.ts',
      'src/config/deepLinkSchemes.test.ts',
      'src/data/repositories/libraryBrowseProjection.test.ts',
      'src/data/repositories/subscriptionsMerge.test.ts',
      'src/downloads/**/*.test.ts',
      'src/lib/home/homeFeedRefresh.test.ts',
      'src/navigation/deepLinking.test.ts',
      'src/push/notificationTarget.test.ts',
      'src/screens/search/podcastIndexFeedPreview.test.ts',
      'src/theme/resolveColumns.test.ts',
    ],
  },
});
