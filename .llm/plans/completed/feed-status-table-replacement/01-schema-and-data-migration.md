# 01 — Schema and data migration

## Goal

Introduce a complete schema that represents policy reasons and operational lifecycle without
status lookup tables, then backfill data so runtime behavior is preserved.

## Files to update

- New migration file:
  [infra/k8s/base/ops/source/database/linear-migrations/app/0025_feed_lifecycle_state_replacement.sql](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/ops/source/database/linear-migrations/app/0025_feed_lifecycle_state_replacement.sql)
- New migration file:
  [infra/k8s/base/ops/source/database/linear-migrations/app/0026_feed_status_table_removal_prep.sql](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/ops/source/database/linear-migrations/app/0026_feed_status_table_removal_prep.sql)
- [packages/orm/src/entities/feed/feed.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/entities/feed/feed.ts)
- New entities under
  [packages/orm/src/entities/feed/](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/entities/feed/)

## Guardrails

- Forward-only migration policy: create new `0025+` files only.
- Do not edit existing migration files already used for baseline/backfill behavior.

## Work items

- Add lifecycle tables:
  - `feed_lifecycle_state_type` (`active`, `pending_archive`, `archived`, `takedown`).
  - `feed_lifecycle_state` (current state, reason key, note, updated_by source/admin).
  - optional `feed_lifecycle_event` history table for transition audit.
- Backfill lifecycle state from current feed columns.
- Backfill `feed_condition` and `feed_policy` from current values (ensuring parity with current
  spam/takedown interpretation).
- Add indexes needed for parser/archiver queries (state key, active conditions).
- Add DB constraints that enforce single current lifecycle record per feed.
- Update ORM entity graph:
  - Remove status/reason relations from `Feed`.
  - Add lifecycle relation(s) to `Feed`.

## Parity checks

- Every feed has one lifecycle current state after migration.
- `feed_policy.primary_block_reason` remains consistent with active conditions.
- Existing takedown/spam feeds remain blocked after migration.

## Completion criteria

- Migration is idempotent.
- ORM compiles with lifecycle entity model and no status-table entity dependency.
