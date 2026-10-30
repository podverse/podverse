# Livestream player behavior — execution order

Prompts and models: [COPY-PASTA.md](COPY-PASTA.md). Request and settled review answers:
[00-REQUEST.md](00-REQUEST.md). Ledger and decisions: [00-SUMMARY.md](00-SUMMARY.md).

Phases run one after another. Prompts inside one phase run at once and own disjoint files,
counting the shared files in **parallel-plan-execution** § Shared files. In this set those are
`apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md` (plans 20, 40, 41, 52, 53),
`apps/mobile/src/playback/PlaybackProvider.tsx` (61, 70, 71), `tools/web/seed-e2e.mjs` and
`apps/web/e2e/helpers/seedConstants.ts` (40, 53), `packages/playback-core/src/index.ts` and
`package.json` (10, 11), `NonLiveMediaOrchestrator.tsx` (50, 51), `scripts/mobile/e2e-test.sh`
and `.cursor/skills/mobile-test-economics/SKILL.md` (62, 73), the consumer i18n originals (52
only), and `release-notes/scratchpad.md`. No prompt writes the scratchpad except prompt 73, which
runs alone and appends every other prompt's entry.

## Dependency graph

From each plan's `## Runs after`, plus the order Close added for shared files:

| Plan | Runs after |
| --- | --- |
| 10 restored-livestream decision | none |
| 11 live position policy | 10 |
| 12 parser ends departed live items | none |
| 20 web orphaned session tab role | none |
| 30 media engine bridge contract | none |
| 31 media engine iOS | 11, 30 |
| 32 media engine Android | 11, 30 |
| 40 web anonymous restore | 10; after 53 for the seed files and the matrix |
| 41 web queue head | 10, 20, 40; after 52 for the matrix |
| 50 web duration reset | none |
| 51 web live position store | 11, 50 |
| 52 web live controls and time | 50, 51, 53 |
| 53 E2E HLS rewind fixture and seed | none; after 20 for the matrix |
| 60 mobile restored-livestream helpers | 10 |
| 61 mobile restore retires ended livestreams | 60; after 70 for `PlaybackProvider.tsx` |
| 62 mobile ended-livestream E2E | 40, 61 |
| 70 mobile duration reset | none |
| 71 mobile live window store and controls | 11, 30, 70; after 61 for `PlaybackProvider.tsx` |
| 72 mobile full player live controls | 11, 52, 71 |
| 73 mobile livestream controls E2E, closes the set | 53, 62, 70, 72 |

Plan 70 edits only `playTarget` and the progress handler in `PlaybackProvider.tsx`, and plan 61
only `restoreFromSnapshot`, `adoptQueueHeadWhenPlayerEmpty`, and the handoff-prompt `useEffect`,
so 70 running first does not move 61's anchors.

## Package builds

Mobile and the web type-check read `@podverse/helpers` and `@podverse/playback-core` from `dist/`.
Prompt 10 builds both at the end of Phase 1, and prompt 11 rebuilds `playback-core` at the end of
Phase 2. No other prompt builds packages.

## Phases

### Phase 1 — shared decision, parser, web tab role, bridge contract, duration resets

- **10** owns `packages/helpers/src/lib/liveItemStatus.ts` and its test,
  `apps/web/src/lib/embed/resolveEmbedLiveItemStatus.ts` and its test,
  `packages/playback-core/src/restoredLivestream.ts` and its test,
  `packages/playback-core/src/index.ts`, and `packages/playback-core/package.json`.
- **12** owns `packages/parser/src/lib/rss/liveItem/liveItemArchive.ts` and its test,
  `liveItem.ts`, `item/item.ts`, `parser.ts`, the two `parser.parseRSSFeedAndSaveToDatabase.*`
  tests, and `packages/orm/src/services/liveItem/liveItem.ts`.
- **20** owns `apps/web/src/lib/crossDevicePlayback/` (`playbackTabChannel.ts`,
  `tabPlaybackRole.ts`, `crossDevicePlaybackStore.ts`, `playbackDeviceMenu.ts`, and their tests),
  `apps/web/src/contexts/CrossDevicePlayback.tsx`, the decision matrix, and
  `apps/web/e2e/media-player-cross-device-remote.spec.ts`.
- **30** owns `apps/mobile/modules/podverse-media-engine/src/` (`types.ts`,
  `liveWindowNormalization.ts` and its test, `NativePlaybackBridge.ts`,
  `PodverseMediaEngineModule.ts`), the module's `index.ts` and `README.md`, and
  `apps/mobile/src/bridge/nativePlaybackBridge.ts` and `useNativePlaybackBridge.ts`.
- **50** owns `apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx`, `usePlayAddByRSS.tsx`, their
  tests, `NonLiveMediaOrchestrator.tsx`, and its new live test.
- **70** owns `apps/mobile/src/lib/playback/mediaFileDurationHint.ts` and its test, and
  `PlaybackProvider.tsx` (`playTarget` and the progress handler only).

