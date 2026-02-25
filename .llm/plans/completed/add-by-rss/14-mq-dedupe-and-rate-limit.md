# Add by RSS - MQ Dedupe and Rate Limit

## Goal

Define dedupe and rate-limit settings for Add by RSS queues to control repeated parses and
protect external feeds.

## Scope

- Dedupe time windows for `add-by-rss-on-demand`.
- Alignment with existing on-demand queue behavior.

## Key Files

- MQ constants:
  [packages/helpers/src/lib/mq/mqConstants.ts](/Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/lib/mq/mqConstants.ts)

## Plan

1. Compare current on-demand queue settings and reuse appropriate defaults.
2. Set dedupe window for `add-by-rss-on-demand` to prevent rapid re-queues.
3. Leave `add-by-rss-background` settings defined but unused.
