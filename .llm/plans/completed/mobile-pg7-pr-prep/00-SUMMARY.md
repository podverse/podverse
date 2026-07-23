# Mobile PG-7 PR prep — i18n + Close + verify handoff

**Branch:** `feature/mobile-app-init-6`
## Status

planned → **done** (archived). Implementation lived on the working tree; this set closed pre-PR
gaps (i18n parity + Close docs + verify handoff).
**Prerequisite:** PG-7a / PG-7b / Track 9c work landed uncommitted; full mobile Maestro suite
passed (`20260720-032151`, 13/13 iOS + Android after retry).

## Goal

Make the uncommitted PG-7 queue/player/media-row work **PR-ready**:

1. Restore **i18n locale key parity** so `npm run i18n:validate` (CI) passes.
2. Confirm or fix **Android full-player Close** (Maestro used hardware Back; real taps may work).
3. Hand the operator a **cumulative verify + commit** checklist (agents do not run tests or
   commit unless the operator asks).

## Why this set exists

Review of the uncommitted tree found one **CI blocker** and one **product risk**:

| Gap | Severity | Notes |
| --- | -------- | ----- |
| New `media_player.*` keys only in `consumer/originals/en-US.json` | **Blocker** | `es` / `fr` / `el-GR` missing keys; `i18n:validate` fails in `.github/workflows/i18n.yml` |
| Android `full-player-close` Maestro tap does not dismiss modal | Risk | E2E uses `pressKey: Back` on Android. Finger tap may already work after fixed header — confirm before PR |

## In scope

- `i18n:translate` → `i18n:compile` → `i18n:validate` for consumer-layer `media_player` additions
- Android Close smoke (manual steps documented; code fix only if Close is broken for real users)
- Operator verification commands (build, unit, i18n, focused mobile E2E)
- Archive this plan set when done; update `.llm/plans/active/LLM-PLANS-ACTIVE.md`

## Out of scope

- New product features (video player, V4V beyond stub, car mode)
- Re-running the entire Maestro suite during agent steps (operator may re-run)
- Agent `git commit` / `gh pr create` unless the operator explicitly asks in-session
- Pixel polish / theme parity pass

## Critical path

`01` i18n parity → `02` Android Close confirm/fix → `03` verify handoff + archive.

## References

- Skills: **response-ending-make-verify**, **mobile-e2e-screenshots**, **operator-only-git-operations**
- i18n: `packages/i18n-catalog/README.md`, `npm run i18n:translate|compile|validate`
- E2E: `apps/mobile/e2e/play-mini-player.yaml`, `apps/mobile/e2e/HOW-TO-RUN.md`
- Close UI: `apps/mobile/src/screens/player/FullPlayerScreen.tsx`
- Nav dismiss: `apps/mobile/src/navigation/index.tsx` (`FullPlayer` `onClose`)
