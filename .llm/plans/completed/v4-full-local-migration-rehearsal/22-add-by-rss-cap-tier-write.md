**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Add by RSS cap tier write

`copyAddByRssGroup` from plan 21 inserts every `snapshot.addByRssUrls` row and does not read `max_add_by_rss_feeds`. This plan, in that same transaction, writes the tier or sets the column to null before those inserts, or copies no Add by RSS rows.

The column already exists. Do not add a migration, a check constraint, or a tier list in the database. Do not edit `AccountMembershipStatusService`. That service can clear overrides when the membership id changes. Use the two SQL statements in this plan and no other statement that touches `max_add_by_rss_feeds`.

The API already treats the column as the ceiling: `resolveAccountEntitlements` in `packages/helpers/src/lib/accountTrust.ts` uses `overrides.max_add_by_rss_feeds` when it is non-null, and `removeRSSChannel` in `apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts` does not change the column. Removing a feed does not lower the tier. This plan does not add a shrink path and does not edit that controller or `accountFollowingAddByRSSChannel.ts`.

The direct `INSERT` in the copy does not pass through that API check. There is no trigger on `account_following_add_by_rss_channel`. The tier has to be stored so a later add is refused at the tier. The inserts themselves are not refused by the database.

## Rows

R10, R11, R18, R19, R21, R22, R23, R60

## Runs after

21

## Files

- apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts
- apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts

## Tests

No new test file. `addByRssCopyPlan`, `countAddByRssFeeds`, and `addByRssFeedUrlForCopy` are unit-tested by plan 20 in `copyAccountLibraryLib.test.ts`, including `clearStored: true` when the count is at or under 100 and the stored number is below that count, and `clearStored: false` when the stored number already covers the count. This plan only calls them. No API integration test and no Playwright spec: the HTTP cap check already exists and this change does not add a route.

The skipped database test is each `UPDATE`. Both statements are fixed in this plan. A mistyped `WHERE` would be the remaining risk. Do not add a Postgres harness in this plan.

## Release scratchpad

```markdown
## v4 library copy writes an Add by RSS tier

- Surfaces: workers
- Change: `v4CopyAccountLibrary` sets `max_add_by_rss_feeds` to the smallest tier that covers that account's Add by RSS count (200, 300, 400, 500, 1000, or 10000) when the count is over 100 and the stored number is missing or below the count, then copies the feeds. When the count is 100 or fewer and the stored number is below that count, the column is set to null and 100 is not written, and the feeds still copy. A stored number that already covers the count stays, including a number above 10000, and the feeds copy. A count past 10000 with no covering stored number copies no Add by RSS feeds and reports needs_operator. The copy never writes a number above 10000.
- Who notices: operators running the local v4 library copy
- Operator steps: none
```

## Count

Inside `copyAddByRssGroup`, the count is `countAddByRssFeeds(snapshot.addByRssUrls)` from `copyAccountLibraryLib.ts`. That is the snapshot `readV4Snapshot` already loaded from `users.addByRSSPodcastFeedUrls`. Do not query v4 again. Do not keep a list of account ids.

The insert loop must call `addByRssFeedUrlForCopy` and skip `null`. Delete the local `limit(canonicalAddByRSSFeedUrl(url) ?? url, URL_LIMIT)` expression in that loop so the count and the insert cannot drift. Keep `ON CONFLICT DO NOTHING`.

## Read and decide inside the transaction

At the start of the `copyAddByRssGroup` transaction, before any insert:

```sql
SELECT max_add_by_rss_feeds
FROM account_membership_status
WHERE account_id = $1
FOR UPDATE
```

- No row: `statusRowExists` false, `stored` null.
- A row whose `max_add_by_rss_feeds` is null: `statusRowExists` true, `stored` null.
- A row with a number: `statusRowExists` true, `stored` that number.

Pass those into `addByRssCopyPlan(count, stored, statusRowExists)` from plan 20. Do not duplicate the tier table in this file.

Then:

