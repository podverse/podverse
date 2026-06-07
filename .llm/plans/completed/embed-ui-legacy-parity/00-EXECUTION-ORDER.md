# Embed UI legacy parity — 00 Execution Order

## How to use

1. Read [`00-SUMMARY.md`](./00-SUMMARY.md).
2. Execute numbered files `01` → `05` in order.
3. Write tests during implementation; operator runs verification after the set completes.

## Phase table

| # | Phase | Outcome |
| --- | --- | --- |
| 1 | Shell card layout and heights | Unified border, no clip, 260/720 |
| 2 | Player info, artwork, typography | 76px art, bold title, date pill |
| 3 | Progress and controls parity | Full-width progress + timestamps |
| 4 | List rows legacy layout | Play + text rows only |
| 5 | E2E, docs, heights | Assertions and docs sync |

## Dependencies

- Phase 1 before 2–4 (height budget and overflow).
- Phases 2–4 can overlap after Phase 1.
- Phase 5 last.

## File order

- [`01-shell-card-layout-and-heights.md`](./01-shell-card-layout-and-heights.md)
- [`02-player-info-artwork-typography.md`](./02-player-info-artwork-typography.md)
- [`03-progress-and-controls-parity.md`](./03-progress-and-controls-parity.md)
- [`04-list-rows-legacy-layout.md`](./04-list-rows-legacy-layout.md)
- [`05-e2e-docs-heights.md`](./05-e2e-docs-heights.md)
