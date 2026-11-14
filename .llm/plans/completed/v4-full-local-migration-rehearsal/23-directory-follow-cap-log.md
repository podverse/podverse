**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Directory-follow tier log

Directory follow is subscribed channels, followed playlists, and followed accounts, one total. The cap is not shipped. There is no column. This plan logs the tier `directoryFollowCopyPlan` would write, and it copies no directory-follow rows when the count is past `10000`.

Do not add a column, a migration, a backfill, or a write of any follow-limit number. When that cap ships later, it assigns the same tier to every existing account already over `500`. That assignment is not this plan. Do not edit `.llm/plans/active/account-follow-cap-5000.md`.

## Rows

R20, R22, R24

## Runs after

22

## Files

- apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts
- apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts

## Tests

No new tests. `directoryFollowCopyPlan` and `countDirectoryFollows` are unit-tested by plan 20. This plan calls them. No API integration test and no Playwright spec.

## Release scratchpad

```markdown
## v4 library copy logs the unshipped directory-follow tier

- Surfaces: workers
- Change: `v4CopyAccountLibrary` logs the directory-follow tier it would store (1000, 2000, 3000, 4000, 5000, or 10000) and does not write a column. A count past 10000 copies no directory follows and reports needs_operator. A count of 500 or fewer is copied with no tier.
- Who notices: operators running the local v4 library copy
- Operator steps: none
```

## Count and plan

Compute this before `dataSource.transaction` inside `copyDirectoryFollowGroup`. When the action is `needs_operator`, do not open the transaction.

```typescript
const count = countDirectoryFollows({
  podcastIds: snapshot.podcastIds,
  playlistFollowIds: snapshot.playlistFollowIds,
  userFollowIds: snapshot.userFollowIds,
});
const plan = directoryFollowCopyPlan(count);
```

Those helpers are the exports from `copyAccountLibraryLib.ts` in plan 20. The three arrays are already on the snapshot from `readV4Snapshot` (`subscribedPodcastIds`, `subscribedPlaylistIds`, `subscribedUserIds`). Do not query v4 again.

`plan.action === 'needs_operator'`: return before `write` of channel follows, playlist follows, account follows, and before that group's `PendingRows`. Do not insert a partial list of the follows that fit under `10000`. The caller appends `'directory_follow'` to `needsOperatorGroups`. It does not push a `LibraryGroupError`.

`plan.action === 'copy'`: run the group as plan 21 left it, including pending rows for subscriptions and account follows that do not resolve yet. `plan.decision` may be `default` or a tier. Nothing in either case is written to the database for this cap.

There is no stored override to honor. A count past `10000` stays `needs_operator` on every rerun until a later change adds a column. This plan does not add that column.

## Result the command logs

Add to `ApplyLibraryCopyResult`, next to `addByRssCap` from plan 22:

```typescript
directoryFollowCap: {
  count: number;
  action: 'copy' | 'needs_operator';
  decision: MigrationCapDecision;
};
```

`decision` is the plan-20 outcome (`default`, `tier` plus the number, or `needs_operator`). The log line is the existing `logFinished` spread. Do not add a logger call. Do not put follow ids, titles, or emails on this object.

On `dry_run`, compute the same object from the snapshot. No database read is required, because there is no column. Put `directoryFollowCap` on the `dry_run` variant beside `addByRssCap`. On `apply`, it lives only inside `ApplyLibraryCopyResult`. Dry run writes nothing.

`closeout` may still write podcast `legacy_id_map` rows from the snapshot when this group is skipped. That is plan 21's `resolvedMappings` loop. Do not remove it. It does not insert follow rows.

Append to `V4_COPY_ACCOUNT_LIBRARY_HELP`:

```text
Directory follows over the default are logged with the tier that would be
stored. No directory-follow column is written. Past 10000 copies no directory
follows and reports needs_operator. The account's other groups still copy.
```

## Out of scope

Do not change the Add by RSS update, playlists, or playback. Do not edit helpers, the ORM entity, SQL, or the follow services in `packages/orm/src/services/account/`.
