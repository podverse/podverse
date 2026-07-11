# 029-web-consume-playback-core

**Master step:** 1.10
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

Web imports policy from @podverse/playback-core via thin re-exports.

## Acceptance criteria

- Step 1.10 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
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
