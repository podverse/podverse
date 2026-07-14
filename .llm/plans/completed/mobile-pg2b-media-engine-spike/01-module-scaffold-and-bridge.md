# Plan 01 — Module scaffold, bridge, cache-hook contract

**Steps:** 2.1, 2.2, 2.3, 2.35
**Model:** Opus 4.8

## Detail references

- [080-media-engine-module-scaffold](/docs/proposals/mobile/_master-plan_/details/080-media-engine-module-scaffold.md)
- [081-native-playback-bridge-interface](/docs/proposals/mobile/_master-plan_/details/081-native-playback-bridge-interface.md)
- [082-bridge-method-contract](/docs/proposals/mobile/_master-plan_/details/082-bridge-method-contract.md)
- [114-engine-native-cache-hooks](/docs/proposals/mobile/_master-plan_/details/114-engine-native-cache-hooks.md)
- [00-CAR-FOUNDATION.md](./00-CAR-FOUNDATION.md)

## Tasks

1. Create `apps/mobile/modules/podverse-media-engine/` with iOS/Android stubs and autolinking.
2. Define TypeScript `NativePlaybackBridge` interface (named exports).
3. Document method/event contract (load/play/pause/seek/setRate/getPosition/getDuration/destroy +
   events).
4. Reserve native-cache write methods per 114 (stubs/no-op OK): `writeQueueSnapshot`,
   `writeDownloadsIndex`, `writeLibraryBrowseIndex`. Schema ownership stays Track 12.1.
5. Ensure no `react-native-track-player` dependency.
6. Rebuild native trees if needed (`npm run mobile:prebuild`).

## On completion

Mark steps **2.1, 2.2, 2.3, 2.35** as `done` in the master plan, Appendix C, and detail headers.
Do not run tests during agent work; instruct operator to verify builds.
