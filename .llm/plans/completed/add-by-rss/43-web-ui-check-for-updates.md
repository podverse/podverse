# Add by RSS - Web UI "Check for Updates"

## Goal

Add a “Check for Updates” button that enqueues all saved Add by RSS feeds and displays
per-feed progress.

## Scope

- Button placement in Add by RSS list views.
- Progress UI per feed.

## Key Files

- Web app routes and UI:
  [apps/web/src/app/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/)
- Shared UI components:
  [apps/web/src/components/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/)

## Plan

1. Add a top-level “Check for Updates” button to Add by RSS list views.
2. On click, enqueue all saved feeds through the API.
3. Show per-feed progress status:
   - queued, processing, parsed, not_modified, failed.
