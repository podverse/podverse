# 04 — A playlist follow waits for its playlist instead of being dropped

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R4

## Runs after

03 (shares `copyAccountLibraryApply.ts`, `verifyAccount.ts`). Plan 07 owns migration `0013`;
this plan's migration is `0014`.

## Why

The directory group of the copy (`copyAccountLibraryApply.ts`, the loop over
`snapshot.playlistFollowIds` that inserts into `account_following_playlist`) skips a playlist that
is not in v5 yet and records nothing. A playlist is in v5 only after its owner's library is
copied, so in a full migration a follower copied before the owner loses the follow
(00-FINDINGS F4). Full v4 has 32 playlist follows.

## Decision

New pending row kind `follow_playlist`. `legacy_id` is the v4 playlist id. The copy writes it as
`unresolved` with reason `waiting_playlist` when the playlist is missing. Replay writes the follow
once a playlist with that `id_text` exists and marks the row `resolved`. It is never dropped.
Playlists keep their v4 id as `id_text`, so no map lookup is needed.

## Files

- `infra/k8s/base/ops/source/database/linear-migrations/app/0014_legacy_pending_row_follow_playlist.sql` (new)
- `infra/k8s/base/db/source/bootstrap/0004_app_linear_baseline.sql.gz` (generated)
- `infra/k8s/base/db/source/bootstrap/0005_management_linear_baseline.sql.gz` (generated)
- `infra/k8s/base/api/source/api.env` (`API_EXPECTED_MIGRATION_FILENAME`)
- `infra/k8s/base/ops/kustomization.yaml` (`API_EXPECTED_MIGRATION_FILENAME`)
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.ts` (`PendingRowKind`)
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts`
- `apps/workers/src/commands/orm/v4Library/replayLegacyRows.ts`
- `apps/workers/src/commands/orm/v4Library/replayLegacyRowsLib.ts`
- `apps/workers/src/commands/orm/v4Library/replayLegacyRowsLib.test.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.test.ts`
- `release-notes/scratchpad.md`

## 1. Migration

`0014_legacy_pending_row_follow_playlist.sql`, greenfield style (**linear-sql-greenfield-only**):

```sql
-- follow_playlist waits on a v4 playlist id until that playlist's owner is copied.

ALTER TABLE public.legacy_pending_row
  DROP CONSTRAINT legacy_pending_row_kind_check;

ALTER TABLE public.legacy_pending_row
  ADD CONSTRAINT legacy_pending_row_kind_check
  CHECK (row_kind IN (
    'follow_account',
    'follow_playlist',
    'playlist_clip',
    'history',
    'queue',
    'now_playing',
    'snapshot_clip',
    'snapshot_playlist_member',
    'subscription'
  ));
```

Then set `API_EXPECTED_MIGRATION_FILENAME=0014_legacy_pending_row_follow_playlist.sql` in both
files (**migration-readiness-marker-sync**), run `make db_regen_linear_baseline`, then
`make db_verify_linear_baseline` (generators, allowed).

## 2. Copy

- Add `'follow_playlist'` to `PendingRowKind` in `copyAccountLibraryLib.ts`.
- In the playlist follow loop, when `playlistIds.get(playlistIdText)` is undefined, add a pending
  row `{ kind: 'follow_playlist', legacyId: playlistIdText.trim(), status: 'unresolved', reason:
  'waiting_playlist', context: {} }` to that group's `PendingRows` and make sure the group writes
  its pending rows (follow the `follow_account` branch right below it, which already does this).
  Skip blank ids.
- Add `follow_playlist` to the dry-run classification beside `follow_account` so dry-run counts
  match the copy (find the `follow_account` case in `copyAccountLibraryLib.ts`).

## 3. Replay

- `replayLegacyRowsLib.ts`: add `'follow_playlist'` to the replay kinds list next to
  `'follow_account'`, and to the help text in `replayLegacyRows.ts`:
  `follow_playlist           follows once the playlist's owner is copied`.
- `replayLegacyRows.ts`: add a `case 'follow_playlist':` beside `case 'follow_account':`. Look up
  `SELECT id FROM playlist WHERE id_text = $1`. Found: `INSERT INTO account_following_playlist
  (account_id, playlist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, mark the row `resolved`
  (reason null). Not found: leave it `unresolved` and touch `updated_at` the way the
  `follow_account` case does.
- The follow cap applies the same way it does for `follow_account` in replay; reuse that check.

## 4. Verify

In `verifyAccount.ts` `unaccountedFollows`, the `followsPlaylist` check also passes when
`pendingCovers(input.pendingRows, ['follow_playlist'], id, false)`.

## Tests

- `replayLegacyRowsLib.test.ts`: `follow_playlist` is a replay kind.
- `verifyAccount.test.ts`: a v4 playlist follow with an unresolved `follow_playlist` pending row
  passes; with neither a follow nor a pending row it fails as `unaccounted`.

## Release scratchpad

```markdown
## v4 playlist follows survive copy order

- Surfaces: workers (v4 migration), database
- Change: a v4 playlist follow whose playlist is not copied yet is recorded and finished by replay instead of being skipped. Migration `0014` adds the `follow_playlist` pending row kind.
- Who notices: v4 users who follow another user's playlist
- Operator steps: apply linear migrations
```
