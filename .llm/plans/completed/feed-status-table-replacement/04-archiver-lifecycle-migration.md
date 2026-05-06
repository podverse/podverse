# 04 — Archiver lifecycle migration

## Goal

Move archiver behavior from status IDs to explicit lifecycle state while preserving all retention
and cleanup behavior.

## Files to update

- [packages/orm/src/services/archiver.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/archiver.ts)
- [apps/workers/src/lib/deduplicator.ts](/Users/mitcheldowney/repos/pv/podverse/apps/workers/src/lib/deduplicator.ts)
- [apps/workers/src/commands/orm/feed/updateFlagStatus.ts](/Users/mitcheldowney/repos/pv/podverse/apps/workers/src/commands/orm/feed/updateFlagStatus.ts)

## Work items

- Replace `pending archive`, `archived`, `spam`, and `takedown` status filters with lifecycle
  state queries.
- Keep existing item-retention behavior:
  - retain items with clip/playlist references
  - delete orphan archived items in batches
  - takedown removal of item + optional channel rows.
- Update worker/deduplicator commands to set lifecycle and conditions instead of status IDs.

## Parity checks

- Pending archive feeds still transition to archived.
- Spam cleanup still archives eligible items without changing lifecycle to archived automatically.
- Takedown cleanup still removes content rows as before.

## Completion criteria

- Archiver logic has no `feed_flag_status` ID queries.
- Worker command interface is future-focused (lifecycle/condition language).
