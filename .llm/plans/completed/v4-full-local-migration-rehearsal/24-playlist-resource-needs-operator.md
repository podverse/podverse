**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Playlist resource limit

`enforce_playlist_resource_limit` in `infra/k8s/base/ops/source/database/linear-migrations/app/0001_app_schema.sql` raises when a playlist already has `10000` `playlist_resource` rows. The constant in the function is `max_resources := 10000`. The trigger is `BEFORE INSERT`, so the 10000th insert sees count `9999` and succeeds, and the 10001st sees count `10000` and raises.

There is no per-account override for this cap. A playlist that would pass `10000` resources is not copied. The account's other playlists still copy. Nothing is truncated to `10000`.

Do not add a column or a linear migration. Do not change the trigger. Do not edit the queue trigger. Plan 21 leaves queue, history, and now playing unchecked against `10000` because that trigger deletes a row instead of raising.

## Rows

R25

## Runs after

23

## Files

- apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.ts
- apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.test.ts
- apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts
- apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts

## Tests

Unit tests in `copyAccountLibraryLib.test.ts`, `describe('playlist resource limit')`, for `playlistRowsSubjectToResourceLimit`. No database test, no API integration test, no Playwright spec.

## Release scratchpad

```markdown
## v4 library copy leaves an over-limit playlist for an operator

- Surfaces: workers
- Change: `v4CopyAccountLibrary` skips a playlist that would hold more than 10000 resources, reports that playlist as needs_operator, and copies the account's other playlists. It does not stop at 10000 members.
- Who notices: operators running the local v4 library copy
- Operator steps: none
```

## Count

Move `orderedMembers` from `copyAccountLibraryApply.ts` into `copyAccountLibraryLib.ts` and export it. `writePlaylists` calls that export. Do not keep a second copy of the order logic.

`orderedMembers` already drops a blank id, drops an `orderIds` entry that is not an episode or a clip on that playlist, and drops duplicates. Keep that behavior.

Add:

```typescript
export const PLAYLIST_RESOURCE_LIMIT = 10000;

export function playlistRowsSubjectToResourceLimit(
  playlist: V4PlaylistKey,
  mediaRefs: ReadonlyMap<string, { official: boolean }>
): number;
```

The count is the number of `orderedMembers(playlist)` entries that `writePlaylistMember` would either insert or record as pending:

- A clip whose media ref is missing, or whose media ref is `official`, is not counted. `writePlaylistMember` returns false and does not record pending for those.
- Every other ordered member is counted, including a clip that is not local yet and an episode that is waiting or gone. Replay would insert the waiting ones later. Counting only the rows inserted on this pass would let replay hit the trigger.

`count > PLAYLIST_RESOURCE_LIMIT` means the playlist is over the cap. `count === 10000` is copied. `count === 10001` is not.

A comment on `PLAYLIST_RESOURCE_LIMIT` may say it matches the playlist resource trigger, which rejects the insert that would make row 10001. Do not cite a plan or a migration filename in the comment. The implementer reads the trigger; the comment states the limit.

## Unit cases

Build a `V4PlaylistKey` with `episodeIds`, `mediaRefIds`, and `orderIds`.

- 10000 episode ids, no clips: count `10000`.
- 10001 episode ids: count `10001`.
- Duplicate episode ids count once.
- An `orderIds` entry that is not in `episodeIds` or `mediaRefIds` is not counted.
- A clip id whose media ref is `{ official: true }` is not counted.
- A clip id with no media ref is not counted.
- A clip id whose media ref is `{ official: false }` is counted.
- One playlist with 10001 episodes does not change the count of a second playlist fixture passed separately. The function takes one playlist.

## Skip inside the playlist group

`copyPlaylistsGroup` walks `snapshot.playlists` in one transaction (plan 21). For each playlist, before the `INSERT INTO playlist`:

