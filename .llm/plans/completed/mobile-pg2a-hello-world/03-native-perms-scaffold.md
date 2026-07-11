# Plan 03 — Native permissions and src scaffold

**Steps:** 3.11, 3.12, 3.13
**Model:** Codex 5.3

## Detail references

- [050-ios-background-audio-plist](/docs/proposals/mobile/_master-plan_/details/050-ios-background-audio-plist.md)
- [051-android-foreground-service-perms](/docs/proposals/mobile/_master-plan_/details/051-android-foreground-service-perms.md)
- [052-mobile-src-scaffold](/docs/proposals/mobile/_master-plan_/details/052-mobile-src-scaffold.md)

## Tasks

1. Set iOS `UIBackgroundModes: [audio]` via Expo config (placeholder for media engine).
2. Set Android `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permissions via Expo config.
3. Re-run prebuild if needed so native projects pick up plist/manifest changes.
4. Create `src/navigation/` and `src/screens/` scaffold; route hello-world through `src/screens/`.

## On completion

Mark steps **3.11, 3.12, 3.13** as `done` in the master plan and detail doc headers.
