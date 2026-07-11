# PG-0 — Track 0 foundation (abcmemory prep)

**Parallel group:** PG-0 (Track 0 only)
**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md) steps 0.1–0.19
**Detail IDs:** 001–019

## Goal

Prepare the monorepo and Cursor abcmemory for `apps/mobile` **before** RN app bootstrap (Track 2). No
playback engine, no Expo prebuild, no native modules in this phase.

## Outputs

- `.cursorignore` mobile artifact exclusions
- Tier D import-specifier doc + ESLint policy (or documented deferral until workspace exists)
- Root `test:unit` / lint scoping for future `apps/mobile`
- `apps/mobile/AGENTS.md`, `apps/mobile/APPS-MOBILE.md` (minimal directory if needed)
- Mobile-specific `.cursor/rules/` and `.cursor/skills/`
- Root `AGENTS.md` and `.cursorrules` mobile pointers

## Prerequisites

None.

## After this phase

Operator can start **PG-1** (Track 1 — `packages/playback-core`) or **PG-2a** (hello-world) per
[mobile-master-plan-phasing](/.cursor/skills/mobile-master-plan-phasing/SKILL.md).
