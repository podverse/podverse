**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Library cap decisions

Pure functions that choose a cap from a count taken at copy time. No database write, no id list, and no linear migration. Later plans in this block call these functions. They do not re-decide the tiers.

The column `account_membership_status.max_add_by_rss_feeds` already exists (`packages/orm/src/entities/account/accountMembershipStatus.ts`, nullable integer, check allows null or a number >= 0). This plan does not add a column. Directory follow has no column. Do not add one.

## Rows

R10, R11, R18, R19, R20, R21, R22, R24, R60

## Runs after

none

## Files

- apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.ts
- apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.test.ts

## Tests

Unit tests in `copyAccountLibraryLib.test.ts`, in a new `describe('migration cap')` beside `describe('classifyLibraryCopy')`. Table-driven cases below. No API integration test, no Playwright spec, no Maestro flow. This plan does not change a route or a screen.

## Release scratchpad

none

## Decisions to transcribe

Counts come from the snapshot `readV4Snapshot` already built in `copyAccountLibrary.ts`. No array of v4 ids. No example counts from the docs are inputs. `5215` and `4314` appear only as unit-test counts, not as accounts.

`decideMigrationCap` returns one of three outcomes:

- `default` when `count <= defaultLimit`. This outcome names no tier. A null column stays null, so a later change to the product default still applies. `addByRssCopyPlan` sets a stored number to null when the count is at or under 100 and that number is below the count. It does not write `100`.
- `tier` with the smallest listed tier `>= count`.
- `needs_operator` when no listed tier covers the count, or the tier that would cover it is greater than `10000`.

The function never returns a number that is not in that spec's `tiers`. It has no Unlimited outcome. The highest number it can return is `10000`.

Add by RSS spec, using `DEFAULT_MAX_ADD_BY_RSS_FEEDS` from `@podverse/helpers` (that constant is `100`):

- default limit: `DEFAULT_MAX_ADD_BY_RSS_FEEDS`
- tiers, ascending: `200`, `300`, `400`, `500`, `1000`, `10000`

Do not read `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS`. A deployment that changes that env still leaves a null column meaning the env default. This copy's "at or under the default" comparison is the constant `100`.

Directory-follow spec. This cap is not shipped, so the default is a local constant, not a helpers export and not a column:

- default limit: `500`
- tiers, ascending: `1000`, `2000`, `3000`, `4000`, `5000`, `10000`

`MIGRATION_CAP_MAX` is `10000`. Both lists end at that number. Do not sort the lists at runtime. They are already ascending. `Array.find` of the first tier `>= count` is the smallest tier.

## Symbols

Add these named exports to `copyAccountLibraryLib.ts`. Import `DEFAULT_MAX_ADD_BY_RSS_FEEDS` and `DATABASE_CONSTANTS` from `@podverse/helpers`. Import `canonicalAddByRSSFeedUrl` from `@podverse/helpers-validation`. Use `import type` only for types. No `any`. No type assertion.

```typescript
export const MIGRATION_CAP_MAX = 10000;

export const ADD_BY_RSS_CAP = {
  defaultLimit: DEFAULT_MAX_ADD_BY_RSS_FEEDS,
  tiers: [200, 300, 400, 500, 1000, 10000],
} as const;

export const DIRECTORY_FOLLOW_CAP = {
  defaultLimit: 500,
  tiers: [1000, 2000, 3000, 4000, 5000, 10000],
} as const;

export type MigrationCapDecision =
  | { outcome: 'default' }
  | { outcome: 'tier'; tier: number }
  | { outcome: 'needs_operator' };

export type AddByRssCopyPlan =
  | { action: 'copy'; writeTier: null; clearStored: boolean }
  | { action: 'copy'; writeTier: number; clearStored: false }
  | { action: 'needs_operator' }
  | { action: 'membership_status_missing' };

export type DirectoryFollowCopyPlan = {
  action: 'copy' | 'needs_operator';
  decision: MigrationCapDecision;
};
```

`as const` on the two specs is a const assertion, which this repo allows. Do not use `as` on values.

