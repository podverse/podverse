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
 * AsyncStorage mocks cleanly in node; the RN modal that renders it stays untested here), the rule
 * that tells an E2E session left behind by a finished flow apart from one a relaunch should keep
 * (`src/auth/e2eSessionReset.ts`), the best-effort replay of buffered listen stats, which must
 * resolve even when the account is not entitled to them (`src/data/repositories/statsRepository.ts` —
 * its only dependency is the auth request helper, which mocks), the
 * membership denial mapping (`src/membership/membershipDenial.ts` — pure; note the membership-state
 * derivation now lives in `@podverse/helpers` `deriveMembershipState`, tested there, and the RN-coupled
 * `useMembership` hook is excluded), the membership checkout URL builder
 * (`src/membership/checkoutUrl.ts` — pure; the RN `Linking` opener stays in `checkoutEntry.ts`), and
 * the serial background sync queue with its trigger planning (`src/sync/syncQueue.ts`,
 * `src/sync/syncJobPlan.ts` — kept free of RN/Expo imports so serialization, dedupe, growing totals,
 * and failure isolation are testable; the job bodies that reach repositories (`src/sync/syncJobs.ts`)
 * and the RN triggers (`src/sync/SyncProvider.tsx`) are excluded), the derived connectivity rules
 * that decide whether the network is usable — entry debounce, success-only exit, probe backoff,
 * dwell floor, and device-versus-server attribution (`src/net/connectivityMachine.ts` — pure and
 * clock-injected, so no timer ever has to elapse in a test; the NetInfo subscription, timers, and
 * health probe stay in `src/net/connectivity.ts` and `src/net/connectivityProbe.ts`), the sync
 * failure taxonomy that
 * produces the quotable error code (`src/sync/syncErrorClassification.ts`), and the sync event log's
 * cap / eviction rule and export format (`src/data/repositories/syncEventLog.ts` — pure; the
 * SQLite half stays in `syncEventLogRepository.ts`). Playback reconciliation is here on the same
 * split: the bounded offline outbox ordering and drain batching
 * (`src/data/repositories/playbackOutbox.ts`), the later-wins merge that decides adopt / ignore /
 * report-a-conflict (`src/data/repositories/playbackReconcile.ts`), the meaningful-event gate that
 * feeds it (`src/playback/playbackEventSource.ts`), and the handoff prompt and dismissal memory
 * (`src/playback/playbackHandoff.ts`) are all pure, while their SQLite halves stay in
 * `playbackOutboxRepository.ts` and the RN provider stays in `PlaybackProvider.tsx`. The player
 * chrome's rules sit on the same split: the overlay store's closing phase and transition durations
 * (`src/components/overlay/overlayStore.ts`, `src/components/overlay/overlayTransitions.ts`), the
 * process-wide Reduce Motion store (`src/hooks/useReduceMotion.ts` — AccessibilityInfo is mocked
 * so the singleton listener is testable in node), the
 * transport glyph mapping that keeps the spinner to a
 * source that cannot start yet (`src/playback/playbackTransport.ts`), which clip or chapter the
 * now-playing bar names (`src/playback/nowPlayingSegment.ts`), the marquee overflow and travel math
 * (`src/lib/text/marqueeScroll.ts`), reading a 404 as an empty list (`src/lib/apiErrorStatus.ts`),
 * and whether a server refresh should replace what a cache-first screen already painted
 * (`src/lib/cachedValue.ts`), the E2E-gated perf mark/counter buffer
 * (`src/lib/perf/perfSpans.ts` — env is mocked so both flag states are reachable in node), the
 * universal last-playback snapshot that restores the mini
 * player on cold start for every auth status (`src/lib/playback/lastPlaybackStorage.ts`), and the
 * decision to swap a live remote stream onto a just-finished download of that same enclosure
 * (`src/lib/playback/planDownloadCompletePlaybackHandoff.ts`). The
 * migration ladder (`src/data/db/migrations.ts`) is covered because the statement list is data, not a
 * connection. Scope
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
      'src/auth/e2eSessionReset.test.ts',
      'src/auth/forcedLogoutNotice.test.ts',
      'src/auth/localDevLoginPrefill.test.ts',
      'src/auth/mobileClientHeaders.test.ts',
      'src/components/overlay/overlayStore.test.ts',
      'src/components/overlay/overlayTransitions.test.ts',
      'src/components/player/MediaRowActions.test.ts',
      'src/components/primitives/FillList.test.ts',
      'src/components/player/fullPlayerRows.test.ts',
      'src/config/deepLinkSchemes.test.ts',
      'src/data/db/migrations.test.ts',
      'src/data/repositories/channelItemWindow.test.ts',
      'src/data/repositories/channelLiveStatus.test.ts',
      'src/data/repositories/channelSeenSync.test.ts',
      'src/data/repositories/libraryBrowseProjection.test.ts',
      'src/data/repositories/playbackOutbox.test.ts',
      'src/data/repositories/playbackReconcile.test.ts',
      'src/data/repositories/subscriptionsMerge.test.ts',
      'src/data/repositories/statsRepository.test.ts',
      'src/data/repositories/subscriptionsSignupPlan.test.ts',
      'src/data/repositories/syncEventLog.test.ts',
      'src/downloads/**/*.test.ts',
      'src/hooks/useReduceMotion.test.ts',
      'src/lib/addByRss/domain.test.ts',
      'src/lib/apiErrorStatus.test.ts',
      'src/lib/cachedValue.test.ts',
      'src/lib/home/homeFeedRefresh.test.ts',
      'src/lib/perf/perfSpans.test.ts',
      'src/lib/playback/lastPlaybackStorage.test.ts',
      'src/lib/playback/planDownloadCompletePlaybackHandoff.test.ts',
      'src/lib/rows/homeRowMappers.test.ts',
      'src/lib/share/shareSheetPassthrough.test.ts',
      'src/lib/share/shareUrl.test.ts',
      'src/lib/text/marqueeScroll.test.ts',
      'src/membership/checkoutUrl.test.ts',
      'src/membership/membershipDenial.test.ts',
      'src/navigation/deepLinking.test.ts',
      'src/net/connectivityMachine.test.ts',
      'src/playback/nowPlayingSegment.test.ts',
      'src/playback/playbackEventSource.test.ts',
      'src/playback/playbackHandoff.test.ts',
      'src/playback/previousAction.test.ts',
      'src/playback/playbackTransport.test.ts',
      'src/prefs/homeListPrefs.test.ts',
      'src/prefs/prefsStore.test.ts',
      'src/push/notificationTarget.test.ts',
      'src/screens/home/HomeFeedRow.test.ts',
      'src/screens/home/homeRowMetadata.test.ts',
      'src/screens/home/addByRssHomeDetailData.test.ts',
      'src/screens/episode/episodeSectionPaneLoaders.test.ts',
      'src/screens/episode/episodeTabs.test.ts',
      'src/screens/player/fullPlayerLayout.test.ts',
      'src/screens/search/podcastIndexFeedPreview.test.ts',
      'src/sync/syncErrorClassification.test.ts',
      'src/sync/syncQueue.test.ts',
      'src/theme/resolveColumns.test.ts',
      'src/theme/useThemedStyles.test.ts',
    ],
  },
});
