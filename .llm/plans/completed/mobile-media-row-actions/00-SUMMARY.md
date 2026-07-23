# Mobile PG-6.6 — Track 9c (media row action affordance parity)

**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
**Steps:** 9c.1–9c.3
**Detail IDs:** 497–499
**Status:** planned (ready for COPY-PASTA; may parallel PG-7)
**Related:** [DOCS-MOBILE-PROCESS-VISUAL-PARITY.md §4](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-VISUAL-PARITY.md)

## Goal

Make mobile list/header **controls** match web action inventory (Play + more-menu intents;
Subscribe/Unsubscribe for feeds) via a shared RN component — without waiting for pixel polish.

## Prerequisites

- Track 9b.6 primitives `done` (`Button`, etc.).
- PG-7a handlers preferred for real queue/play wiring; stubs OK until then.
- Bugfix landed: add-by-RSS feed remove uses `features.unsubscribe` (not queue copy).

## Locked decisions

| Item | Decision |
| ---- | -------- |
| Polish vs actions | Pixel polish deferred; **action inventory is not** |
| Presentation | RN action sheet / bottom sheet for overflow (not web hover menu) |
| i18n | Shared/consumer keys (`queue_next`, `unsubscribe`, …) |
| Feed vs item | Feed list = feed-level actions only; item rows = play/queue/more |
| Forbidden | Queue i18n on non-queue actions; inventing alternate chrome without a doc note |

## Out of scope

- Full pixel polish phase
- Implementing Track 10 queue API (consume when ready)
- Video surface / car

## Critical path

`01` inventory → `02` shared component → `03` migrate screens.
