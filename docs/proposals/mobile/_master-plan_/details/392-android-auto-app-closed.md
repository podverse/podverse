# 392-android-auto-app-closed

**Master step:** 12.13
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Guarantee Android Auto connects to `PodverseMediaLibraryService` and receives a browsable root
  with the phone app **force-stopped** (Activity + JS runtime dead) — the "get in the car, browse,
  never open the phone app" contract.
- Add a readable app-closed proof hook so DHU / logcat shows the root was served without JS.
- This is the connection-path guarantee that the browse tree (12.12) and play (12.15) build on.

## Architecture notes

- Android Auto starts the **service**, not the Activity. `onCreate` already reads the durable cache
  (`PodverseNativeCache.debugDump`, spike 12.6) with JS dead; this step adds the connect + root
  serving on the same app-closed path.
- **Proof hook:** `onGetLibraryRoot` logs `Log.i("PodverseMediaLibrary", "onGetLibraryRoot served
root=… caller=…")`, and `onConnect` logs when it denies commands to an unknown caller. With the
  app force-stopped these lines fire from the service process, proving the root is served without
  the Activity / JS.
- The service must **not** depend on any JS bridge state to serve the root — no `eventSink`, no
  RN module. The shared `PodverseAudioEngine.getOrCreatePlayer` and the cache reader are the only
  dependencies, both usable with JS dead.
- Policy stays in `@podverse/playback-core`; the native service only serves cached browse data +
  transport. Do not re-decide queue rules natively.

## Files

- `apps/mobile/modules/podverse-media-engine/android/.../PodverseMediaLibraryService.kt`
  (`onConnect`, `onGetLibraryRoot` log)

## Edge cases

- App never launched / cache absent → root still returned; children empty (no crash).
- Force-stop vs swipe-away: force-stop is the stricter case and the target here.
- Clear-data → cache files gone; readers return `null`; empty tree, no crash.

## Acceptance criteria

- With the app force-stopped, connecting Android Auto / the DHU serves the browsable root.
- `adb logcat -s PodverseMediaLibrary:I` shows the `onGetLibraryRoot served root=…` line without
  the phone UI being opened.
- No JS runtime / Activity dependency in the connect + root path.
- Operator DHU acceptance is 12.17 (detail 396 / `ANDROID-AUTO-DHU-CHECKLIST.md`); this step leaves
  the evidence blank for the operator run.

## Web parity references

- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- [NATIVE-CACHE-SPIKE-ANDROID.md](/apps/mobile/modules/podverse-media-engine/NATIVE-CACHE-SPIKE-ANDROID.md)

## Verification

```bash
rg -n 'onGetLibraryRoot served|onConnect|force-stop' \
  apps/mobile/modules/podverse-media-engine/android \
  apps/mobile/modules/podverse-media-engine/NATIVE-CACHE-SPIKE-ANDROID.md
```

## Depends on

- 12.11 service config + allowed callers (this phase, detail 390)
- 12.6 Android app-closed cache-read spike (done)
