**Cursor model:** Opus 5.5 · **Reasoning:** high

# 30 — Parse path decision, device columns, and feeds kept by the signed-out user

The decision every Add by RSS caller uses to pick the server parse or the device parse, the
`add_by_rss_feed` columns the device path needs, and the one shared rule for which rows a
session sees. Signed-in sessions always use the server parse; only a signed-out device parses
on the phone. Rows the signed-out user kept are hidden while someone is signed in and show again
after sign-out. Nothing calls the device parse yet; plans 31–34 build on this one, and areas B,
D, F, and G read the names fixed here.

## Rows

R1, R7, R8, R23, R24, R26, R40

## Runs after

none

## Files

apps/mobile/src/lib/addByRss/parsePath.ts
apps/mobile/src/lib/addByRss/parsePath.test.ts
apps/mobile/src/data/db/schema.ts
apps/mobile/src/data/db/migrations.ts
apps/mobile/src/data/db/migrations.test.ts
apps/mobile/src/data/repositories/addByRssDevicePath.ts
apps/mobile/src/data/repositories/addByRssDevicePath.test.ts
apps/mobile/src/data/repositories/addByRssRepository.ts
release-notes/scratchpad.md

## Answers from the code

- **The path depends on sign-in only.** A signed-in user always parses on the server, whatever
  the membership, so every device of an account sees the same parse. Membership still decides
  whether a signed-in user may add or refresh. That check stays where it is today
  (`evaluateFeature('add_by_rss_add' | 'add_by_rss_refresh')` in the screens and the refresh
  job, and the server's 403 through `handleGateError`). `resolveAddByRssParsePath` does not
  read membership.
- **Signed in, account snapshot not loaded yet.** `useAccessTier` documents that a null account
  while `status === 'authenticated'` means "not known yet". The decision answers `'server'` for
  it. A signed-in user never moves to the device, and there is no fallback when the server says
  no.
- **What "signed in" means below the hooks.** Repository code has no React state. It uses
  `addByRssCredentialStore.currentAccountIdText()`: the account snapshot is written by
  `completeMobilePasswordLogin` (`accountRepository.refreshSnapshot`) and removed by
  `AuthProvider.clearSession`. Area B's signed-out credential owner reads the same snapshot,
  so credentials and rows always agree on who is signed in.
- **One row per feed URL.** `add_by_rss_feed.feed_url` is the primary key, so the signed-out
  user and an account cannot each hold their own copy of a feed. Ownership is one flag on that
  row (`signed_out_owned`), settled by the rules in section 5. A feed both the signed-out user and
  the signed-in account follow belongs to the account (flag 0). It shows while signed in, is
  refreshed by the server, and still shows after sign-out (section 5, "Both follow the same
  feed").
- **No follow timestamp exists today.** `updated_at` is rewritten on every parse
  (`buildAddByRssFeedRecord`), so it cannot say which feed was followed first. The sign-up carry
  (plan 34) and area G's count need follow order, so this migration adds `followed_at`.
- **The shared tier table stays as it is.** `accessTier.ts` is shared with web and the ORM.
  Mobile keeps using `add_by_rss_add` and `add_by_rss_refresh` for signed-in users exactly as
  today. The playlist screens (`useAddToPlaylist.tsx`, `LibraryPlaylistsScreen.tsx`) are not
  touched.

## 1. `apps/mobile/src/lib/addByRss/parsePath.ts` (new)

Named exports only.

```ts
import type { DTOAccount } from '@podverse/helpers/dto';

export type AddByRssParsePath = 'server' | 'device';

export const resolveAddByRssParsePath = (
  account: DTOAccount | null,
  options?: { isAuthenticated?: boolean }
): AddByRssParsePath =>
  account === null && options?.isAuthenticated !== true ? 'device' : 'server';
```

Module doc comment, as the code stands: a signed-in session parses Add by RSS feeds on the
Podverse server whatever its membership, so every device of the account shows the same result.
A signed-out device fetches and parses on this phone. Membership decides what a signed-in user
may do, not where the parse runs. Every caller that picks between the two goes through this
function.

Confirm the `DTOAccount` import path against `apps/mobile/src/auth/completeMobilePasswordLogin.ts`
(`@podverse/helpers/dto`).

## 2. Migration version 3 and `schema.ts`

`apps/mobile/src/data/db/migrations.ts` — append after version 2. SQLite `ALTER TABLE` adds one
column per statement:

```ts
{
  version: 3,
  statements: [
    `ALTER TABLE add_by_rss_feed ADD COLUMN device_etag TEXT;`,
    `ALTER TABLE add_by_rss_feed ADD COLUMN device_last_modified TEXT;`,
    `ALTER TABLE add_by_rss_feed ADD COLUMN device_feed_hash TEXT;`,
    `ALTER TABLE add_by_rss_feed ADD COLUMN device_checked_at INTEGER;`,
    `ALTER TABLE add_by_rss_feed ADD COLUMN signed_out_owned INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE add_by_rss_feed ADD COLUMN followed_at INTEGER;`,
  ],
},
```

Version 1's `CREATE TABLE` stays untouched (forward-only, **dto-changes-are-device-data-migrations**).
Area B takes version 4 if it stamps a parser version. Existing rows get `signed_out_owned = 0`
(they were added through the server path) and a null `followed_at`.

`apps/mobile/src/data/db/schema.ts`, `addByRssFeed` table, after `publisherDirectoryJson`:

- `deviceEtag: text('device_etag')`, `deviceLastModified: text('device_last_modified')`,
  `deviceFeedHash: text('device_feed_hash')`. One doc comment above the three: the conditional
  cache from this device's last fetch of the feed, sent back on the next device fetch only while
  the row holds a stored bundle. The server path never reads or writes them.
- `deviceCheckedAt: integer('device_checked_at')`: epoch ms of this device's last completed
  fetch of the feed (parsed, unchanged, or failed with a host answer). Null when this device has
  never fetched it.
- `signedOutOwned: integer('signed_out_owned').notNull().default(0)`: 1 when the feed was
  followed by the signed-out user of this phone and no signed-in account has claimed it. Such a
  row is hidden from every list while someone is signed in, and shows again after sign-out.
- `followedAt: integer('followed_at')`: epoch ms when this phone last started following the
  feed. Null for rows followed before this column existed; they sort before every stamped row.

`migrations.test.ts`:

- Rename the first test to "holds versions 1 to 3, and version 3 is the latest"; expect length 3,
  `MIGRATIONS[2]?.version` 3, `LATEST_MIGRATION_VERSION` 3.
- The new-database test expects version 1, `PRAGMA user_version = 1;`, version 2,
  `PRAGMA user_version = 2;`, version 3, `PRAGMA user_version = 3;`.
- Replace "runs version 2 on a database already at version 1" with two cases: from 1 runs
  versions 2 and 3; from 2 runs only version 3.
- The "newer than this build's latest migration" message becomes `… latest migration 3`.
- Add: version 3 holds only `alter table add_by_rss_feed add column` statements, and none of its
  column names contains `password` or `username`.

## 3. `apps/mobile/src/data/repositories/addByRssDevicePath.ts` (new, pure)

Kept free of `expo-sqlite` so Vitest covers it (the same split as `addByRssListedFeeds.ts`).

```ts
import { FIFTEEN_MINUTES_MS } from '@podverse/helpers';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';

import type { SyncJobPriority } from '../../sync/syncQueue';

/** Conditional cache from a device fetch. Same field names as the device parse input. */
export type AddByRssDeviceCache = {
  etag: string | null;
  feedHash: string | null;
  lastModified: string | null;
};

/** A background device refresh skips a feed this device fetched more recently than this. */
export const ADD_BY_RSS_DEVICE_REFRESH_STALE_AFTER_MS = FIFTEEN_MINUTES_MS;

export type AddByRssDeviceRefreshEntry = {
  checkedAtMs: number | null;
  feedUrl: string;
  hasCredentials: boolean;
  requiresCredentials: boolean;
};

export const addByRssFeedUrlKey = (feedUrl: string): string => …;
export const deviceCacheForFetch = (row: {
  deviceEtag: string | null;
  deviceFeedHash: string | null;
  deviceLastModified: string | null;
  hasBundle: boolean;
}): AddByRssDeviceCache | null => …;
export const isDeviceRefreshDue = (params: {
  checkedAtMs: number | null;
  nowMs: number;
  priority: SyncJobPriority;
}): boolean => …;
export const selectDeviceRefreshFeedUrls = (params: {
  entries: readonly AddByRssDeviceRefreshEntry[];
  nowMs: number;
  priority: SyncJobPriority;
}): string[] => …;
export const isAddByRssFeedHiddenInSession = (row: {
  followed: boolean;
  isSignedIn: boolean;
  signedOutOwned: boolean;
}): boolean => …;
export const addByRssFollowOwnershipValues = (params: {
  isNewFeed: boolean;
  isSignedIn: boolean;
  nowMs: number;
  wasFollowed: boolean;
}): { followedAt?: number; signedOutOwned: 0 | 1 } => …;
```

- `addByRssFeedUrlKey`: `canonicalAddByRSSFeedUrl(feedUrl) ?? feedUrl.trim()`, the same key
  `mergeLocalAndRemoteAddByRssFeeds` uses in `apps/mobile/src/lib/addByRss/domain.ts`
  (`addByRssFeedKey`, private there; do not change `domain.ts`).
- `deviceCacheForFetch`: null when `hasBundle` is false (an unchanged answer would leave a row
  with no episodes) or when all three values are null; otherwise the three values.
- `isDeviceRefreshDue`: `'user'` → true; `checkedAtMs === null` → true; otherwise
  `nowMs - checkedAtMs >= ADD_BY_RSS_DEVICE_REFRESH_STALE_AFTER_MS`.
- `selectDeviceRefreshFeedUrls`: keeps an entry when it is not
  `requiresCredentials && !hasCredentials` (the same skip `requestRefreshAll` applies to server
  tickets) and `isDeviceRefreshDue` holds. Keeps input order.
- `isAddByRssFeedHiddenInSession`: `isSignedIn && followed && signedOutOwned`. This is the
  shared signed-out read rule. A listed-only row (`followed` false) is never hidden by it: area D
  decides listed rows through their artist.
- `addByRssFollowOwnershipValues`: the values a write that follows a feed stores.
  `signedOutOwned` is `isSignedIn ? 0 : 1`. `followedAt` is `nowMs` when `isNewFeed` or
  `!wasFollowed`, and absent otherwise, so re-following a followed feed keeps its place in the
  order.
- `SyncJobPriority` is a type-only import, so Vitest loads nothing from `syncQueue`.

## 4. Session and the shared filter in `addByRssRepository.ts`

Large file; work by anchor. Add `or` to the `drizzle-orm` import and a separate
`import type { SQL } from 'drizzle-orm';` line. Import `addByRssFollowOwnershipValues` and
`isAddByRssFeedHiddenInSession` from `'./addByRssDevicePath'`.

Private helpers above the `addByRssRepository` object, after `afterArtistRelationsChanged`:

```ts
const isSignedInSession = async (): Promise<boolean> =>
  (await addByRssCredentialStore.currentAccountIdText()) !== null;

/**
 * Rows the current session may list. While someone is signed in, a followed row the signed-out
 * user kept is left out; signed out, every row is listed.
 */
const sessionVisibleFeedsCondition = async (): Promise<SQL | undefined> =>
  (await isSignedInSession())
    ? or(eq(schema.addByRssFeed.followed, 0), eq(schema.addByRssFeed.signedOutOwned, 0))
    : undefined;
```

It is the SQL form of `isAddByRssFeedHiddenInSession`; the doc comment on each says they are the
same rule.

Apply it (drizzle's `and()` skips an `undefined` argument; `.where(undefined)` selects all):

- `listFeeds`: `.where(and(eq(schema.addByRssFeed.followed, 1), await sessionVisibleFeedsCondition()))`.
  Doc comment: followed feeds this session shows.
- `listFeedsWithRefs`: `.where(await sessionVisibleFeedsCondition())`.
- `listParsedFeedUrls`: add the condition to its existing `and(…)`.
- `listFeedsByCredentials` reads `listFeeds`, so it follows. So do `splitStoredUserinfo`,
  `requestRefreshAll`, the car cache (`carCacheReproject.ts`), Home (`homeFeedData.ts`), the
  Library (`addByRssLibraryFeedData.ts`), and `subscriptionsRepository`'s list. None of those
  files changes.

Left unfiltered on purpose, because they answer "what is stored", not "what is listed":
`listAllFeeds` (the Library merge in plan 32 handles hidden rows itself), `getFeedByUrl`,
`getFeedByIdText`, `getMappedFeedByUrl` (an item already in the queue or history keeps playing),
and `reloadAddByRssArtistIndex` (artist names on player lines).

New accessors inside the object, after `setCredentialStatus` (before `splitStoredUserinfo`).
Each starts with `await initializeDatabase();` like its neighbours:

- `listHiddenFeedUrls(): Promise<Set<string>>`: empty when signed out; signed in, the `feedUrl`
  of every row with `followed = 1` and `signedOutOwned = 1`.
- `isFeedHiddenInSession(feedUrl: string): Promise<boolean>`: one row select of `followed` and
  `signedOutOwned`; false when there is no row; otherwise `isAddByRssFeedHiddenInSession` with
  `isSignedIn: await isSignedInSession()`.
- `listSignedOutFollowedFeeds(): Promise<{ feedUrl: string; followedAtMs: number | null; requiresCredentials: boolean; title: string | null }[]>`:
  the signed-out user's followed feeds, oldest follow first (`followedAtMs` is `followedAt`).
  Area G and plan 70 read `feedUrl` and the length; plan 34's carry reads every field. Signed
  out: every `followed = 1`
  row, because everything a signed-out session lists is the signed-out user's. Signed in:
  `followed = 1` and `signedOutOwned = 1`. Order
  `orderBy(asc(schema.addByRssFeed.followedAt), asc(sql\`rowid\`))`. SQLite sorts nulls first in
  ascending order, so rows followed before `followed_at` existed come first, in insert order.
  Add `sql` to the `drizzle-orm` import. No bundle columns.
- `setSignedOutOwned(feedUrls: readonly string[], signedOutOwned: boolean): Promise<void>`:
  one `UPDATE … WHERE feed_url IN (…)` per chunk of `LISTED_FEED_INSERT_CHUNK_SIZE` URLs (use
  `inArray`); no-op for an empty list; then `await afterArtistRelationsChanged()`.
- `getDeviceFetchState(feedUrl: string): Promise<{ cache: AddByRssDeviceCache | null; checkedAtMs: number | null; followed: boolean; requiresCredentials: boolean } | null>`:
  one row select of `deviceEtag`, `deviceLastModified`, `deviceFeedHash`, `deviceCheckedAt`,
  `followed`, `requiresCredentials`, and `hasBundle` as `mappedFeedJson IS NOT NULL` (a
  `sql<number>` select expression; do not load the bundle text). `cache` comes from
  `deviceCacheForFetch`. Null when there is no row.
- `setDeviceFetchState(feedUrl: string, state: { cache?: AddByRssDeviceCache | null; checkedAtMs: number }): Promise<void>`:
  always writes `deviceCheckedAt`. When `cache` is an object, writes the three cache columns;
  when `null`, clears them; when `undefined`, leaves them.
- `listDeviceRefreshEntries(): Promise<AddByRssDeviceRefreshEntry[]>`: `listFeeds()` (so a
  hidden row is never an entry) joined in memory with each row's `deviceCheckedAt` (one extra
  select of `feedUrl` and `deviceCheckedAt` for `followed = 1`). `hasCredentials` from
  `addByRssCredentialStore.listFeedUrlsForCurrentAccount()` matched with
  `toAddByRssCredentialFeedUrl(feed.feedUrl)` (`apps/mobile/src/lib/addByRss/credentials.ts`),
  the same match `requestRefreshAll` uses.

## 5. Ownership on every follow write

The signed-out user owns what they follow; a signed-in account owns what it follows. Every write
that follows a feed stamps the row with the current session.

### `upsertFeed`

- Add `followed: schema.addByRssFeed.followed` to the `existingRows` select.
- After `isNewFeed`:

  ```ts
  const followsFeed = record.followed === true || (isNewFeed && record.followed === undefined);
  const ownershipValues = followsFeed
    ? addByRssFollowOwnershipValues({
        isNewFeed,
        isSignedIn: await isSignedInSession(),
        nowMs: Date.now(),
        wasFollowed: existingRows[0]?.followed === 1,
      })
    : {};
  ```

- Spread `...ownershipValues` into `baseValues` after the `followed` entry, so both the insert
  and the conflict update write it.
- Extend the doc comment: a write that follows the feed also records who follows it, the
  signed-out user or the signed-in account, and when the follow started.

### `setFollowed`

When `followed` is true, select the row's `followed` first, then write
`{ followed: 1, ...addByRssFollowOwnershipValues({ isNewFeed: false, isSignedIn: await isSignedInSession(), nowMs: Date.now(), wasFollowed: row?.followed === 1 }) }`.
When false, write `{ followed: 0 }` as today. Extend its doc comment the same way.

### What each writer means

The follow writers today are `upsertFeed` and `setFollowed(…, true)`:

| Writer | Session | Result |
| --- | --- | --- |
| Device add, device check (plans 31, 32) | signed out | owned by the signed-out user |
| Home detail Subscribe on a listed album (plan 32) | either | owned by that session |
| Server add (`parseNow` with `followed: true`) | signed in | owned by the account |
| Parse-all result (`applyRefreshResult`) | signed in | owned by the account |
| Library merge of the account's follows (`useAddByRssFeeds`) | signed in | owned by the account |
| `ensureLocalFeedFromFollow` | signed in | owned by the account |
| Sign-up carry and sign-in reconcile (plan 34) | signed in | `setSignedOutOwned` writes the flag directly |

A device refresh (`refreshFeedOnDevice`, plan 31) writes no `followed`, so it never changes
ownership.

### Both follow the same feed

When a signed-in account follows a feed the signed-out user also kept, the account's follow
write (merge, server add, parse-all, or plan 34's sign-in reconcile) sets the flag to 0. The feed
shows while signed in and the server refreshes it. After sign-out it still shows, because a
signed-out session lists every followed row, and the device refreshes it. Unfollowing it while
signed in unfollows it on the phone, so it is gone for the signed-out user too. A feed is one row
on the phone; it is not two separate follows.

## Tests

- `apps/mobile/src/lib/addByRss/parsePath.test.ts` (new, Vitest): signed out (null account,
  no options) → device; null account with `isAuthenticated: false` → device; authenticated with
  null account → server; valid Trial → server; valid Premium → server; no membership status →
  server; expired membership → server. Build accounts the way
  `packages/helpers/src/lib/accessTier.test.ts` or the mobile membership tests do (read one and
  copy its fixture shape).
- `apps/mobile/src/data/repositories/addByRssDevicePath.test.ts` (new): `deviceCacheForFetch`
  (no bundle → null; all null → null; values pass through); `isDeviceRefreshDue` (user, never
  checked, inside and outside the window); `selectDeviceRefreshFeedUrls`
  (needs-credentials-without-credentials skipped, order kept);
  `isAddByRssFeedHiddenInSession` (hidden only when signed in, followed, and signed-out owned;
  listed-only never hidden; signed out never hidden); `addByRssFollowOwnershipValues` (signed out
  → 1, signed in → 0; new feed and newly followed get `followedAt`; already followed has no
  `followedAt` key).
- `apps/mobile/src/data/db/migrations.test.ts` updated as in section 2.

Per **mobile-test-economics**, no Maestro flow: nothing on screen changes in this plan.

## Release scratchpad

```markdown
## Mobile database records device fetch state and signed-out ownership for Add by RSS feeds

- Surfaces: mobile
- Change: SQLite migration 3 adds six columns to `add_by_rss_feed`: the conditional cache from
  the phone's last fetch of the feed (`device_etag`, `device_last_modified`, `device_feed_hash`),
  when the phone last fetched it (`device_checked_at`), whether the signed-out user of the phone
  followed it and no signed-in account has claimed it (`signed_out_owned`, default 0), and when
  the phone started following it (`followed_at`). Existing rows get 0 and nulls; nothing is
  rewritten. While someone is signed in, Add by RSS lists leave out feeds the signed-out user
  followed; after sign-out they are listed again. Signed-in users always use the server parse.
- Who notices: nobody directly; on-device parsing for signed-out users, the sign-up carry, and
  the sign-in rules use these columns.
- Operator steps: none
```
