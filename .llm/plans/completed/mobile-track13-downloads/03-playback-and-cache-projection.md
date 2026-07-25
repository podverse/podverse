# 03 — Play from download + native cache projection (13.6, 13.9)

**Cursor model:** Opus 4.8  
**Details:** 435, 438  
**Ship bar:** Correct local URL into shared engine; projection call sites complete.

## Goal

Play completed downloads via `file://` on the existing media engine, and ensure every downloads
mutation projects the native-cache downloads index (stubs OK until Track 12).

## Context (read first)

- Details 435, 438
- [105-engine-local-file-playback](/docs/proposals/mobile/_master-plan_/details/105-engine-local-file-playback.md)
- [114-engine-native-cache-hooks](/docs/proposals/mobile/_master-plan_/details/114-engine-native-cache-hooks.md)
- `apps/mobile/modules/podverse-media-engine/` README (source URLs)
- `apps/mobile/src/data/nativeCache/projection.ts`
- Skills: **mobile-playback**, **mobile-data-layer**
- Rule: **mobile-carplay-android-auto**

## Tasks

1. **Playback (13.6)** — `resolvePlaybackUrl` (or equivalent): prefer local file when complete;
   load via existing bridge; missing file → mapped error + re-download path. Progressive
   downloads only — do not invent offline HLS.
2. **Projection (13.9)** — Ensure complete/delete/auto-delete paths call
   `projectDownloadsIndexToNativeCache` (and bridge `writeDownloadsIndex` if already wired).
   Call from repository/manager only.
3. Mark **13.6, 13.9** `done` in master plan Tracks + Appendix C; detail headers `done`.

## Out of scope

- CarPlay browse UI (Track 12)
- Quota policy (04)

## Acceptance

- Downloaded item plays with network disabled (manual or leading into 05)
- Projection called on mutate; `__DEV__` stub logs acceptable
