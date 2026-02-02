# Add by RSS - MQ Queue Constants

## Goal

Define the two Add by RSS queues in MQ constants so they are available for enqueue and worker
registration.

## Scope

- Add queue names and settings to MQ constants.
- Ensure both queues are visible to producers and consumers.

## Key Files

- MQ constants:
  [packages/helpers/src/lib/mq/mqConstants.ts](/Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/lib/mq/mqConstants.ts)

## Plan

1. Add queue names:
   - `add-by-rss-on-demand` (used now).
   - `add-by-rss-background` (declared, unused for now).
2. Align naming with existing MQ constants patterns.
3. Keep background queue defined but unreferenced in runtime flows for this iteration.
