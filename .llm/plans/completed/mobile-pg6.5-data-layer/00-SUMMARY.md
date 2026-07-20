# Mobile PG-6.5 — Track 9b (offline-first data layer + primitives)

**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
**Steps:** 9b.1–9b.7
**Detail IDs:** 490–496
**Status:** planned (ready for COPY-PASTA execution)

## Goal

Land the offline-first data layer so PG-7 (queue + player) is built on **repositories**, not direct
`req*` from screens: SQLite (expo-sqlite + Drizzle), repository + sync seam, account snapshot,
queue/now-playing/history repo with native-cache projection stubs, add-by-RSS
`@podverse/parser-mapping` into SQLite, plus shared visual primitives (Button, Card, ListRow,
ScreenHeader) and an opportunistic migrate of Home/Search/Library rows.

## Prerequisites (satisfied)

- PG-0 … PG-4 `done` (auth, nav, themes, media-engine audio spike).
- PG-6 Tracks 8–9 `done` (home, browse, library, add-by-RSS server parse + slim preview).
- Decision docs revised: dual-store §7.1, parser-mapping, visual primitives now / polish later.
- Durable details 490–496 exist and are `planned`.

## Locked decisions

| Item | Decision |
| ---- | -------- |
| Local DB | **expo-sqlite + Drizzle** (not WatermelonDB unless sync graphs force revisit) |
| Data access | Screens/hooks → **repositories**; `ApiRequestService` / `req*` only inside repos |
| Dual-store | SQLite = phone UI; **native cache** = CarPlay / Android Auto / watch projections |
| Projection | Call `projectQueueSnapshotToNativeCache` (etc.) on mutation; **stubs OK** until Track 12 |
| Auth tokens | SecureStore only — never SQLite |
| Prefs | AsyncStorage/MMKV for tiny keys (`uit`, media type) — not app entities |
| Add-by-RSS | Server parse + poll; map with `@podverse/parser-mapping`; persist in SQLite |
| Forbidden | `@podverse/parser`, `@podverse/orm`, `@podverse/ui` / SCSS |
| Visual | Primitives now; full pixel polish deferred |
| E2E | Maestro `apps/mobile/e2e/*.yaml`; not `make e2e_*` |
| DTO imports | `@podverse/helpers` **subpath** exports only (never the barrel) |

## Out of scope

- Track 10 / 11 queue mutations engine and mini/full player UI (PG-7) — enabled by 9b.1–9b.4.
- Track 12 CarPlay / Android Auto native cache **storage** (projection stubs only here).
- Track 13 episode **file** downloads (metadata rows later; same DB).
- Track 2 video surface reparenting (PG-5).
- Full visual pixel polish phase.

## Critical path vs parallel

- **Critical path for PG-7:** 9b.1 → 9b.2 → 9b.4 (DB → seam → queue repo).
- 9b.3 and 9b.5 follow 9b.2; can run after or alongside 9b.4.
- 9b.6 → 9b.7 are independent of the data layer (parallel session/worktree OK; may overlap PG-7).

## Decision / skill references

- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- [DOCS-MOBILE-PROCESS-VISUAL-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-VISUAL-PARITY.md)
- [DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md §4.1](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)
- Skills: **mobile-data-layer**, **mobile-theme-parity**, **add-by-rss-parity-sync**
