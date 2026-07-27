# Native cache read spike — Android (master step 12.6)

**Detail:** [385-spike-cache-read-no-js-android](/docs/proposals/mobile/_master-plan_/details/385-spike-cache-read-no-js-android.md)
**Goal:** prove Android native code can read the durable native cache (queue / downloads /
library-browse) with the app **force-stopped** (Activity + JS runtime dead) — the "get in the car,
browse and play, never open the phone app" contract from
[DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md).

This spike proves **cache readability only**. The full Android Auto browse tree from cache is
**12.11–12.14** and is out of scope here.

## What landed for the spike

- `android/.../PodverseNativeCache.kt`
  - `read(context, kind)` — file read of each payload; returns `null` (never throws) when absent.
  - `debugDump(context)` — reads all three kinds and `Log.i(TAG, …)`s a one-line summary
    (`debugDump queue=present(bytes:…,schemaVersion:1) downloads=… library_browse=…`).
- `android/.../PodverseMediaLibraryService.kt`
  - `onCreate()` now calls `PodverseNativeCache.debugDump(this)`. Android Auto / DHU starts **this
    service** (a `MediaLibraryService`), **not** the Activity — so this log fires with the Activity
    and JS runtime dead. This is the native read-without-JS proof point.
- Writes come from JS (step 12.4) via `PodverseMediaEngineModule.write*` →
  `PodverseNativeCache.write`. See engine README § "Durable storage + read helpers".

## Storage location (v1)

App-private internal storage (survives force-stop, removed on uninstall / clear-data):

```
<filesDir>/native-cache/
  queue-snapshot.json
  downloads-index.json
  library-browse-index.json
```

No Google Play Services dependency.

## Proof procedure

### Preferred — Android Auto Desktop Head Unit (DHU)

If DHU + Android Auto are set up, this gives an end-to-end "app closed, car connects" proof.

1. Install a dev-client build and run the phone app once so JS writes the cache: add queue items,
   download an episode, and sign in (library-browse index).
2. Force-stop the app so the Activity + JS runtime are dead:

```bash
adb shell am force-stop com.podverse.app.next
```

3. Start `adb logcat` filtered to the cache tag:

```bash
adb logcat -c
adb logcat -s PodverseNativeCache:I
```

4. Launch the DHU and connect Android Auto. The head unit binds to
   `PodverseMediaLibraryService`, whose `onCreate` runs `debugDump` before any JS.
5. Confirm the `debugDump queue=present(…schemaVersion:1) downloads=… library_browse=…` line
   appears in logcat with non-zero byte counts — read by native code with the app force-stopped.

### Alternate proof (no DHU) — force-stop + service start via logcat

Proves the same native read with the app force-stopped, without a head unit. The
`MediaLibraryService` is started by any media-session client (e.g. the system media controller) or
by the app's own `Context.startService` on next launch; for a pure app-closed read, use the DHU or a
media controller that binds the service. Minimal repeatable variant:

1. Write the cache and force-stop as above (steps 1–3).
2. Trigger the media service without opening the UI — e.g. connect a Bluetooth media device or use
   an `adb` media-session client that binds `MediaLibraryService`. On bind, `onCreate` runs and
   logs the `debugDump …` line.
3. Confirm the logcat line shows the payloads were read with the Activity/JS dead.

> If neither DHU nor a service-binding client is available on the machine, document that here and
> rely on the on-disk file check below plus the DHU run on a capable machine.

### Supplementary — on-disk file check (run-as, JS not involved)

```bash
adb shell run-as com.podverse.app.next ls -la files/native-cache
adb shell run-as com.podverse.app.next cat files/native-cache/queue-snapshot.json | head -c 400; echo
```

Confirm each file exists and its JSON starts with the versioned envelope
(`{"schemaVersion":1,"updatedAtMs":…,"payload":…}`, detail 380).

## Evidence

Record the logcat line or `cat` output from your run here:

```
# paste the PodverseNativeCache debugDump … logcat line or the run-as cat output
```

## GO / NO-GO

**GO.** `PodverseMediaLibraryService.onCreate` reads the durable cache via `debugDump` and Android
Auto / DHU starts that service without the Activity or JS — a genuine native read with the app
force-stopped. Full head-unit browse-tree acceptance is deferred to 12.11–12.14 / 12.17.

## Limitations / remaining work

- Emulator without Google Automotive / DHU → use the alternate service-start or file-check proof;
  note which was used in Evidence.
- Force-stop vs swipe-away from recents: force-stop is the stricter case and is what this spike
  targets.
- Empty cache after clear-data: readers return `null`; `onGetChildren` returns an empty tree, no
  crash.
- Full Android Auto browse tree from cache: **12.11–12.14**; DHU manual checklist: **12.17**.

## Cross-links

- GO/NO-GO gate: [GO-NO-GO.md](./GO-NO-GO.md) (rows 12.5 / 12.6)
- iOS counterpart: [NATIVE-CACHE-SPIKE-IOS.md](./NATIVE-CACHE-SPIKE-IOS.md)
- Storage detail: [382-android-native-cache-storage](/docs/proposals/mobile/_master-plan_/details/382-android-native-cache-storage.md)
