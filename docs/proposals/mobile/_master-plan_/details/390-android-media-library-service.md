# 390-android-media-library-service

**Master step:** 12.11
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Make `PodverseMediaLibraryService` a production-ready Android Auto media browse service (not just
  the background-audio foreground service from PG-2b step 2.8).
- Validate allowed callers in `MediaLibrarySession.Callback.onConnect` so Android Auto / Automotive
  and the phone media notification controller connect, and unknown callers get no commands.
- Declare Podverse as an Android Auto **media** app so the head unit / DHU lists the service.
- Keep the single shared `ExoPlayer` (`PodverseAudioEngine`) wrapped in the one
  `MediaLibrarySession` — never a second player/session/service.
- Browse-tree content is **out of scope** here (that is 12.12 / detail 391); this step is the
  service wiring + connection contract + stable root.

## Architecture notes

- Android Auto binds to the **service, not the Activity** — everything here must work with the JS
  runtime dead (see [392-android-auto-app-closed](/docs/proposals/mobile/_master-plan_/details/392-android-auto-app-closed.md)).
- **Allowed callers:** trust Media3's signature-checked helpers
  (`session.isMediaNotificationController`, `isAutoCompanionController`, `isAutomotiveController`)
  plus the app's own package. Prefer these over a package-name allowlist, which is spoofable.
  Unknown callers connect with `SessionCommands.EMPTY` / `Player.Commands.EMPTY` (graceful, no crash)
  rather than a hard reject.
- **Media-app declaration:** `com.google.android.gms.car.application` `<meta-data>` in the module
  `AndroidManifest.xml` pointing at `res/xml/automotive_app_desc.xml` (`<automotiveApp><uses
  name="media"/></automotiveApp>`). The module manifest + resources merge into the app manifest at
  prebuild, so no hand-edit of the generated app manifest is required.
- **Foreground timing:** keep `Context.startService` (not `startForegroundService`). Media3 promotes
  to a `mediaPlayback` foreground service + notification once playback is ongoing; starting
  foreground too early throws `ForegroundServiceDidNotStartInTimeException` (see `PodverseAudioEngine.play`).
- The Play Console "Android Auto" declaration is the **operator** step (12.16 / detail 395 /
  `ANDROID-AUTO-DECLARATION.md`), not code.

## Files

- `apps/mobile/modules/podverse-media-engine/android/.../PodverseMediaLibraryService.kt`
- `apps/mobile/modules/podverse-media-engine/android/src/main/AndroidManifest.xml`
- `apps/mobile/modules/podverse-media-engine/android/src/main/res/xml/automotive_app_desc.xml`

## Edge cases

- Empty / missing cache → root still returned; children empty (12.12), never crash.
- Unknown caller package → connects with no commands; cannot browse or drive the engine.
- Service started before playback → stays a regular service until Media3 promotes it on play.

## Acceptance criteria

- `onConnect` accepts Media3 media-notification / Auto / Automotive controllers + own package;
  unknown callers get empty commands.
- `onGetLibraryRoot` returns a stable browsable root (`isBrowsable=true`, `isPlayable=false`) for
  any `LibraryParams`, even with an empty cache.
- Module manifest declares the `com.google.android.gms.car.application` media descriptor.
- One shared player / session / service (no second engine).
- Operator DHU proof is deferred to 12.17 (detail 396).

## Web parity references

- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)

## Verification

```bash
rg -n 'onConnect|onGetLibraryRoot|car.application|automotive_app_desc' \
  apps/mobile/modules/podverse-media-engine/android
```

## Depends on

- 2.7–2.9 shared engine + `MediaLibrarySession` (done)
- 12.3 durable Android cache storage (done)
