**Cursor model:** Opus 5.5 · **Reasoning:** medium

# 03 — Legacy replay pass

## Rows

Rows the copy recorded as unresolved are finished later.

## Runs after

01, 02

## Change

New worker command `v4ReplayLegacyRows` (`--dry-run`, `--limit`, optional
`--v4-id`). It reads `legacy_pending_row` with status `unresolved`, oldest first,
and for each:

- `follow_account`: the followed account now exists → insert
  `account_following_account`, mark `resolved`.
- `playlist_clip`: the clip now exists → append to the playlist at the end
  position, mark `resolved`.
- `history`, `queue`, `now_playing`: an Active item now matches (same match
  as `resolveItemId`) → insert with the recorded position, using the existing
  one-row-per-item collapse. Feed settled and still no item → `dropped`.
- `snapshot_clip`, `snapshot_playlist_member` (status `resolved`, reason
  `snapshot`): the show is now local → set `item_id` (create an Archived item when
  the episode is still missing), clear `removed_source` and `source_removed_at`.
- `subscription`: left alone until the not-seeded decision in
  [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) is made.

Each row is its own transaction, so one failure does not block the rest.
The command logs counts per kind and outcome only.

Trigger: run it from the same schedule as `scheduledJobsRunDue` during the
migration window, and once more after the forced migration copies every
account. It is not part of the ordinary scheduled jobs after v4 shuts down.

## Files

- apps/workers/src/commands/orm/v4Library/replayLegacyRows.ts
- apps/workers/src/commands/orm/v4Library/replayLegacyRowsLib.ts
- apps/workers/src/commands/orm/v4Library/replayLegacyRowsLib.test.ts
- apps/workers/src/index.ts
- apps/workers/package.json
- docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md
- docs/proposals/v4-to-v5-migration/15-near-term-rehearsal-checklist.md

## Tests

- Lib: each kind's resolve, keep, and drop decision; clips never drop.
- Rehearsal: seed one followed account locally, replay, and see the follow.

## Release scratchpad

workers: `v4ReplayLegacyRows` finishes follows, playlist clips, playback, and
snapshot re-attach that the one-time copy could not.
