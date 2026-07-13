# 087-android-foreground-media-service

**Master step:** 2.8
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement Media3 **`MediaLibraryService`** as the foreground media service (not a one-off custom
  `Service` that cannot host Android Auto browse later).
- For this spike, browse APIs may return an empty or minimal tree (e.g. placeholder “Now playing”
  only). Full browse from native cache is Track **12.11–12.13**.
- Use permission placeholders from Track 3 (`FOREGROUND_SERVICE` / media playback types).
- Start/stop service with playback lifecycle.

## Architecture notes (car foundation)

- Service hosts or binds to the **same ExoPlayer** instance as the module (2.7).
- Android Auto connects to this **service**, not the Activity — that is why the service type must
  already be `MediaLibraryService` (see
  [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)).
- Do **not** plan a second service for Auto; Track 12 fills `onGetRoot` / `onGetChildren` from the
  native cache (12.1+).
- JS must never own the Auto browse tree.

## Edge cases

- Android 14+ foreground service type requirements
- Service killed by OEM → document limitation in 2.13
- Stub browse must not crash Auto/DHU if connected early (return empty children safely)

## Acceptance criteria

- Step 2.8 complete per master plan
- Playback continues when app is backgrounded
- Notification/session visible while playing
- Service class is (or clearly subclasses) Media3 `MediaLibraryService`
- README notes Track 12 will attach browse + app-closed proof (12.6, 12.13, 12.17)

## Web parity references

- [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)
- Master plan Track 12.11–12.13

## Verification

```bash
# Manual: play, Home, confirm audio + notification
rg -n 'MediaLibraryService' apps/mobile/modules/podverse-media-engine
```
