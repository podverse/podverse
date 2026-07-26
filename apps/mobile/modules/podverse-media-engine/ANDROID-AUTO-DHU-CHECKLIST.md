# Android Auto — DHU browse+play manual checklist (operator)

**Master step:** 12.17. **Audience:** operator / QA.
**Detail:** [396-dhu-test-checklist](/docs/proposals/mobile/_master-plan_/details/396-dhu-test-checklist.md).

Proves the ship bar: **Android Auto browses the native cache (Library + Downloads) and plays through
the shared engine with the phone app force-stopped.** Car E2E is not fully automatable, so this is a
manual acceptance gate. The agent implemented 12.11–12.15; this checklist is the operator proof.

## Prerequisites

- A dev-client / release build installed on a device or emulator (app id `com.podverse.app.next`).
- Android Auto installed; **Desktop Head Unit (DHU)** set up (Android Studio → SDK Tools → "Android
  Auto Desktop Head Unit emulator"). See <https://developer.android.com/training/cars/testing/dhu>.
- The phone app run **once** so JS wrote the native cache (see step 1).

## 1. Seed the native cache (phone app, once)

Open the phone app and, so all three payloads exist:

- Follow at least one podcast / playlist (writes `library-browse-index.json`).
- Download at least one episode (writes `downloads-index.json`).
- Start playing something so a now-playing/queue snapshot is written (`queue-snapshot.json`).

Optionally confirm the files on disk:

```bash
adb shell run-as com.podverse.app.next ls -la files/native-cache
```

## 2. Force-stop the phone app (Activity + JS dead)

```bash
adb shell am force-stop com.podverse.app.next
```

## 3. Watch the app-closed logs

```bash
adb logcat -c
adb logcat -s PodverseNativeCache:I PodverseMediaLibrary:I
```

Expect (on connect, before any JS):

- `PodverseNativeCache: debugDump queue=present(...) downloads=present(...) library_browse=present(...)`
- `PodverseMediaLibrary: onGetLibraryRoot served root=podverse_root caller=...`

## 4. Connect the DHU

1. Launch the DHU (`./desktop-head-unit` from the SDK `extras/google/auto/` dir) with the emulator/device connected.
2. Open Podverse from the DHU media apps. The head unit binds `PodverseMediaLibraryService` — the
   phone app must stay **force-stopped** (never opened) for the whole run.

## 5. Browse acceptance (app never opened)

- [ ] Root shows **Library** and/or **Downloads** (a node is absent only when its cache is empty).
- [ ] **Library** lists the followed podcasts / playlists from the cache.
- [ ] **Downloads** lists the downloaded episodes as **playable** items.

## 6. Play acceptance (app never opened)

- [ ] Play a **Downloads** (offline) item → audio starts from the local `file://` with **no network**.
- [ ] Play a **streamed** item (remote enclosure) → audio starts.
- [ ] Now-playing shows correct **title / artwork**.
- [ ] Play / pause and **skip** work from the head unit.
- [ ] Playback runs on the shared engine (one media notification appears on the phone; no second player).

## Fallback when no DHU is available

Prove the native read with the app force-stopped without a head unit:

1. Do steps 1–3 above.
2. Trigger the media service without opening the UI — connect a Bluetooth media device or an
   `adb` media-session client that binds `MediaLibraryService`. On bind, `onCreate` runs and logs the
   `debugDump …` line.
3. Confirm the `PodverseNativeCache: debugDump …` and `PodverseMediaLibrary: onGetLibraryRoot …`
   lines show the payloads were read with the Activity/JS dead.

Supplementary on-disk check (JS not involved):

```bash
adb shell run-as com.podverse.app.next cat files/native-cache/downloads-index.json | head -c 400; echo
```

## Evidence

Record the DHU result (or fallback logcat) here for the release ticket:

```
# paste the PodverseMediaLibrary / PodverseNativeCache logcat lines + browse/play pass/fail
```

## Cross-links

- App-closed cache read spike: [`NATIVE-CACHE-SPIKE-ANDROID.md`](./NATIVE-CACHE-SPIKE-ANDROID.md)
- Engine gate + Android Auto browse+play row: [`GO-NO-GO.md`](./GO-NO-GO.md)
- Play Console declaration: [`ANDROID-AUTO-DECLARATION.md`](./ANDROID-AUTO-DECLARATION.md)
- Car rule: [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)
