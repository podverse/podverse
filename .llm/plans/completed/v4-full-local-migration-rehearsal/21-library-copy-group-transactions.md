**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Library copy group transactions

`applyLibraryCopy` in `copyAccountLibraryApply.ts` writes one library in one transaction and sets `account.v4_library_copied_at` at the end. A refusal from a constraint or trigger rolls the whole library back, and the thrown error leaves the worker command.

Split that write into one transaction per group. A refusal rolls back only that group, is returned as a class, and the other groups stay committed. A second call is safe: inserts that already exist do not throw, and the timestamp is set only when every group committed and none was left for an operator.

This plan does not choose cap tiers and does not skip a group for a count. Plans 22–24 add those skips inside the group functions this plan creates. Do not add a linear migration. Do not edit the queue or playlist triggers.

## Rows

R26

## Runs after

20

## Files

- apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.ts
- apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.test.ts
- apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts
- apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts

## Tests

Unit tests in `copyAccountLibraryLib.test.ts` for `libraryCopyErrorClass` and `shouldSetLibraryCopiedAt`, in `describe('library copy group errors')`. No database test, no API integration test, no Playwright spec. The workers library copy has no database harness. The SQL text below is the write. Do not add a Postgres test in this plan.

## Release scratchpad

```markdown
## v4 library copy keeps a failed group from rolling back the others

- Surfaces: workers
- Change: `v4CopyAccountLibrary` commits directory follows, Add by RSS, archived items, clips, playlists, and playback separately. A database refusal in one group is returned as an error class and the other groups stay written. `v4_library_copied_at` is set only when every group committed and none was left for an operator.
- Who notices: operators running the local v4 library copy
- Operator steps: none
```

## What stays a throw

These still throw, before any group transaction, the same way the command fails today:

- Missing `--v4-id`, an id that is not 7–15 characters, missing `V4_DATABASE_URL`, `assertLocalDatabase` when not a dry run.
- `readV4Snapshot` and `readLocalCatalog` failures. Keep the catalog wrapper `Could not read the v5 library index.`
- Missing `item_flag_status` or `sharable_status` rows. Keep the error text `Missing item status or sharable status rows.` Load those four ids once, with `query` on the data source, before the groups. Do not open a writing transaction for that read.

A group failure does not throw out of `applyLibraryCopy` or `v4CopyAccountLibrary`.

## Error class

Add to `copyAccountLibraryLib.ts`:

```typescript
export type LibraryCopyGroup =
  | 'directory_follow'
  | 'add_by_rss'
  | 'archived_items'
  | 'clips'
  | 'playlists'
  | 'playback'
  | 'closeout';

export type LibraryGroupError = {
  group: LibraryCopyGroup;
  class: string;
};

export function libraryCopyErrorClass(error: unknown): string;

export function shouldSetLibraryCopiedAt(input: {
  groupErrors: readonly { class: string }[];
  needsOperatorGroups: readonly string[];
}): boolean;
```

`shouldSetLibraryCopiedAt` is true only when `groupErrors.length === 0` and `needsOperatorGroups.length === 0`. This plan always passes `needsOperatorGroups: []`. Later plans push group names. Do not treat `needs_operator` as a `LibraryGroupError`. A refusal and an operator hold can both be present.

`libraryCopyErrorClass` reads only `code` and `constraint` from a thrown value. It does not read `message`, `detail`, or `where`. Those can contain a feed URL.

- When `constraint` is a non-empty string, return `db_constraint:<constraint>`.
- Else when `code` is `P0001`, return `cap_refused`. That is the playlist trigger's `RAISE EXCEPTION` in `enforce_playlist_resource_limit`. This plan does not pre-check playlists. Plan 24 does. If the trigger still fires, this class is the record.
- Else when `code` is a non-empty string, return `db_constraint:<code>`.
- Else when the value is an `Error`, return `unexpected:<error.name>`.
- Else return `unexpected:unknown`.

