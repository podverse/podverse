# Add by RSS - API MQ-Only Guardrails

## Goal

Guarantee the API never parses feeds directly and only enqueues MQ jobs.

## Scope

- Enforce MQ-only behavior in controllers and services.
- Avoid any direct parser invocations in API code.

## Key Files

- Account controllers:
  [apps/api/src/controllers/account/](/Users/mitcheldowney/repos/pv/podverse/apps/api/src/controllers/account/)
- MQ functions:
  [packages/mq/src/functions/mq/rss/](/Users/mitcheldowney/repos/pv/podverse/packages/mq/src/functions/mq/rss/)

## Plan

1. Ensure controller logic only calls MQ enqueue helpers.
2. Avoid importing parser modules in API layer.
3. Add simple tests or lint checks if needed to prevent accidental direct parsing.
