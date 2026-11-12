**Cursor model:** Opus 5.5 · **Reasoning:** medium

# 02 — The copy records what it could not finish

## Rows

Nothing the one-time copy skips is lost without a record.

## Runs after

none (may run alongside 01; uses 01's settled rule only through `LocalCatalog`)

## Problem

`v4CopyAccountLibrary` sets `v4_library_copied_at` and never runs again for that
account. Rows it skips today:

- user follows of accounts that are not copied yet (rehearsal: 2)
- another user's clip in a playlist (waits on that copy)
- history, queue, and now playing whose feed's first parse failed (dropped at
  copy time; rehearsal: 16 of the 47 dropped history rows)
- snapshot clips and playlist members whose show is seeded later
- subscriptions to shows the seed skips (rehearsal: 21)

## Change

1. `legacy_id_map` stores ids only and is unique on `(legacy_kind, legacy_id)`,
   so it cannot hold "this account's history row for this episode." Add a
   linear migration for `legacy_pending_row`: `account_id` (FK, ON DELETE CASCADE),
   `row_kind` (`follow_account`, `playlist_clip`, `history`, `queue`,
   `now_playing`, `snapshot_clip`, `snapshot_playlist_member`, `subscription`),
   `legacy_id`, `context` jsonb (ids and positions only: playlist id,
   list position, playback position, order date, medium),
   `status` (`unresolved`, `resolved`, `dropped`), `reason` text, timestamps.
   Unique `(account_id, row_kind, legacy_id)`. Then `make db_regen_linear_baseline`.
   Keep `legacy_id_map` for the id crosswalk: the copy upserts `mapped` rows for
   podcast, episode, mediaRef, playlist, and user ids it resolved.
2. `LocalCatalog` gains `settledChannelIdTexts` computed with 01's rule
   (finished, or retries used up). Rename today's set to
   `attemptedChannelIdTexts` (finished or failed, not running). Clips and playlist
   members use attempted (they archive and revive). Playback uses settled: an
   unsettled feed's playback row is `waiting` and written to `legacy_pending_row`,
   not dropped.
3. In `copyAccountLibraryApply.ts`, each skip writes a `legacy_pending_row` in the
   same transaction. Snapshot rows record `resolved` with reason `snapshot` so
   03 can re-attach them.
4. The dry run report adds a `pending` count per group.

## Files

- infra/k8s/base/ops/source/database/linear-migrations/app/<next>_legacy_pending_row.sql
- infra/k8s/base/ops/source/database/... (regenerated 0004 baseline)
- apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.ts
- apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.test.ts
- apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts
- apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts
- apps/workers/src/commands/orm/v4Catalog/seedAccountCatalog.ts
- apps/workers/src/commands/orm/v4Catalog/seedAccountCatalogLib.test.ts
- docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md

## Tests

- Lib: playback on an attempted but unsettled feed is `waiting`; on a settled
  feed with no item, `dropped`; clips on an attempted feed archive.
- Apply is covered by the rehearsal recopy (counts in checklist 15).

## Release scratchpad

workers: the v4 library copy records rows it could not finish so a later
replay can complete them. Migration adds `legacy_pending_row`.
