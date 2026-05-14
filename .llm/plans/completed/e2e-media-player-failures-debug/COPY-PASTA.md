# E2E media-player failures debug — copy-pasta

Executed on `refactor/media-player`. All phases below are complete;
details and root-cause notes live in
[`.llm/history/active/e2e-media-player-failures-debug/01-diagnostic-clip-test-1.md`](../../history/active/e2e-media-player-failures-debug/01-diagnostic-clip-test-1.md).

- [x] **Phase 0 — diagnostic capture (clip-soundbite test 1)**

  Snapshot audio state at checkpoints; confirm queue auto-load vs
  seekable-range issues; revert temporary instrumentation.

- [x] **Phase 1 — quick wins**

  `expectMediaPlayerTitleVisible` in music-playback spec; chapter-seek
  XPath uses `[@aria-label='Play']`.

- [x] **Phase 2 — readiness + asset server**

  `waitForAudioReadyAtLeast` + gate `expectAudioCurrentTimeNear`; Range
  support on `tools/test-assets/src/asset-server.ts`; timeouts where
  needed.

- [x] **Phase 3 — chapter-seek / queue leakage**

  `clearSeededPodcastQueueResources` iterates all account queues.

- [x] **Phase 4 — verify**

  Scoped six media-player specs green; full `make e2e_test_report`
  green (web skips = existing `test.fixme` livestream placeholders).
