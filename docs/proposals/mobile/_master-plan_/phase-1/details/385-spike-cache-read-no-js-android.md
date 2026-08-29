# 385-spike-cache-read-no-js-android

**Master step:** 12.6
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- **Spike / proof:** after phone JS has written the native cache, Android native code can **read**
  the payloads with the app **force-stopped** (Activity + JS dead). Prefer Android Auto DHU; if
  DHU unavailable, prove via `MediaLibraryService` / native reader logging on service start after
  `adb shell am force-stop`.
- Deliver:
  1. Native read path (Kotlin helper from 12.3)
  2. Operator procedure in `NATIVE-CACHE-SPIKE-ANDROID.md`
  3. GO / NO-GO + limitations (DHU vs file/service log proof)

## Architecture notes

- Full Auto browse tree from cache is **12.11–12.14** — this spike only proves readability with
  app closed.
- `PodverseMediaLibraryService` may log cache root counts on `onCreate` / `onGetRoot` for the
  spike without shipping a full tree yet.

## Edge cases

- Force-stop vs swipe-away from recents
- Emulator without Google Automotive / DHU — document alternate proof
- Empty cache after clear-data

## Acceptance criteria

- Spike note with re-runnable steps
- Evidence of native read without JS (logcat excerpt or DHU screenshot)
- Explicit remaining work for 12.11–12.15
- Cross-link from engine README / GO-NO-GO

## Web parity references

- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- [382-android-native-cache-storage](/docs/proposals/mobile/_master-plan_/phase-1/details/382-android-native-cache-storage.md)

## Verification

```bash
test -f apps/mobile/modules/podverse-media-engine/NATIVE-CACHE-SPIKE-ANDROID.md
```

## Depends on

- 12.1–12.4 — this phase
