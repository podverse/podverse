# Mobile PG-7a — Track 10 (queue, auto-queue, orchestrator, audio load)

**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
**Steps:** 10.1–10.25
**Detail IDs:** 310–334
**Status:** planned (ready for COPY-PASTA execution)
**Follow-on:** [mobile-pg7b-player](../mobile-pg7b-player/) (Track 11 audio-first)

## Goal

Wire queue + auto-queue stores, launch hydration, ended/skip orchestrator, and
`@podverse/playback-core` + native audio bridge so Home/Episode/Clip/Library play and queue actions
stop using stubs. Audio-first: no video surface work (that stays PG-5 / Track 11 deferred steps).

## Prerequisites (satisfied)

- PG-0 … PG-4, PG-6, PG-6.5 `done` (incl. 9b.1–9b.4 queue repository + projection stubs).
- Track 2 audio spike GO (`apps/mobile/modules/podverse-media-engine/GO-NO-GO.md`).
- Durable details 310–334 exist and are `planned`.

## Locked decisions

| Item | Decision |
| ---- | -------- |
| Data access | Screens/hooks → queue/auto-queue stores → **repositories**; `req*` only inside repos |
| Policy | All load decisions via `@podverse/playback-core` `resolvePlaybackLoadDecision` |
| Bridge | Prefer `loadAndStart` if added; else `load` then `play` on `NativePlaybackBridge` |
| Dual-store | Mutations call `projectQueueSnapshotToNativeCache` (stub OK until Track 12) |
| Prefs | Auto-queue shuffle/repeat in AsyncStorage/MMKV (`aqc.rd` / `aqc.rp` parity), not SQLite |
| Stubs to replace | `useHomeRowPlaybackStub`, `useClipPlaybackStub` |
| E2E | Maestro; test-assets `:2111`; named E2E devices only |
| Forbidden | `react-native-track-player`; `@podverse/parser` / `@podverse/orm` / `@podverse/ui` |

## Out of scope

- Track 11 mini/full player chrome (PG-7b) — except E2E may use placeholder `testID`s until 11.1.
- Track 2 video surfaces / Track 11 video steps.
- Track 12 native cache storage implementation (call sites only).
- Full visual polish.

## Critical path

`01` store+hydrate → `02` mutations → `03` auto-queue → `04` orchestrator+bridge → `05` anonymous/
stats/cache → `06` E2E.

## References

- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)
- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- Skills: **mobile-data-layer**, **mobile-playback**, **mobile-e2e-screenshots**
