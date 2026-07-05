# 051-android-foreground-service-perms

**Master step:** 3.12
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add Android manifest permission placeholders for foreground media playback service.
- Declare `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK` via Expo config.
- Prepare for Media3 foreground service in Track 2 without implementing the service yet.
- Keep permissions minimal (no unrelated dangerous permissions in hello-world).

## Acceptance criteria

- Step 3.12 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- `android.permissions` in Expo config lists foreground service permissions
- Prebuild output AndroidManifest includes the declared permissions
- Documented as placeholder for future `podverse-media-engine` / MediaLibraryService
- No actual foreground service implementation required in Track 3

## Web parity references

- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)
- [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md)

## Verification

```bash
grep -q FOREGROUND_SERVICE apps/mobile/app.config.ts apps/mobile/app.json 2>/dev/null
grep -q FOREGROUND_SERVICE_MEDIA_PLAYBACK apps/mobile/app.config.ts apps/mobile/app.json 2>/dev/null
```