Do not include the raw message in the class. `LibraryGroupError` has no message field.

Unit cases:

- `{ constraint: 'playlist_resource_playlist_id_item_id_key', code: '23505', message: 'https://example.com/feed' }` returns `db_constraint:playlist_resource_playlist_id_item_id_key`. The assertion does not expect the URL.
- `{ code: 'P0001', message: 'Playlist 9 cannot have more than 10000 resources' }` returns `cap_refused`.
- `{ code: '23503' }` returns `db_constraint:23503`.
- `new TypeError('x')` returns `unexpected:TypeError`.
- `'nope'` returns `unexpected:unknown`.

`shouldSetLibraryCopiedAt`: empty errors and empty operator groups is true. One error is false. One operator group is false. Both is false.

## Group order

`applyLibraryCopy` runs these, in this order, each in its own `dataSource.transaction`. Do not wrap them in an outer transaction.

1. `directory_follow` — today's `writeFollows` except the `snapshot.addByRssUrls` loop. Channel follows, playlist follows, account follows, and that group's `PendingRows` (`subscription`, `follow_account`).
2. `add_by_rss` — the `snapshot.addByRssUrls` loop only. No pending rows today. Leave it that way.
3. `archived_items` — `writeArchivedItems`.
4. `clips` — `writeClips`, including that group's pending rows.
5. `playlists` — `writePlaylists`, including that group's pending rows.
6. `playback` — `writePlayback`, including that group's pending rows.
7. `closeout` — `resolvedMappings` and `writeLegacyIdMap`, then the timestamp when `shouldSetLibraryCopiedAt` is true.

Name the functions `copyDirectoryFollowGroup`, `copyAddByRssGroup`, `copyArchivedItemsGroup`, `copyClipsGroup`, `copyPlaylistsGroup`, `copyPlaybackGroup`, and `closeLibraryCopy`. Delete the `writeFollows` wrapper after the two follow functions replace it. Keep `writeArchivedItems`, `writeClips`, `writePlaylists`, `writePlayback`, `writePendingRows`, and `writeLegacyIdMap`.

`runLibraryGroup(group, groupErrors, work, empty)` awaits `work`. On throw, push `{ group, class: libraryCopyErrorClass(error) }` and return `empty`. It does not open a transaction. The group function does.

Pending rows are written inside that group's transaction with the existing `writePendingRows`. Each group builds its own `PendingRows`. Do not share one `PendingRows` across groups. A rolled-back group writes no pending rows.

Legacy map rows are written only in `closeout`, from the outputs of groups that committed. Do not write `legacy_id_map` inside a group.

Shared maps:

- Load `channelIds` once before the groups, with the existing `loadIds` query. Pass that map into every group. Groups do not add channels.
- `itemIds` and `clipIds` start empty. Pass a new `Map` copied from the shared map into the transaction. `writeArchivedItems` and `writeClips` mutate the map they are given. Replace the shared map with the returned map only when `runLibraryGroup` returns the success value. On failure the shared map stays as it was before that group, so later groups do not keep ids whose insert rolled back.
- `followedAccounts` and `playlistIdTexts` follow the same rule: the group returns them, and the caller keeps them only on success.

`closeout` calls the existing `resolvedMappings` with those successful outputs, the snapshot, the catalog, and `channelIds`. Podcast mappings still come from the snapshot and the local channel map, including when directory follows were not written. That matches today's `resolvedMappings` loop over `snapshot.podcasts`.

Then:

```sql
UPDATE account
SET v4_library_copied_at = NOW()
WHERE id = $1 AND v4_library_copied_at IS NULL
```

Run that update only when `shouldSetLibraryCopiedAt` is true. When it is false, still write the legacy map for the groups that committed, and leave the timestamp null. A later call of this command can run again. `v4CopyAccountLibrary` skips only when the timestamp is already set (`skip_already_copied`).