| action | what the transaction does |
| --- | --- |
| `needs_operator` | Return without an insert and without an `UPDATE`. The caller appends `'add_by_rss'` to `needsOperatorGroups`. It does not push a `LibraryGroupError`. Do not set the column to null. |
| `membership_status_missing` | Return without an insert and without an `UPDATE`. The caller pushes `{ group: 'add_by_rss', class: 'membership_status_missing' }`. Do not insert a membership-status row. Identity seed creates that row. |
| `copy`, `clearStored === true` | Run the null statement below. Then insert the feed rows. `writeTier` is null. Do not write `100`. |
| `copy`, `writeTier === null`, `clearStored === false` | Insert the feed rows. Do not `UPDATE` the column. |
| `copy` and `writeTier` is a number | `clearStored` is false. Run the tier statement below. Then insert the feed rows. |

`needs_operator` and `membership_status_missing` still open this group's transaction so the `SELECT ... FOR UPDATE` is the read, and they return before any write. An empty transaction commit is fine. Do not throw. `runLibraryGroup` must see a normal return, not a classified exception, for these two outcomes.

The clear path and the tier path stay in that same transaction: column statement, then feed inserts, then commit. Do not return before those inserts.

## Tier update

Only when `writeTier` is a number. `writeTier` is one of `200`, `300`, `400`, `500`, `1000`, `10000`. Do not pass any other number. Do not pass null to this statement. Do not write a number above `10000`.

```sql
UPDATE account_membership_status
SET max_add_by_rss_feeds = $2
WHERE account_id = $1
  AND (max_add_by_rss_feeds IS NULL OR max_add_by_rss_feeds < $2)
RETURNING account_id
```

`$2` is `writeTier`. The `WHERE` leaves a stored value greater than or equal to that tier as stored. This statement does not set the column to null.

When `RETURNING` is empty, insert nothing and return `membership_status_missing`. Do not run the insert in that same call.

## Null update

Only when `clearStored` is true. That is only when the count is at or under 100 and the stored number is below the count. Do not run this statement when `clearStored` is false. Do not run it when the count is over 100. Do not set the column to `100`.

```sql
UPDATE account_membership_status
SET max_add_by_rss_feeds = NULL
WHERE account_id = $1
  AND max_add_by_rss_feeds IS NOT NULL
  AND max_add_by_rss_feeds <= $2
  AND max_add_by_rss_feeds < $3
RETURNING account_id
```

`$2` is `DEFAULT_MAX_ADD_BY_RSS_FEEDS` (`100`). `$3` is the count. A stored number greater than or equal to the count does not match, so this statement does not clear a number that already covers the count. A stored number above `100` does not match.

When `RETURNING` is empty, the column was not set to null. Insert the feed rows anyway. Do not return `membership_status_missing` from this statement.

## Result the command logs

Add this field to `ApplyLibraryCopyResult`:

```typescript
addByRssCap: {
  count: number;
  action: 'copy' | 'needs_operator' | 'membership_status_missing';
  writeTier: number | null;
};
```

`writeTier` is null except when this call's plan said to write a tier. When the action is `copy` and `writeTier` is null, the log does not claim a number was written. A clear also logs `writeTier` null. Do not add `clearStored` to `addByRssCap`. Plan 24's `AddByRssCap` type stays `{ count, action, writeTier }`.

`logFinished` already spreads `apply`. Do not add a second log line. Do not put a feed URL on `addByRssCap`.

On `dry_run`, read the same column with a `SELECT` and no `FOR UPDATE` and no transaction. Put `addByRssCap` on the `dry_run` variant of `V4LibraryCommandResult`, next to `report`, and pass it to `logFinished`. Dry run writes nothing. On `apply`, `addByRssCap` lives only inside `ApplyLibraryCopyResult`. Do not copy it onto the `apply` variant beside `apply`.

`shouldSetLibraryCopiedAt` already returns false when `needsOperatorGroups` is non-empty. Append `'add_by_rss'` only for action `needs_operator`. `membership_status_missing` is a group error, which already blocks the timestamp.

Append to `V4_COPY_ACCOUNT_LIBRARY_HELP`:

```text
Add by RSS over the default writes the smallest tier on max_add_by_rss_feeds
before the feed rows when no stored number already covers the count. At or
under the default, a stored number below the count is set to null and 100 is
not written. A stored number that already covers the count is left unchanged,
including a number above 10000. Past 10000, when no stored number covers the
count, the copy writes no Add by RSS rows and reports needs_operator. The copy
never writes a number above 10000.
```

## Out of scope

Do not change directory follows, playlists, or playback. Do not edit the management screen, OpenAPI, or mobile DTOs. The entitlement field already exists. Do not edit `account-add-by-rss-cap-500.md`.
