# 080-media-engine-module-scaffold

**Master step:** 2.1
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Create Expo config-plugin–friendly native module at `apps/mobile/modules/podverse-media-engine/`.
- Scaffold iOS (Swift) and Android (Kotlin) packages with empty module registration wired into
  prebuild / autolinking.
- Do **not** add `react-native-track-player`.
- Leave video surface host stubs out of this step (Track 2 full phase / 2.14+).

## Architecture notes

- One module owns the single player instance for the process (phone, lock screen, future car
  now-playing — see car foundation in phase `00-CAR-FOUNDATION.md`).
- JS talks only through the TurboModule / NativeModule surface consumed by `NativePlaybackBridge`.
- Reserve native-cache write method stubs on the same module (2.35 / detail 114) at scaffold time
  when practical; full persist later.
- Autolink from `apps/mobile/package.json` or Expo config plugin so `mobile:prebuild` picks it up.
- Do **not** add RN car plugins or track-player.

## Edge cases

- Rebuild native trees after adding the module (`npm run mobile:prebuild`).
- Nix/direnv must not pollute Android/iOS builds (use existing `run-expo-macos.sh`).

## Acceptance criteria

- Step 2.1 complete per master plan
- Module directory exists with iOS + Android stubs and package metadata
- App still builds on iOS and Android after linking
- No track-player dependency anywhere in mobile

## Web parity references

- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)
- [mobile-playback](/.cursor/skills/mobile-playback/SKILL.md)
- [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)
- [114-engine-native-cache-hooks](/docs/proposals/mobile/_master-plan_/details/114-engine-native-cache-hooks.md)

## Verification

```bash
test -d apps/mobile/modules/podverse-media-engine
! rg -q 'react-native-track-player' apps/mobile/package.json
```
