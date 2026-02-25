# Add by RSS - MQ Payload Types

## Goal

Define Add by RSS MQ payload types that do not depend on `podcast_index_id` and can carry
hashes for freshness checks.

## Scope

- New TypeScript types for Add by RSS MQ messages.
- Compatibility with existing MQ message handling.

## Key Files

- MQ types:
  [packages/mq/src/types/mq.ts](/Users/mitcheldowney/repos/pv/podverse/packages/mq/src/types/mq.ts)

## Plan

1. Create a dedicated Add by RSS payload type with:
   - Required: `accountId`, `feedUrl`, `requestId`.
   - Optional: `feedHash`.
2. Ensure the type is used only by Add by RSS queues and consumers.
3. Keep the existing `MQFeedMessage` untouched (still requires `podcast_index_id`).
