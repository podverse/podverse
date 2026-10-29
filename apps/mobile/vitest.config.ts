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
 * (`src/config/deepLinkSchemes.js`), the custom API address and health verdict
 * (`src/config/customApiUrl.ts`), deep-link path mapping (`src/navigation/deepLinking.ts`), pure notification
 * payload target extraction (`src/push/notificationTarget.ts`), the path an inbox row and a banner
 * open (`src/push/accountNotificationLink.ts`), which notifications may show a
 * banner and the device-local kind switches (`src/notifications/bannerNotificationPolicy.ts`,
 * `src/prefs/bannerNotificationPrefs.ts`), the account event stream's SSE parser, run condition
 * and failure rules, in-memory notification store, and connection controller
 * (`src/notifications/sseEventParser.ts`, `notificationStreamPolicy.ts`,
 * `notificationStreamStore.ts`, `notificationStreamController.ts` — I/O is injected; the
 * `expo/fetch` client and the RN runtime stay out of this suite), marking one notification read
 * by id or by the push's item and type (`src/notifications/notificationReadActions.ts` — the
 * repository is mocked), the session inbox page used in Offline Mode and the prepend that puts a
 * live row first (`src/notifications/notificationsInboxCache.ts`), the Intl polyfills Hermes needs
 * for plural rules and relative time (`src/shims/intlPolyfills.ts` — Hermes is simulated by
 * removing the native constructors), the ICU plural expansion that lets i18next render the
 * catalog's next-intl plural strings (`src/i18n/icuPlurals.ts`), share URL mapping
 * (`src/lib/share/shareUrl.ts`),
 * prefs storage guards/hydration (`src/prefs/prefsStore.ts`), Home's remembered filter, sort, and
 * view-mode selections (`src/prefs/homeListPrefs.ts` — AsyncStorage-backed and mockable in node,
 * covering per-media-type scoping, the list-not-grid default, one control's write leaving the
 * others alone, the carry-over of the pre-existing chip value, and the change notification Home
 * listens to), the row and artwork-tile column counts
 * (`src/theme/resolveColumns.ts`), the bottom-chrome overlap height and centered-fill shift
 * (`src/theme/bottomChromeOverlay.ts`), the Podcast Index search preview poll helper
 * (`src/screens/search/podcastIndexFeedPreview.ts`), the client-version/platform header builder
 * (`src/auth/mobileClientHeaders.ts` — pure; the RN-coupled resolution stays in `mobileApi.ts`), the
 * billing client selection, account-token binding, and finish-after-confirm rule (`src/billing` —
 * the store SDK adapters stay out of this suite), the auth refresh gate
 * (`src/auth/authRequestWithRefresh.ts` — the API factory, offline pref, and connectivity reporter
 * are mocked, so the gate runs in node), the
 * forced-logout notice marker and the reason it stores (`src/auth/forcedLogoutNotice.ts` —
 * AsyncStorage-backed, and AsyncStorage mocks cleanly in node; the RN modal that renders it stays
 * untested here) and the reason-to-copy mapping (`src/auth/forcedLogoutNoticeCopy.ts`), the session
 * device label sent at login and the signed-in device rows (`src/auth/mobileSessionDeviceLabel.ts`,
 * `src/lib/device/deviceModel.ts`, `src/auth/loginWithMobileToken.ts`,
 * `src/screens/more/accountSessionRows.ts`), the rule
 * that tells an E2E session left behind by a finished flow apart from one a relaunch should keep
 * (`src/auth/e2eSessionReset.ts`), the listen outbox rules — merging reports of one session, the
 * age limits, which send failures drop a report, and the request body
 * (`src/data/repositories/statsListenOutbox.ts` — pure; the SQLite half stays in
 * `statsRepository.ts`), the
 * membership denial mapping (`src/membership/membershipDenial.ts` — pure; note the membership-state
 * derivation now lives in `@podverse/helpers` `deriveMembershipState`, tested there, and the RN-coupled
 * `useMembership` hook is excluded), the membership checkout URL builder
 * (`src/membership/checkoutUrl.ts` — pure; the RN `Linking` opener stays in `checkoutEntry.ts`), the
 * store checkout product selection (`src/membership/storeCheckout.ts`), and
 * the serial background sync queue with its trigger planning (`src/sync/syncQueue.ts`,
 * `src/sync/syncJobPlan.ts` — kept free of RN/Expo imports so serialization, dedupe, growing totals,
 * and failure isolation are testable; the job bodies that reach repositories (`src/sync/syncJobs.ts`)
 * and the RN triggers (`src/sync/SyncProvider.tsx`) are excluded), the derived connectivity rules
 * that decide whether the network is usable — entry debounce, success-only exit, probe backoff,
 * dwell floor, device-versus-server attribution, and whether an already-armed probe timer should
 * keep counting (`src/net/connectivityMachine.ts` — pure and
 * clock-injected, so no timer ever has to elapse in a test; the NetInfo subscription, timers, and
 * health probe stay in `src/net/connectivity.ts` and `src/net/connectivityProbe.ts`), the
 * opportunistic cache fetch gate that stays on local data once the app is effectively offline
 * (`src/data/sync/syncScheduler.ts` — connectivity is mocked so the gate is testable in node), the sync
 * failure taxonomy that
 * produces the quotable error code (`src/sync/syncErrorClassification.ts`), and the error log's
 * cap / eviction rule, detail storage, and copy/export format (`src/data/repositories/syncEventLog.ts`
 * — pure; the SQLite half stays in `syncEventLogRepository.ts`), the mailto URL builder and device
 * report lines (`src/screens/more/errorLogMailto.ts`, `src/screens/more/errorLogDeviceContext.ts` —
 * pure; the platform reader stays in `errorLogDeviceContext.read.ts`) along with the rows playback and
 * add-by-RSS write into it (`src/playback/playbackErrorLog.ts`,
 * `src/lib/addByRss/addByRssErrorLog.ts`). Playback reconciliation is here on the same
 * split: the bounded offline outbox ordering and drain batching
 * (`src/data/repositories/playbackOutbox.ts`), the later-wins merge that decides adopt / ignore /
 * report-a-conflict (`src/data/repositories/playbackReconcile.ts`), the meaningful-event gate that
 * feeds it (`src/playback/playbackEventSource.ts`), and the handoff prompt and dismissal memory
 * (`src/playback/playbackHandoff.ts`) are all pure, while their SQLite halves stay in
 * `playbackOutboxRepository.ts` and the RN provider stays in `PlaybackProvider.tsx`. So are the
 * cross-device playback read model and its rules — revision ordering, own-claim precedence, role,
 * the publish body and claim rule, the supersede rule, command dedupe and staleness, take-over
 * start, and the different-item handoff prompt gate
 * (`src/playback/crossDevice/crossDevicePlaybackStore.ts`, `crossDevicePlaybackPolicy.ts`), and
 * the cross-device presence rules — availability, check-in timing on the stream and on progress
 * samples, and the membership latch (`src/playback/crossDevice/crossDevicePresenceController.ts`),
 * and the cross-device state publisher — claim rule, chaining, the foreground gap and background
 * skip, periodic publishing from progress samples, and 409/403 handling
 * (`src/playback/crossDevice/crossDevicePlaybackPublisher.ts`), the cross-device command runner —
 * target check, dedupe, local staleness, serial execution, live drops, next and previous,
 * take-over start, and start-failure reporting
 * (`src/playback/crossDevice/crossDevicePlaybackCommandRunner.ts`), the commanded-start end
 * clamp — waiting for the engine duration, the correcting seek, and an early end
 * (`src/playback/crossDevice/commandedStartClamp.ts`), the cross-device remote control — seek
 * coalescing, failure mapping, and the take-over result
 * (`src/playback/crossDevice/crossDevicePlaybackRemoteControl.ts`), and the cross-device player
 * display — when the phone draws another device's playback, device names, and failure copy
 * (`src/playback/crossDevice/crossDevicePlayerDisplay.ts`); the check-in, publish,
 * start-failure, and command requests and the local playback paths are injected, and the RN hook
 * `useCrossDevicePlayback.ts` stays out. The
 * player chrome's rules sit on the same split: the overlay store's closing phase and transition
 * durations
 * (`src/components/overlay/overlayStore.ts`, `src/components/overlay/overlayTransitions.ts`), the
 * process-wide Reduce Motion store (`src/hooks/useReduceMotion.ts` — AccessibilityInfo is mocked
 * so the singleton listener is testable in node), the
 * transport glyph mapping that keeps the spinner to a
 * source that cannot start yet (`src/playback/playbackTransport.ts`), which clip or chapter the
 * now-playing bar names (`src/playback/nowPlayingSegment.ts`), which chapter row is marked as
 * playing (`src/playback/playingChapter.ts`), the Add by RSS chapters and
 * transcript kept for the item now playing
 * (`src/playback/addByRssNowPlayingSectionsStore.ts` — one item, dropped on reset, nothing on
 * disk), the auto-queue config after an explicit or playlist play
 * (`src/lib/autoQueue/autoQueue.ts`) and the single-flight fill gate that drops a fill for an
 * item already left (`src/playback/autoQueueFillGate.ts` — the React hook that drives it stays
 * out of this suite), the Add by RSS feed order that Next and Previous step through
 * (`src/lib/addByRss/feedWalk.ts` — the React hook that loads the feed stays out of this suite),
 * the native advance window's row mapping and builder (`src/data/nativeCache/queueEntryMapping.ts`,
 * `src/data/nativeCache/advanceWindow.ts` — the store readers are mocked; the writer hook stays
 * out of this suite), the source saved beside the window and how adoption continues it
 * (`src/lib/playback/nativeAdvanceSource.ts` — the SQLite half stays in
 * `nativeAdvanceSourceRepository.ts`), and the Add by RSS media URL the player loads
 * (`src/lib/addByRss/playbackUrl.ts`),
 * reading a 404 as an empty list (`src/lib/apiErrorStatus.ts`),
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
      'src/auth/authRequestWithRefresh.test.ts',
      'src/auth/e2eSessionReset.test.ts',
      'src/auth/forcedLogoutNotice.test.ts',
      'src/auth/forcedLogoutNoticeCopy.test.ts',
      'src/auth/localDevLoginPrefill.test.ts',
      'src/auth/loginWithMobileToken.test.ts',
      'src/auth/mobileClientHeaders.test.ts',
      'src/auth/mobileSessionDeviceLabel.test.ts',
      'src/billing/**/*.test.ts',
      'src/components/content/itemDetailDateLabel.test.ts',
      'src/components/overlay/overlayStore.test.ts',
      'src/components/overlay/overlayTransitions.test.ts',
      'src/components/player/MediaRowActions.test.ts',
      'src/components/primitives/FillList.test.ts',
      'src/components/primitives/countBadgeFace.test.ts',
      'src/lib/notifications/notificationsBellPress.test.ts',
      'src/components/primitives/coverThumbnailCache.test.ts',
      'src/components/screen/headerBackChoice.test.ts',
      'src/components/player/fullPlayerRows.test.ts',
      'src/config/customApiUrl.test.ts',
      'src/config/publicWebBaseUrl.test.ts',
      'src/config/deepLinkSchemes.test.ts',
      'src/data/db/migrations.test.ts',
      'src/data/identityRemap.test.ts',
      'src/data/repositories/addByRssListedFeeds.test.ts',
      'src/data/repositories/channelItemWindow.test.ts',
      'src/data/repositories/channelLiveStatus.test.ts',
      'src/data/repositories/channelSeenSync.test.ts',
      'src/data/nativeCache/advanceWindow.test.ts',
      'src/data/nativeCache/projection.test.ts',
      'src/data/nativeCache/queueEntryMapping.test.ts',
      'src/data/repositories/libraryBrowseProjection.test.ts',
      'src/playback/drainPlaybackJournal.test.ts',
      'src/data/repositories/playbackOutbox.test.ts',
      'src/data/repositories/playbackReconcile.test.ts',
      'src/data/repositories/subscriptionsMerge.test.ts',
      'src/data/repositories/statsListenOutbox.test.ts',
      'src/data/repositories/subscriptionsSignupPlan.test.ts',
      'src/data/repositories/syncEventLog.test.ts',
      'src/data/sync/syncScheduler.test.ts',
      'src/downloads/**/*.test.ts',
      'src/feedback/actionErrorCopy.test.ts',
      'src/hooks/useReduceMotion.test.ts',
      'src/i18n/icuPlurals.test.ts',
      'src/lib/addByRss/addByRssArtistIndex.test.ts',
      'src/lib/addByRss/addByRssErrorLog.test.ts',
      'src/lib/addByRss/credentials.test.ts',
      'src/lib/addByRss/domain.test.ts',
      'src/lib/addByRss/feedWalk.test.ts',
      'src/lib/addByRss/publisherRefs.test.ts',
      'src/lib/addByRss/downloadIdText.test.ts',
      'src/lib/addByRss/downloadItem.test.ts',
      'src/lib/addByRss/itemSections.test.ts',
      'src/lib/addByRss/liveItemDetail.test.ts',
      'src/lib/addByRss/liveRows.test.ts',
      'src/lib/addByRss/localResourceData.test.ts',
      'src/lib/addByRss/mediaAuth.test.ts',
      'src/lib/addByRss/playbackUrl.test.ts',
      'src/lib/addByRss/resourceData.test.ts',
      'src/lib/apiErrorStatus.test.ts',
      'src/lib/autoQueue/autoQueue.test.ts',
      'src/lib/cachedValue.test.ts',
      'src/lib/device/deviceModel.test.ts',
      'src/lib/home/homeFeedRefresh.test.ts',
      'src/lib/perf/frameStats.test.ts',
      'src/lib/perf/perfSpans.test.ts',
      'src/lib/playback/addByRssPlaybackIdentity.test.ts',
      'src/lib/playback/engineSourceAdoption.test.ts',
      'src/lib/playback/lastPlaybackStorage.test.ts',
      'src/lib/playback/lineArtist.test.ts',
      'src/lib/playback/mediaEngineSourceMeta.test.ts',
      'src/lib/playback/nativeAdvanceSource.test.ts',
      'src/lib/playback/planDownloadCompletePlaybackHandoff.test.ts',
      'src/lib/playback/resolvePlaybackUrl.test.ts',
      'src/lib/playback/verifiedArtists.test.ts',
      'src/lib/rows/homeRowMappers.test.ts',
      'src/lib/rows/liveItemRows.test.ts',
      'src/lib/share/shareSheetPassthrough.test.ts',
      'src/lib/share/shareUrl.test.ts',
      'src/membership/checkoutUrl.test.ts',
      'src/membership/membershipDenial.test.ts',
      'src/membership/storeCheckout.test.ts',
      'src/navigation/deepLinking.test.ts',
      'src/navigation/focusedTabPop.test.ts',
      'src/notifications/bannerNotification*.test.ts',
      'src/notifications/notificationReadActions.test.ts',
      'src/notifications/notificationStreamController.test.ts',
      'src/notifications/notificationStreamPolicy.test.ts',
      'src/notifications/notificationStreamStore.test.ts',
      'src/notifications/notificationsInboxCache.test.ts',
      'src/notifications/sseEventParser.test.ts',
      'src/net/connectivityMachine.test.ts',
      'src/playback/addByRssNowPlayingSectionsStore.test.ts',
      'src/playback/autoQueueFillGate.test.ts',
      'src/playback/nowPlayingSegment.test.ts',
      'src/playback/playbackErrorLog.test.ts',
      'src/playback/playbackEventSource.test.ts',
      'src/playback/playbackHandoff.test.ts',
      'src/playback/crossDevice/commandedStartClamp.test.ts',
      'src/playback/crossDevice/crossDevicePlaybackCommandRunner.test.ts',
      'src/playback/crossDevice/crossDevicePlaybackPolicy.test.ts',
      'src/playback/crossDevice/crossDevicePlaybackPublisher.test.ts',
      'src/playback/crossDevice/crossDevicePlaybackRemoteControl.test.ts',
      'src/playback/crossDevice/crossDevicePlaybackStore.test.ts',
      'src/playback/crossDevice/crossDevicePlayerDisplay.test.ts',
      'src/playback/crossDevice/crossDevicePresenceController.test.ts',
      'src/playback/playbackHandoffTitle.test.ts',
      'src/playback/previousAction.test.ts',
      'src/playback/playbackTransport.test.ts',
      'src/playback/playingChapter.test.ts',
      'src/prefs/bannerNotificationPrefs.test.ts',
      'src/prefs/homeListPrefs.test.ts',
      'src/prefs/prefsStore.test.ts',
      'src/push/accountNotificationLink.test.ts',
      'src/push/notificationTarget.test.ts',
      'src/screens/home/HomeFeedRow.test.ts',
      'src/screens/home/addByRss/addByRssArtistAlbums.test.ts',
      'src/screens/home/addByRss/addByRssDetailSections.test.ts',
      'src/screens/home/addByRss/addByRssEpisodeTabs.test.ts',
      'src/screens/home/addByRss/addByRssTrackTabs.test.ts',
      'src/screens/home/itemUnseen.test.ts',
      'src/screens/home/homeRowMetadata.test.ts',
      'src/screens/home/homeItemMerge.test.ts',
      'src/screens/home/homeItemRowActions.test.ts',
      'src/screens/home/addByRssHomeDetailData.test.ts',
      'src/screens/artist/artistDetailSections.test.ts',
      'src/screens/artist/artistUnsubscribeTargets.test.ts',
      'src/screens/episode/episodeSectionPaneLoaders.test.ts',
      'src/screens/episode/episodeTabs.test.ts',
      'src/screens/player/fullPlayerAddByRssPanes.test.ts',
      'src/screens/player/fullPlayerLayout.test.ts',
      'src/screens/player/fullPlayerContentLink.test.ts',
      'src/screens/search/podcastIndexFeedPreview.test.ts',
      'src/screens/more/accountSessionRows.test.ts',
      'src/screens/more/errorLogDeviceContext.test.ts',
      'src/screens/more/errorLogMailto.test.ts',
      'src/shims/intlPolyfills.test.ts',
      'src/shims/nodeCryptoShim.test.ts',
      'src/sync/syncErrorClassification.test.ts',
      'src/sync/syncQueue.test.ts',
      'src/theme/bottomChromeOverlay.test.ts',
      'src/theme/resolveColumns.test.ts',
      'src/theme/useThemedStyles.test.ts',
    ],
  },
});
