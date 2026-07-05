# Plan 05 — Native playback and car rules (premium tier)

**Steps:** 0.9, 0.10
**Model:** Opus 4.8

## Detail references

- [009-rule-mobile-car-native](/docs/proposals/mobile/_master-plan_/details/009-rule-mobile-car-native.md)
- [010-skill-mobile-playback](/docs/proposals/mobile/_master-plan_/details/010-skill-mobile-playback.md)

## Proposal context

[DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md),
[DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md),
[media-player-architecture](/.cursor/skills/media-player-architecture/SKILL.md)

## Tasks

1. **`.cursor/rules/mobile-carplay-android-auto.mdc`** — Native-only CarPlay/Android Auto browse trees;
   app-closed requirement; native cache contract (schema pointer to Track 12); single shared engine
   instance; **no** react-native-track-player as architecture choice.

2. **`.cursor/skills/mobile-playback/SKILL.md`** — Map web playback policy to NativePlaybackBridge:
   - Consume `@podverse/playback-core` pure functions (when PG-1 done)
   - Bridge parallels `useMediaElementBridge`
   - Queue/auto-queue wiring pointers
   - Seamless video = surface reparenting, not player remount
   - Background audio + Now Playing integration pointers

## Acceptance

- Rule and skill are precise enough for native engineers and LLM sessions without reading full proposal tree.

## On completion

Mark steps **0.9, 0.10** as `done`.