`decideMigrationCap(count, spec)` with `spec` typed `{ defaultLimit: number; tiers: readonly number[] }`. `ADD_BY_RSS_CAP` and `DIRECTORY_FOLLOW_CAP` are passed as that spec. The `as const` on those objects is only so the tier lists stay fixed literals.

- When `count <= spec.defaultLimit`, return `{ outcome: 'default' }`. This includes `0` and a negative count.
- Otherwise take the first `spec.tiers` entry that is `>= count`.
- When that entry is missing, or it is `> MIGRATION_CAP_MAX`, return `{ outcome: 'needs_operator' }`.
- Otherwise return `{ outcome: 'tier', tier: entry }`.

`addByRssFeedUrlForCopy(url)` matches the insert in `writeFollows` today (`limit(canonicalAddByRSSFeedUrl(url) ?? url, URL_LIMIT)` in `copyAccountLibraryApply.ts`):

- `canonicalAddByRSSFeedUrl(url)` when it returns a string; otherwise the raw `url`.
- Trim. Empty after trim returns `null`.
- Longer than `DATABASE_CONSTANTS.varchar_url` (2083) is cut to that length.
- Do not drop a non-http url. The canonical helper returns null for those, and the raw fallback stays.

`countAddByRssFeeds(urls)` is the size of the set of non-null `addByRssFeedUrlForCopy` results. Duplicates after canonicalization count once. Blank strings do not count.

`countDistinctText(values)` is the size of the set of trimmed strings, skipping `''`.

`countDirectoryFollows({ podcastIds, playlistFollowIds, userFollowIds })` is the sum of `countDistinctText` on those three lists. The same string in two lists counts twice. A self-follow counts. An id that will not resolve to a local row still counts. Do not subtract unresolved, not-seeded, or self ids.

`addByRssCopyPlan(count, stored, statusRowExists)`:

`clearStored: true` means plan 22 sets `max_add_by_rss_feeds` to null. `clearStored: false` means that statement does not run. A numeric `writeTier` is never paired with `clearStored: true`.

1. When `stored !== null && stored >= count`, return `{ action: 'copy', writeTier: null, clearStored: false }`. A stored number that already covers the count stays, including a number above `10000`, and the feeds copy. Do not set the column to null. Do not write that number.
2. Otherwise compute `decideMigrationCap(count, ADD_BY_RSS_CAP)`.
3. `needs_operator` returns `{ action: 'needs_operator' }`. Do not look at `statusRowExists`. Do not clear a stored number on this path.
4. `default` and `stored !== null` returns `{ action: 'copy', writeTier: null, clearStored: true }`. The count is at or under 100 and the stored number is below that count. Set the column to null. Do not write `100`. The feeds copy. Do not read `statusRowExists` on this path.
5. `default` and `stored === null` returns `{ action: 'copy', writeTier: null, clearStored: false }`. The column stays null. The feeds copy.
6. `tier` and `statusRowExists === false` returns `{ action: 'membership_status_missing' }`.
7. `tier` and the row exists returns `{ action: 'copy', writeTier: decision.tier, clearStored: false }`. `writeTier` is one of `200`, `300`, `400`, `500`, `1000`, `10000`. The count is over 100 and step 1 did not keep a covering number, so `stored` is null or below the count. That includes a stored number at or under 100. Write that tier. Do not leave null in place for a count the default does not cover. The feeds copy.

A count at or under 100 cannot have a stored number above 100 that is also below the count. Step 1 keeps every stored number greater than or equal to the count.

`directoryFollowCopyPlan(count)`:

- `decideMigrationCap(count, DIRECTORY_FOLLOW_CAP)`.
- `needs_operator` returns `{ action: 'needs_operator', decision }`.
- Otherwise `{ action: 'copy', decision }`. There is no stored-override argument. No column exists to read.

A short comment on `MIGRATION_CAP_MAX` may say the copy writes only a listed tier up to this number, and a larger count is reported for an operator. Do not cite a plan, a doc, or a step number in a comment.

## Unit cases

`decideMigrationCap` with `ADD_BY_RSS_CAP`:

