# 396-dhu-test-checklist

**Master step:** 12.17
**Model (author + implement):** Auto
**Status:** done

## Scope

- Author a manual DHU browse+play acceptance checklist proving the ship bar: Android Auto browses the
  native cache (Library + Downloads) and plays through the shared engine with the phone app
  **force-stopped**.
- Car E2E is not fully automatable; this is an operator/QA gate, not an agent-run test.

## Deliverable

- `apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md` covering:
  - Prerequisites (DHU install, dev-client build, seed the cache once).
  - `adb shell am force-stop com.podverse.app.next` then `adb logcat -s PodverseNativeCache:I
    PodverseMediaLibrary:I`.
  - Connect the DHU; browse **Library** + **Downloads**; play an **offline** item and a **streamed**
    item with the phone app **never opened**; confirm now-playing + skip.
  - Fallback (no DHU): force-stop + service-bind + logcat, plus on-disk `run-as` file check.
  - Evidence block for the release ticket.

## Acceptance criteria

- Checklist enumerates browse + play + now-playing/skip steps with the app force-stopped.
- Includes the no-DHU fallback and the app-closed log lines to expect.
- Cross-links `NATIVE-CACHE-SPIKE-ANDROID.md` and `GO-NO-GO.md`.
- Leaves the evidence blank for the operator run (agent does not claim DHU proof).

## Web parity references

- [DHU testing](https://developer.android.com/training/cars/testing/dhu)
- [NATIVE-CACHE-SPIKE-ANDROID.md](/apps/mobile/modules/podverse-media-engine/NATIVE-CACHE-SPIKE-ANDROID.md)

## Verification

```bash
test -f apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md
```

## Depends on

- 12.11–12.15 Android Auto browse + play (details 390–394) — this phase