### Phase 2 — live policy, rewind fixture, mobile restore helpers

- **11** owns `packages/playback-core/src/livePlayback.ts` and its test, `src/index.ts`,
  `package.json`, and `PACKAGES-PLAYBACK-CORE.md`.
- **53** owns `tools/test-assets/src/asset-generator.ts`, the generated
  `tools/test-assets/assets/e2e/hls/e2e-hls-rewind-*` files, `tools/web/seed-e2e.mjs`,
  `apps/web/e2e/helpers/seedConstants.ts`, and the decision matrix (§ 6c).
- **60** owns `apps/mobile/src/data/repositories/playbackContentRepository.ts`,
  `apps/mobile/src/lib/playback/lastPlaybackStorage.ts` and its test, and
  `apps/mobile/src/lib/playback/restoredItemLoad.ts` and its test.

### Phase 3 — native engines, web anonymous restore, web live store, mobile restore

- **31** owns `ios/PodverseAudioEngine.swift`, `ios/PodverseMediaEngineModule.swift`, and
  `src/liveWindowStartMargin.ios.test.ts` under the media engine module.
- **32** owns the Android `PodverseAudioEngine.kt`, `PodverseMediaEngineModule.kt`, and
  `PodverseSessionPlayer.kt`, and `src/liveWindowStartMargin.android.test.ts`.
- **40** owns `apps/web/src/lib/playback/fetchFreshRestoredItem.ts` and its test,
  `apps/web/src/utils/anonymousPlaybackStorage.ts` and its test,
  `AnonymousPlaybackRestoreController.tsx`, the decision matrix, `tools/web/seed-e2e.mjs`,
  `seedConstants.ts`, `apps/web/e2e/helpers/anonymousSnapshot.ts`, and
  `apps/web/e2e/media-player-anonymous-restore.spec.ts`.
- **51** owns `apps/web/src/hooks/mediaElementBridgeSurface.ts` and its test,
  `apps/web/src/lib/livePlayback/` (`liveSeekWindow.ts`, `liveMediaStore.ts`, their tests),
  `apps/web/src/hooks/useLiveMediaSnapshot.ts`, `MediaPlayerControllerLiveStreamAV.tsx`, and
  `NonLiveMediaOrchestrator.tsx`.
- **61** owns `PlaybackProvider.tsx` (`restoreFromSnapshot`, `adoptQueueHeadWhenPlayerEmpty`, the
  handoff-prompt `useEffect`, and a shared helper above them).

### Phase 4 — web live controls, mobile ended-livestream flow, mobile live store

- **52** owns `LiveMediaPlayerProgress.tsx` and its test, `MediaPlayerProgress.tsx` and its SCSS
  module, `MediaPlayerControlsDesktop.tsx`, `MediaPlayerControlsModal.tsx`,
  `MediaPlayerButtonsMobile.tsx`, `MediaPlayerControlsMobile.tsx`, `useShowJumpButtons.ts`,
  `usePlayerTransport.ts`, `MediaPlayerController.tsx`, `mediaPlayerWindowKeyDown.ts` and its
  test, the four `packages/i18n-catalog/consumer/originals/*.json` files,
  `apps/web/e2e/media-player-livestream-live-controls.spec.ts`, and the decision matrix.
- **62** owns `apps/mobile/e2e/playback-ended-livestream-restore.yaml`,
  `scripts/mobile/e2e-test.sh`, and `.cursor/skills/mobile-test-economics/SKILL.md`.
- **71** owns `apps/mobile/src/playback/livePlaybackStore.ts` and its test, and
  `PlaybackProvider.tsx`.

### Phase 5 — web queue head, mobile full player

- **41** owns `useMediaPlayerControllerQueueHeadLoading.ts` and its test,
  `apps/web/e2e/media-player-livestream-queue-restore.spec.ts`,
  `apps/web/e2e/helpers/mediaPlayerAssertions.ts`, `makefiles/local/e2e-spec-order-web.txt`, and
  the decision matrix.
- **72** owns `apps/mobile/src/components/player/FullPlayerLiveControl.tsx`,
  `FullPlayerScrubber.tsx`, and `apps/mobile/src/screens/player/FullPlayerScreen.tsx`.

### Phase 6 — mobile livestream controls flow, then close the set

- **73**, alone. It adds `apps/mobile/e2e/livestream-player-controls.yaml`, registers it in
  `scripts/mobile/e2e-test.sh` and the mobile-test-economics skill after plan 62, appends every
  release entry, archives the set, and carries the cumulative verification.

## Release entries collected by prompt 73

From `.artifacts/plan-runner/livestream-player-behavior/<NN>.md`, in this order: 12, 20, 50, 70,
31, 32, 40, 51, 61, 52, 71, 41, 72. Plans 10, 11, 30, 53, 60, 62, and 73 carry no entry.
