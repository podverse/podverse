# Add by RSS - Web UI Add Feed

## Goal

Provide a simple Add by RSS feed input form for users to add private RSS URLs.

## Scope

- Feed URL input and submission.
- Basic validation and error handling.

## Key Files

- Web app routes and UI:
  [apps/web/src/app/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/)
- Shared UI components:
  [apps/web/src/components/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/)

## Plan

1. Add a simple form to accept a feed URL.
2. Validate input and submit to existing Add by RSS API endpoint.
3. Generate a synthetic `id`/`id_text` mapping for the feed to enable stable routes.
4. Display success or error states.
