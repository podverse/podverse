# Add by RSS - Worker Parse Progress

## Goal

Add a workers-side MQ consumer for `add-by-rss-on-demand` that runs the parse-only flow and
updates Redis progress/results entries for API polling.

## Scope

- MQ consumer in workers for Add by RSS.
- Redis updates for queued/processing/completed/not_modified/failed.
- No API changes.

## Key Files

- Worker MQ commands:
  [apps/workers/src/commands/mq/rss/](/Users/mitcheldowney/repos/pv/podverse/apps/workers/src/commands/mq/rss/)
- MQ message type:
  [packages/mq/src/types/mq.ts](/Users/mitcheldowney/repos/pv/podverse/packages/mq/src/types/mq.ts)
- Parse-only function:
  [packages/parser/src/lib/rss/addByRSS.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/addByRSS.ts)
- Cache helper:
  [apps/api/src/lib/addByRSSParseCache.ts](/Users/mitcheldowney/repos/pv/podverse/apps/api/src/lib/addByRSSParseCache.ts)

## Plan

1. Add a worker consumer for `add-by-rss-on-demand` that reads `MQAddByRSSMessage`.
2. Update cache to `processing` at job start.
3. Call `parseRSSFeedForAddByRSS` with cache metadata (etag/lastModified/feedHash).
4. Update cache entry based on result:
   - `completed`: include parsed payload + updated cache metadata.
   - `not_modified`: include updated cache metadata only.
   - `failed`: include error message.
5. Ensure errors are caught and always update cache to `failed` to avoid stuck states.
