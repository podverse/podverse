# Native cache read spike — iOS (master step 12.5)

**Detail:** [384-spike-cache-read-no-js-ios](/docs/proposals/mobile/_master-plan_/details/384-spike-cache-read-no-js-ios.md)
**Goal:** prove iOS native code can read the durable native cache (queue / downloads /
library-browse) **with the JS runtime not started** — the "get in the car, browse and play, never
open the phone app" contract from
[DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md).

This spike proves **cache readability only**. Polished CarPlay `CPListTemplate` browse + now-playing
bind are steps **12.7–12.10** and are out of scope here.

## What landed for the spike

- `ios/PodverseNativeCache.swift`
  - `read(_:)` — atomic-safe file read of each payload; returns `nil` (never throws) when absent.
  - `debugDump()` — reads all three kinds and `NSLog`s a one-line summary
    (`[native-cache] debugDump queue=present(bytes:…,schemaVersion:1) downloads=… libraryBrowse=…`).
    Reusable by the future CarPlay scene (12.7) as the first read on cold connect.
- Writes come from JS (step 12.4) via `PodverseMediaEngineModule.write*` →
  `PodverseNativeCache.write`. See engine README § "Durable storage + read helpers".

## Storage location (v1)

`appGroupIdentifier` is `nil` until the CarPlay entitlement + App Group are provisioned (12.16), so
v1 writes to the app's Application Support container:

```
<app container>/Library/Application Support/native-cache/
  queue-snapshot.json
  downloads-index.json
  library-browse-index.json
```

Setting `appGroupIdentifier` later transparently moves reads/writes to the shared group container —
do not fork the schema when that happens.

## Proof procedure

### Preferred — CarPlay Simulator (requires CarPlay entitlement)

The CarPlay entitlement is **not yet provisioned** on this app (12.16), so this path is currently
**blocked**. When it lands and a CarPlay scene exists (12.7), the operator re-runs:

1. Build a dev client and run the phone app once so JS writes the cache (add items to the queue,
   download an episode, sign in so the library-browse index is written).
2. Force-quit the app (swipe up from the app switcher) so the RN/JS runtime is dead.
3. From Xcode: **I/O ▸ External Displays ▸ CarPlay** on the booted simulator.
4. On CarPlay connect the scene calls `PodverseNativeCache.debugDump()` before any JS; confirm the
   `[native-cache] debugDump …` line in the device/simulator console with non-zero byte counts and
   `schemaVersion:1`.

Screenshot / console excerpt goes in the "Evidence" section below.

### Alternate proof (no CarPlay entitlement) — container file read, JS not attached

This is the proof used for the current GO decision. It confirms the files are on disk and readable
by non-JS tooling with **Metro not attached**.

1. Boot a simulator and install a dev-client build:

```bash
xcrun simctl list devices booted
```

2. Launch the app **without Metro** (do not run `npm run mobile:dev`). Exercise the write path:
   add queue items, download an episode, and sign in (library-browse index). Then fully quit the
   app from the app switcher so JS is dead.
3. Locate the app container and read the JSON directly (no JS runtime involved):

```bash
APP_CONTAINER=$(xcrun simctl get_app_container booted com.podverse.app.next data)
ls -la "$APP_CONTAINER/Library/Application Support/native-cache"
cat "$APP_CONTAINER/Library/Application Support/native-cache/queue-snapshot.json" | head -c 400; echo
cat "$APP_CONTAINER/Library/Application Support/native-cache/downloads-index.json" | head -c 400; echo
cat "$APP_CONTAINER/Library/Application Support/native-cache/library-browse-index.json" | head -c 400; echo
```

4. Confirm each file exists, is non-empty, and its JSON starts with the versioned envelope
   (`{"schemaVersion":1,"updatedAtMs":…,"payload":…}`, detail 380).

## Evidence

Record the console line or `cat` output from your run here:

```
# paste [native-cache] debugDump … or the cat output of the three JSON files
```

## GO / NO-GO

**GO (file-level).** The durable files are written by JS and read by non-JS tooling with Metro not
attached, and the Swift `read` / `debugDump` helpers are wired for the CarPlay scene. Native
in-process read proof via `debugDump()` is **pending the CarPlay scene (12.7)** and the CarPlay
entitlement (12.16).

## Limitations / remaining work

- CarPlay entitlement + App Group not provisioned → CarPlay Simulator in-scene proof deferred to
  12.7 / 12.16. Current proof is container file read.
- Stale cache after uninstall/reinstall: container is removed with the app; first launch rewrites.
- Schema mismatch → readers return `nil` and the (future) tree renders empty, no crash (12.1 / 380).
- Full CarPlay `CPListTemplate` browse + now-playing bind: **12.7–12.10**.

## Cross-links

- GO/NO-GO gate: [GO-NO-GO.md](./GO-NO-GO.md) (rows 12.5 / 12.6)
- Android counterpart: [NATIVE-CACHE-SPIKE-ANDROID.md](./NATIVE-CACHE-SPIKE-ANDROID.md)
- Storage detail: [381-ios-native-cache-storage](/docs/proposals/mobile/_master-plan_/details/381-ios-native-cache-storage.md)
