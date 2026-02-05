# Add by RSS - Web UI List Views

## Goal

Create list views for Add by RSS resources that mirror existing layouts and show placeholders
when only feed URLs are available.

## Scope

- List view pages for each resource type.
- Placeholder handling for feeds without parsed data.

## Key Files

- Web app routes and UI:
  [apps/web/src/app/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/)
- Shared UI components:
  [apps/web/src/components/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/)

## Plan

1. Build list views for:
   - Podcasts, Episodes, Artists, Albums, Tracks, Live Streams.
2. Map parsed Add by RSS payloads to view models with synthetic `id`/`id_text` for UI parity.
3. Show placeholders for saved add-by-rss feed URLs when no parsed data exists.
4. Reuse existing list components to keep UI consistent.
