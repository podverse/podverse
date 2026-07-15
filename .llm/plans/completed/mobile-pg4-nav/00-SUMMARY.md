# Mobile PG-4 — Track 7 navigation shell (remaining)

**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
**Steps:** 7.1–7.10, 7.17–7.18
**Detail IDs:** 220–231 (themes 232–237 already `done`)
**Status:** planned (not implemented)

## Goal

Scaffold the five-tab React Navigation shell, nested stacks, mini/full player hosts, linking stub,
Android back behavior, tablet adaptive layout, and a tab-switch Maestro flow.

## Prerequisites

- Prefer Track 6 auth (`mobile-pg4-auth`) implemented first so More/login wiring is natural.
- Themes **7.11–7.16** already `done`.
- Can detail ahead; implement after auth COPY-PASTA finishes unless operator runs nav first for
  shell-only work.

## Locked decisions

| Item | Decision |
| ---- | -------- |
| Tabs | Home, Search, My Library, RSS, More |
| Mini player | Above tabs; app-scoped; does not remount on tab change |
| Full player | Modal/stack over tabs; keeps mini host mounted |
| E2E area | `tab-switch-playback` (stub now-playing OK if Track 10 not ready) |

## Out of scope

- Real home feeds (Track 8), content screens (Track 9), queue (Track 10)
- Theme provider work (already done)
- CarPlay (Track 12)