- Let `over` be `playlistRowsSubjectToResourceLimit(playlist, mediaRefs) > PLAYLIST_RESOURCE_LIMIT`.
- When `over` is true, do not insert the playlist, do not insert its members, and do not add its pending rows. Append `playlist.id` to the list this group returns. Continue with the next playlist.
- When `over` is false, keep today's insert, including `ON CONFLICT DO NOTHING` from plan 21.

Do not insert the first `10000` members. Do not delete members to get under the limit.

The playlist id on the result is the v4 `playlist.id` string already used as `id_text`. Do not add the title or the description.

This skip is not a thrown error. The transaction still commits the playlists that are at or under the limit. The caller:

- Sets `playlistsOverLimit` on the apply result to those ids. Compute the list from the snapshot even when the playlist group throws, so a constraint error on another playlist does not hide the over-limit ids. When the group throws, plan 21 rolls the playlist writes back; the over-limit ids were never inserted. On retry the under-limit playlists copy again and the over-limit ids are skipped again.
- Appends `'playlists'` to `needsOperatorGroups` when the list is non-empty. That keeps `v4_library_copied_at` null, so a later call can copy the playlist if its v4 member count is then at or under `10000`. There is no column that records a raise. A rerun with the same snapshot skips the same playlist.
- Does not push a `LibraryGroupError` for this skip. A real throw in the group is still `{ group: 'playlists', class: libraryCopyErrorClass(error) }` from plan 21, including `cap_refused` if the trigger fires because the count and the trigger disagree.

## Result the command logs

Add to `ApplyLibraryCopyResult`:

```typescript
playlistsOverLimit: string[];
```

`logFinished` spreads `apply`. The ids are the same kind of public id the command already logs as `v4Id`. Do not log titles.

On `dry_run`, set `playlistsOverLimit` from the snapshot with the same function and write nothing. Put it on the `dry_run` variant beside `addByRssCap` and `directoryFollowCap`. On `apply`, it lives only inside `ApplyLibraryCopyResult`.

Append to `V4_COPY_ACCOUNT_LIBRARY_HELP`:

```text
A playlist that would hold more than 10000 resources is not copied and is
reported needs_operator. Other playlists on that account still copy. The copy
does not keep the first 10000 members.
```

## Final result shape

After this plan, `v4CopyAccountLibrary` returns:

```typescript
export type V4LibraryCommandResult =
  | { action: 'help' }
  | { action: 'skip_missing_account'; v4Id: string }
  | { action: 'skip_already_copied'; v4Id: string }
  | {
      action: 'dry_run';
      v4Id: string;
      report: LibraryCopyReport;
      addByRssCap: AddByRssCap;
      directoryFollowCap: DirectoryFollowCap;
      playlistsOverLimit: string[];
    }
  | {
      action: 'apply';
      v4Id: string;
      report: LibraryCopyReport;
      apply: ApplyLibraryCopyResult;
    };
```

`ApplyLibraryCopyResult` carries the original counts, `groupErrors`, `needsOperatorGroups`, `libraryCopiedAtSet`, `addByRssCap`, `directoryFollowCap`, and `playlistsOverLimit`. The cap fields are not repeated on the `apply` variant.

`AddByRssCap` is `{ count: number; action: 'copy' | 'needs_operator' | 'membership_status_missing'; writeTier: number | null }`.

`DirectoryFollowCap` is `{ count: number; action: 'copy' | 'needs_operator'; decision: MigrationCapDecision }`.

`needsOperatorGroups` may contain `'add_by_rss'`, `'directory_follow'`, and `'playlists'`, independently. `groupErrors` is only for a thrown refusal. Both can be non-empty on one account. `libraryCopiedAtSet` is false when either list is non-empty.

Area H calls `v4CopyAccountLibrary` and does not edit these files. This is the result it reads.

## Out of scope

Do not change Add by RSS tier SQL or the directory-follow log. Do not edit `0001_app_schema.sql` or any later migration. Do not pre-check `queue_resource`.