Set `libraryCopiedAtSet` from the transaction callback's return value after the promise resolves. If `closeout` throws, push `{ group: 'closeout', class: libraryCopyErrorClass(error) }`, leave `libraryCopiedAtSet` false, and leave `legacyIdsMapped` at `0`.

Return this from `applyLibraryCopy`. Keep the existing count fields, filled from successful groups only (a failed group contributes `0` and empty id lists):

```typescript
export type ApplyLibraryCopyResult = {
  archivedItems: number;
  clips: number;
  playlistMembers: number;
  playback: number;
  pendingRows: number;
  legacyIdsMapped: number;
  groupErrors: LibraryGroupError[];
  needsOperatorGroups: string[];
  libraryCopiedAtSet: boolean;
};
```

`pendingRows` is the sum of pending rows written by groups that committed. `needsOperatorGroups` is `[]` in this plan.

The existing `const db = manager as Queryable` at a transaction boundary stays. One assertion per group callback, same as today's single assertion. Do not add assertions in the decision code.

## Idempotent inserts

A retry after another group failed will run the successful groups again.

- Follow inserts already use `ON CONFLICT DO NOTHING`. Leave them.
- `writeClips` uses `ON CONFLICT (id_text) DO NOTHING` and today ignores a missing `RETURNING` id. When the insert returns no id, `SELECT id FROM clip WHERE id_text = $1` and, when that id is a number, store it in `clipIds`. Copy the pattern `writeArchivedItems` already uses for `item`. Without this, a retry treats an existing clip as missing and records a pending playlist member instead of the member.
- In `writePlaylistMember`, add `ON CONFLICT DO NOTHING` to all three `INSERT INTO playlist_resource` statements (clip, snapshot `removed_source`, and item). Do not add a column list to the conflict target. Any unique violation on that insert is "already present". A check-constraint failure still throws.
- In `insertPlayback`, add `ON CONFLICT DO NOTHING` to the `INSERT INTO queue_resource`. `queueFor` already selects an existing queue by `account_id` and `medium_id` before insert. Leave that function as it is.

Do not change episode decisions, pending reasons, drop rules, or the queue trigger. `enforce_queue_resource_limit` deletes an old row instead of raising once a queue has `10000` resources. Queue, history, and now playing are not pre-checked against that number. Do not skip them. An insert that throws is still a `playback` group error. Area C measures whether the trigger removed a row.

## Command result

`v4CopyAccountLibrary` in `copyAccountLibrary.ts` currently returns void and logs. Return this and still log it through `logFinished`. Do not edit `apps/workers/src/commands/index.ts` or `packages/worker-commands/src/registry.ts`. The command map is cast to `(args: CommandLineArgs) => void` and ignores the return.

```typescript
export type V4LibraryCommandResult =
  | { action: 'help' }
  | { action: 'skip_missing_account'; v4Id: string }
  | { action: 'skip_already_copied'; v4Id: string }
  | { action: 'dry_run'; v4Id: string; report: LibraryCopyReport }
  | {
      action: 'apply';
      v4Id: string;
      report: LibraryCopyReport;
      apply: ApplyLibraryCopyResult;
    };
```

`help`, the two skips, and `dry_run` return before `applyLibraryCopy`. `dry_run` still writes nothing, including the timestamp. `logFinished` already spreads `report` and `apply`. Spreading `apply` logs `groupErrors` and `needsOperatorGroups`. Those objects contain a group name and a class, or a group name. They must not gain a message, a URL, a title, or an email.

Append this to `V4_COPY_ACCOUNT_LIBRARY_HELP`, after the sentence about `legacy_pending_row`:

```text
Each group commits on its own: directory follows, Add by RSS, archived items,
clips, playlists, and playback. A refusal in one group rolls that group back
and the other groups stay. v4_library_copied_at is set only when every group
committed and none was left for an operator.
```

## Out of scope

Do not call `decideMigrationCap` or skip a group because of a count. Do not update `max_add_by_rss_feeds`. Do not add a status table or a migration. Do not edit doc 16 or the worker registry.
