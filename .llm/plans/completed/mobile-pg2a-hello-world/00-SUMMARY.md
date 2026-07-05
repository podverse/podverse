# PG-2a — Track 3 hello-world Expo app

**Parallel group:** PG-2a (Track 3 only)
**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md) steps 3.1–3.16
**Detail IDs:** 040–055

## Goal

Bootstrap `apps/mobile` as an Expo prebuild + dev-client workspace that runs a hello-world screen on
iOS and Android, resolves `@podverse/helpers` from Tier A `dist/`, and uses a **separate bundle id**
(`com.podverse.app.next`) so store listings are not overwritten.

## Outputs

- `apps/mobile` workspace: package.json, Expo config, Metro, tsconfig, entry + src scaffold
- Generated `ios/` and `android/` via `expo prebuild`
- Root convenience scripts: `dev:mobile`, `mobile:ios`, `mobile:android`
- Native permission placeholders (iOS background audio, Android foreground service)
- Track 3 exit checklist recorded in master plan
- Physical device dev-client verification (operator)

## Prerequisites

- **PG-0** complete (Track 0 steps 0.1–0.19 `done`)
- **PG-1** recommended complete (`@podverse/playback-core` exists; not required for helpers smoke)

## After this phase

Operator can start **PG-2b** (engine spike) and/or **PG-3** (CI + mobile E2E) per
[mobile-master-plan-phasing](/.cursor/skills/mobile-master-plan-phasing/SKILL.md). PG-3 gates on Track 3
hello-world exit criteria.