| count | outcome | tier |
| --- | --- | --- |
| 0 | default | |
| 100 | default | |
| 101 | tier | 200 |
| 200 | tier | 200 |
| 201 | tier | 300 |
| 300 | tier | 300 |
| 301 | tier | 400 |
| 400 | tier | 400 |
| 401 | tier | 500 |
| 500 | tier | 500 |
| 501 | tier | 1000 |
| 1000 | tier | 1000 |
| 1001 | tier | 10000 |
| 5215 | tier | 10000 |
| 10000 | tier | 10000 |
| 10001 | needs_operator | |

`decideMigrationCap` with `DIRECTORY_FOLLOW_CAP`:

| count | outcome | tier |
| --- | --- | --- |
| 0 | default | |
| 500 | default | |
| 501 | tier | 1000 |
| 1000 | tier | 1000 |
| 1001 | tier | 2000 |
| 2000 | tier | 2000 |
| 2001 | tier | 3000 |
| 3000 | tier | 3000 |
| 3001 | tier | 4000 |
| 4000 | tier | 4000 |
| 4001 | tier | 5000 |
| 4314 | tier | 5000 |
| 5000 | tier | 5000 |
| 5001 | tier | 10000 |
| 10000 | tier | 10000 |
| 10001 | needs_operator | |

One extra `decideMigrationCap` case: spec `{ defaultLimit: 100, tiers: [20000] }` and count `15000` returns `needs_operator` because `20000 > MIGRATION_CAP_MAX`.

`countAddByRssFeeds`:

- `[]`, `['']`, and `['   ']` are `0`.
- Two copies of `https://example.com/feed` are `1`.
- `https://example.com/feed` and `https://example.com/feed/` are `1`.
- `https://user:pass@example.com/feed` and `https://example.com/feed` are `1`. The test must not log the userinfo string outside the assertion input.
- `not a url` counts as `1` (raw fallback).

`countDirectoryFollows`:

- one id in each list is `3`.
- blanks in a list are ignored.
- duplicate ids inside one list count once.
- the same id string in `podcastIds` and `userFollowIds` counts as `2`.

`addByRssCopyPlan`:

| count | stored | status row | action | writeTier | clearStored |
| --- | --- | --- | --- | --- | --- |
| 150 | null | true | copy | 200 | false |
| 80 | null | true | copy | null | false |
| 80 | null | false | copy | null | false |
| 150 | null | false | membership_status_missing | | |
| 150 | 200 | true | copy | null | false |
| 180 | 150 | true | copy | 200 | false |
| 100 | 17 | true | copy | null | true |
| 80 | 50 | true | copy | null | true |
| 80 | 80 | true | copy | null | false |
| 100 | 100 | true | copy | null | false |
| 80 | 200 | true | copy | null | false |
| 40 | 15000 | true | copy | null | false |
| 101 | 50 | true | copy | 200 | false |
| 101 | 100 | true | copy | 200 | false |
| 150 | 100 | true | copy | 200 | false |
| 10000 | null | true | copy | 10000 | false |
| 10001 | null | true | needs_operator | | |
| 10001 | 10000 | true | needs_operator | | |
| 10001 | 10001 | true | copy | null | false |
| 10001 | 50000 | true | copy | null | false |

`directoryFollowCopyPlan`: count `500` is `copy` with `default`; count `501` is `copy` with tier `1000`; count `4314` is `copy` with tier `5000`; count `10001` is `needs_operator`.

Assert every `writeTier` is `null` or one of `200`, `300`, `400`, `500`, `1000`, `10000`. Assert `clearStored` is absent unless `action` is `copy`. Assert `clearStored: true` only when `writeTier` is null, `stored` is a number, `stored < count`, and `count <= 100`. Assert every row with `stored !== null && stored >= count` has `writeTier` null and `clearStored` false. A numeric `writeTier` has `clearStored` false. `100` is not a `writeTier`.

## Out of scope

Do not edit `copyAccountLibrary.ts`, `copyAccountLibraryApply.ts`, the ORM entity, SQL, docs, or `.llm/plans/active/account-add-by-rss-cap-500.md` and `account-follow-cap-5000.md`. Do not register a worker command. Do not write `max_add_by_rss_feeds`. The next plans do the write, the log, and the skips.
