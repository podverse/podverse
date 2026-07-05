# PG-1 — Track 1 `playback-core` extraction

**Parallel group:** PG-1 (Track 1 only)
**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md) steps 1.1–1.14
**Detail IDs:** 020–033

## Goal

Extract pure playback/queue policy from `apps/web/src/lib/playback` and
`combineQueueNowPlayingAndUpcoming` into `@podverse/playback-core` for shared use by web and (later)
mobile. No DOM, no React Native — only `@podverse/helpers`.

## Outputs

- `packages/playback-core` workspace with Vitest unit tests
- Root `build:packages` includes playback-core after helpers
- Web consumes via `@podverse/playback-core` (thin re-exports in `lib/playback`)
- Architecture doc and `PACKAGES-PLAYBACK-CORE.md`

## Prerequisites

PG-0 complete (Track 0 steps 0.1–0.19 `done`).

## After this phase

Operator can start **PG-2a** (hello-world) or **PG-2b** (engine spike) per
[mobile-master-plan-phasing](/.cursor/skills/mobile-master-plan-phasing/SKILL.md).
