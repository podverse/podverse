# 01 — MediaLibraryService config + app-closed root (12.11, 12.13)

**Cursor model:** Opus 4.8
**Details to author:**
[390-android-media-library-service](/docs/proposals/mobile/_master-plan_/phase-1/details/390-android-media-library-service.md),
[392-android-auto-app-closed](/docs/proposals/mobile/_master-plan_/phase-1/details/392-android-auto-app-closed.md)

## Goal

Make `PodverseMediaLibraryService` a production-ready Android Auto **media browse service**: correct
foreground-service + manifest wiring, accepts Android Auto as an allowed caller, and returns a
browsable root **with the app force-stopped** (Activity/JS dead). This is the foundation the browse
tree (step 2) and play (step 3) build on — no tree content yet beyond a stable root.

## Context (already in place)

- `apps/mobile/modules/podverse-media-engine/android/.../PodverseMediaLibraryService.kt` — Media3
  `MediaLibraryService` wrapping the shared `PodverseAudioEngine` player in one
  `MediaLibrarySession`; `onCreate` calls `PodverseNativeCache.debugDump(this)` (12.6).
- `android/src/main/AndroidManifest.xml` — service declared with
  `foregroundServiceType="mediaPlayback"` + `MediaLibraryService` / `MediaBrowserService` intent
  filters.
- Car rule: [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc) — browse is
  native-only; connects to the **service, not the Activity**; policy stays in `@podverse/playback-core`.

## Do

1. Read details 390 + 392 (author them if TBD), the car rule, and `GO-NO-GO.md` C3/C5.
2. **Allowed callers / package validation:** accept Android Auto + Android Automotive controllers in
   the `MediaLibrarySession.Callback.onConnect` (validate known package/signature set; allow the
   media notification controller). Reject unknown callers gracefully (empty accepted commands) — do
   not crash.
3. **Root contract:** keep a stable browsable root (`ROOT_ID`) returned from `onGetLibraryRoot`
   with `isBrowsable=true, isPlayable=false`; honor `LibraryParams` (offline/suggested) minimally.
   Root must be returned even when the cache is empty/missing (empty tree, no crash).
4. **Foreground/notification:** confirm Media3 promotes to a `mediaPlayback` foreground service on
   play (do **not** call `startForegroundService` too early — keep the existing comment/contract).
   Ensure `automotive_app_desc` / `<automotiveApp>` XML + `com.google.android.gms.car.application`
   metadata are present (or documented as operator manifest step for the app module, since the
   Expo module manifest merges into the app).
5. **App-closed proof hook (12.13):** the service already starts without the Activity; extend
   `debugDump` usage or add a one-line `Log.i` in `onGetLibraryRoot` so DHU/force-stop shows the
   root served with JS dead (this is the readable proof the browse tree in step 2 relies on).
6. Update `README.md` (§ Android shared engine + service) and mark **12.11**, **12.13** + Appendix C
   **390**, **392** + detail headers **done**. Check the box in `COPY-PASTA.md`.

## Do not

- Do not build the actual browse tree content (that is step 2 / 12.12) — root + connection only.
- Do not add a second player/session/service (reuse the shared engine + one session).
- Do not implement iOS CarPlay here.
- Do not run Maestro/DHU as agent verification (operator DHU proof is step 4).
- Do not run tests during agent work.

## Skills / rules

- **mobile-carplay-android-auto**, **mobile-playback**, **mobile-data-layer**

## Operator verify (after implement — no tests run by agent)

```bash
rg -n 'onConnect|onGetLibraryRoot' apps/mobile/modules/podverse-media-engine/android
# Native build proof + DHU is step 4:
npm run mobile:prebuild
npm run mobile:android -- --device Pixel_6_Pro_API_33
```
