# 06 — Offline content sync

**Cursor model:** Opus 5
**Reasoning:** high
**Detail:** [702-offline-content-sync](/docs/proposals/mobile/_master-plan_/phase-2/details/702-offline-content-sync.md)
**Master step:** P2.4.3
**Depends on:** 02, 03

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 31–33 and
[`mobile-sync-orchestration`](/.cursor/rules/mobile-sync-orchestration.mdc) before starting.

## Goal

Everything a user is subscribed to is browsable and playable offline — channels **and** their items,
not only downloaded media files.

## Work

1. Extend the local schema under `apps/mobile/src/data/db/` to store items per subscribed channel,
   plus the channel fields the Home row needs (latest item publish date, live status).
2. Implement the storage depth rule:
   - Server-backed channels: a recent window of the **latest 50 items**, extended on demand when the
     user scrolls past it while online, with the extension persisted.
   - Add-by-RSS feeds: the **entire feed, no cap**.
3. Build the background sync that reconciles local storage with the server and with add-by-RSS feeds:
   new items, channel metadata changes, removals, and re-parse results.
4. Trigger sync on app foreground, on manual pull-to-refresh, and when connectivity returns —
   by **enqueuing jobs on the serial queue from prompt 03**, never by running a pass inline. This is
   the largest producer of sync work in the app; a per-channel pass enqueues as it discovers
   channels, so the indicator's total grows mid-run. Give every job a user-facing label.
5. Make sync idempotent — repeated runs must not duplicate rows.
6. Degrade quietly on failure: keep the last known local state, and surface an error only where the
   user explicitly asked to refresh.
7. Route subscribed-content reads through local storage so browse, filter, and sort work offline.
   Leave network search and directory browse as online-only surfaces.
8. Unit tests for window extension, sync idempotency, and removal reconciliation. Include a
   large-feed fixture and assert bounded growth for server-backed channels.

## Constraints

- Reuse `@podverse/parser-mapping` for add-by-RSS mapping; never import `@podverse/parser`.
- Keep DTO shapes aligned with `@podverse/helpers`.
- Project to the native cache on relevant mutations per **mobile-data-layer**.
- Do not run tests during implementation.

## Done when

With the network disabled, a subscribed user can open Home, see channels, filter and sort them, open
a channel, and see stored items — and sync converges without duplicates when the network returns.
