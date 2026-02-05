# Add by RSS - API Endpoints

## Goal

Define the API endpoints that enqueue Add by RSS parsing for single or all feeds.

## Scope

- Endpoint routes and controller entry points.
- Input validation and payload shapes.
- Auth requirements for account-scoped feeds.

## Key Files

- Account routes:
  [apps/api/src/routes/account.ts](/Users/mitcheldowney/repos/pv/podverse/apps/api/src/routes/account.ts)
- Account controllers:
  [apps/api/src/controllers/account/](/Users/mitcheldowney/repos/pv/podverse/apps/api/src/controllers/account/)
- Add by RSS follow list:
  [packages/orm/src/services/account/accountFollowingAddByRSSChannel.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/account/accountFollowingAddByRSSChannel.ts)

## Plan

1. Add endpoint to enqueue parsing for one feed:
   - Accept `feedUrl` and optional `feedHash`.
   - Enqueue to `add-by-rss-on-demand`.
2. Add endpoint to enqueue parsing for all saved feeds:
   - Uses user’s saved Add by RSS feeds.
   - Returns request IDs for progress tracking.
3. Ensure all endpoints are account-authenticated and scoped to the requesting user.
