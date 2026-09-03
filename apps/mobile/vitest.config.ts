import { defineConfig } from 'vitest/config';

/**
 * Node-only unit tests for the mobile app's **pure** modules (no React Native / Expo). Covers the
 * `podverse-media-engine` bridge command serialization and error taxonomy,
 * the download eligibility / storage helpers (`src/downloads`, pure logic only), the unified
 * subscriptions merge/map/filter/sort helpers (`src/data/repositories/subscriptionsMerge.ts` — the
 * pure sibling of the SQLite-backed `subscriptionsRepository`, so it pulls in no `expo-sqlite`), the
 * sign-up subscription merge decision (`src/data/repositories/subscriptionsSignupPlan.ts` — pure; the
 * SQLite/API half stays in `subscriptionsSignupMerge.ts`), the
 * car library-browse mappers/merge (`src/data/repositories/libraryBrowseProjection.ts` — types only,
 * no native imports), the offline channel-item window rules — depth ceiling, staleness, page walk,
 * and the reconciliation that keeps repeated syncs idempotent and storage bounded
 * (`src/data/repositories/channelItemWindow.ts` — pure; the SQLite/API half stays in
 * `channelItemsRepository.ts`), the per-subscription seen-state reconciliation and add-by-RSS
 * publish-date reading (`src/data/repositories/channelSeenSync.ts` — pure; the SQLite/API half stays
 * in `channelSeenRepository.ts`), the live-badge rules — the trust window that stops a stale row
 * claiming a show is still on the air, and reading the strongest status out of a live-item response
 * or a stored add-by-RSS bundle (`src/data/repositories/channelLiveStatus.ts` — pure; the SQLite/API
 * half stays in `channelLiveStatusRepository.ts`), the Home row metadata join that indexes the four
 * local stores against the subscription list (`src/screens/home/homeRowMetadata.ts` — pure; the
 * repository reads stay in `homeFeedData.ts`), the env-driven deep-link scheme / prefix helpers
 * (`src/config/deepLinkSchemes.ts`), deep-link path mapping (`src/navigation/deepLinking.ts`), pure notification
 * payload target extraction (`src/push/notificationTarget.ts`), share URL mapping (`src/lib/share/shareUrl.ts`),
 * prefs storage guards/hydration (`src/prefs/prefsStore.ts`), Home's remembered filter, sort, and
 * view-mode selections (`src/prefs/homeListPrefs.ts` — AsyncStorage-backed and mockable in node,
 * covering per-media-type scoping, the list-not-grid default, one control's write leaving the
 * others alone, the carry-over of the pre-existing chip value, and the change notification Home
 * listens to), the row and artwork-tile column counts
 * (`src/theme/resolveColumns.ts`), the Podcast Index search preview poll helper
 * (`src/screens/search/podcastIndexFeedPreview.ts`), the client-version/platform header builder
 * (`src/auth/mobileClientHeaders.ts` — pure; the RN-coupled resolution stays in `mobileApi.ts`), the
 * forced-logout notice marker (`src/auth/forcedLogoutNotice.ts` — AsyncStorage-backed, and
 * AsyncStorage mocks cleanly in node; the RN modal that renders it stays untested here), the
 * membership denial mapping (`src/membership/membershipDenial.ts` — pure; note the membership-state
 * derivation now lives in `@podverse/helpers` `deriveMembershipState`, tested there, and the RN-coupled
 * `useMembership` hook is excluded), the membership checkout URL builder
 * (`src/membership/checkoutUrl.ts` — pure; the RN `Linking` opener stays in `checkoutEntry.ts`), and
 * the serial background sync queue with its trigger planning (`src/sync/syncQueue.ts`,
 * `src/sync/syncJobPlan.ts` — kept free of RN/Expo imports so serialization, dedupe, growing totals,
 * and failure isolation are testable; the job bodies that reach repositories (`src/sync/syncJobs.ts`)
 * and the RN triggers (`src/sync/SyncProvider.tsx`) are excluded), the sync failure taxonomy that
 * produces the quotable error code (`src/sync/syncErrorClassification.ts`), and the sync event log's
 * cap / eviction rule and export format (`src/data/repositories/syncEventLog.ts` — pure; the
 * SQLite half stays in `syncEventLogRepository.ts`). Scope
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
      'src/auth/forcedLogoutNotice.test.ts',
      'src/auth/localDevLoginPrefill.test.ts',
      'src/auth/mobileClientHeaders.test.ts',
      'src/config/deepLinkSchemes.test.ts',
      'src/data/repositories/channelItemWindow.test.ts',
      'src/data/repositories/channelLiveStatus.test.ts',
      'src/data/repositories/channelSeenSync.test.ts',
      'src/data/repositories/libraryBrowseProjection.test.ts',
      'src/data/repositories/subscriptionsMerge.test.ts',
      'src/data/repositories/subscriptionsSignupPlan.test.ts',
      'src/data/repositories/syncEventLog.test.ts',
      'src/downloads/**/*.test.ts',
      'src/lib/home/homeFeedRefresh.test.ts',
      'src/lib/share/shareUrl.test.ts',
      'src/membership/checkoutUrl.test.ts',
      'src/membership/membershipDenial.test.ts',
      'src/navigation/deepLinking.test.ts',
      'src/prefs/homeListPrefs.test.ts',
      'src/prefs/prefsStore.test.ts',
      'src/push/notificationTarget.test.ts',
      'src/screens/home/homeRowMetadata.test.ts',
      'src/screens/search/podcastIndexFeedPreview.test.ts',
      'src/sync/syncErrorClassification.test.ts',
      'src/sync/syncQueue.test.ts',
      'src/theme/resolveColumns.test.ts',
    ],
  },
});
