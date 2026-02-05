# Add by RSS - MQ Enqueue Helpers

## Goal

Provide enqueue helpers for Add by RSS on-demand parsing for single and bulk feed requests.

## Scope

- Enqueue helper functions.
- Request ID generation and per-account batch enqueue.

## Key Files

- RSS MQ functions:
  [packages/mq/src/functions/mq/rss/](/Users/mitcheldowney/repos/pv/podverse/packages/mq/src/functions/mq/rss/)
- MQ types:
  [packages/mq/src/types/mq.ts](/Users/mitcheldowney/repos/pv/podverse/packages/mq/src/types/mq.ts)

## Plan

1. Add helper to enqueue a single Add by RSS feed parse:
   - Accepts `accountId`, `feedUrl`, optional `feedHash`.
   - Returns `requestId` for progress tracking.
2. Add helper to enqueue all saved feeds for an account:
   - Batches enqueue calls and returns a list of `requestId` values.
3. Keep background queue unused in this iteration.
