# 028-build-packages-playback-core

**Master step:** 1.9
**Model (author + implement):** Auto
**Status:** done

## Scope

Add playback-core to root build:packages immediately after helpers.

## Acceptance criteria

- Step 1.9 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- No DOM or React Native dependencies in playback-core
- Tier A `.js` relative import specifiers in package source

## Web parity references

- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md) §4
- [media-player-architecture](/.cursor/skills/media-player-architecture/SKILL.md)

## Verification

```bash
npm run build:packages
npm run test -w apps/web
npm run test -w @podverse/playback-core
```
