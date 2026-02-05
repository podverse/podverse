# Add by RSS - MQ Queues and Types (Overview)

## Goal

Introduce Add by RSS-specific MQ queues and message payloads so all parsing is done
asynchronously through MQ with optional hash-based freshness checks.

## Scope

- Queue configuration and constants.
- MQ message types for Add by RSS.
- MQ enqueue helpers for Add by RSS on-demand parsing.
- Dedupe and rate-limit settings for new queues.

## Key Files

- Queue constants:
  [packages/helpers/src/lib/mq/mqConstants.ts](/Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/lib/mq/mqConstants.ts)
- MQ types:
  [packages/mq/src/types/mq.ts](/Users/mitcheldowney/repos/pv/podverse/packages/mq/src/types/mq.ts)
- RSS MQ functions:
  [packages/mq/src/functions/mq/rss/](/Users/mitcheldowney/repos/pv/podverse/packages/mq/src/functions/mq/rss/)

## Subplans

- Queue names and constants:
  [11-mq-queue-constants.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/11-mq-queue-constants.md)
- Add by RSS MQ payload types:
  [12-mq-payload-types.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/12-mq-payload-types.md)
- Enqueue helpers:
  [13-mq-enqueue-helpers.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/13-mq-enqueue-helpers.md)
- Dedupe and rate-limit settings:
  [14-mq-dedupe-and-rate-limit.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/14-mq-dedupe-and-rate-limit.md)

## Output Contracts

- The MQ consumer should be able to return one of:
  - Parsed data (when hash differs or not provided).
  - “Not modified” response (when hash matches current feed state).
  - Failure status (parse error, validation failure).

## Notes

- `add-by-rss-background` is created but not wired into any flow in this iteration.
