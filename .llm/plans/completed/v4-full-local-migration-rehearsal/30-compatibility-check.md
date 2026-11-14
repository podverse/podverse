**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Compatibility check

One read-only check per account, after library replay and membership. It returns pass or one error class. It does not write the phase-status table, does not register a worker command, and does not edit doc 16 or the library-copy files.

Area H calls `verifyAccount`. Area E logs `class`, `group`, and `message`.

## Rows

R9, R35, R36, R37, R38, R39, R40, R41

## Runs after

none

## Files

- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.test.ts`

No `v4Rehearsal/index.ts`. No web route edits. Pages already exist at `apps/web/src/app/playlist/[playlist_id]/page.tsx`, `apps/web/src/app/clip/[clip_id]/page.tsx`, and `apps/web/src/app/profile/[id_text]/page.tsx`.

## Tests

Unit tests in `verifyAccount.test.ts` (workers Vitest, same style as `copyAccountLibraryLib.test.ts`). They call the pure functions only. No database, no HTTP, no Playwright, no Maestro.

Cases, each a complete sentence in the test name:

- A subscription id with a followed channel passes, and the same id with neither a follow nor a pending row is `unaccounted` / `subscriptions`.
- A subscription pending row of status `dropped` passes.
- A user clip pending row of status `dropped` is `clip_dropped`. An official clip is not required.
- A playlist-member pending row of status `dropped` is `playlist_member_dropped`. A missing mediaRef and an official mediaRef are not members.
- A follow of the account's own id with no follow row passes. Any other missing user follow is `unaccounted` / `followsUser`.
- Two playback rows that share one legacy id pass when that id is written once. A distinct legacy id with no resource and no pending row is `unaccounted`.
- Equal hashes pass. A one-character hash difference is `hash_mismatch`. A different verified flag is `verified_mismatch`.
- A missing `legacy_id_map` row for a written playlist is `public_id`.
- Public-path status 200 passes. Status 404 is `public_path`. A redirect whose path contains the id passes. A redirect to `/profiles` is `public_path`.
- A future paid expiry with Premium, one `legacy_import` grant, and a matching `ends_at` passes. A carried trial with a `trial` grant passes. A past trial with no grant and tier Trial passes. A second grant source is `membership_mismatch`.
- Add by RSS count 50 with a null column passes, and the feeds are written. Count 50 with a stored number below 50 is `cap_tier`. Count 50 with a stored number at or above 50 passes, and the feeds are written.
- Count 150 with column 200 passes, and every canonical URL is written. Count 150 with null, or with a number below 150, is `cap_tier`. Count 150 with a stored number at or above 150, including a number above 10000, passes.
- Count 10001 whose column does not cover 10001, and which has no feed rows, is `needs_operator`. The column may stay null or stay a number below the count. The same count with one feed row is `cap_cut`. Count 10001 with a stored number at or above 10001 and every canonical URL written passes.
- A playlist with 10000 join members is copied. One with 10001 join members and no playlist row is `needs_operator`. The same playlist with a row is `cap_cut`.
- Directory follows over 10000 with no follow rows is `needs_operator`. The same count with one follow row is `cap_cut`. There is no directory-follow column to read.
- `clip_dropped` is returned before `needs_operator` when both are true.

## Release scratchpad

none

## Result

```typescript
export type VerifyAccountClass =
  | 'unaccounted'
  | 'clip_dropped'
  | 'playlist_member_dropped'
  | 'hash_mismatch'
  | 'verified_mismatch'
  | 'sign_in_rejected'
  | 'public_id'
  | 'public_path'
  | 'membership_mismatch'
  | 'cap_tier'
  | 'cap_cut'
  | 'needs_operator';

export type VerifyAccountResult =
  | { ok: true }
  | {
      ok: false;
      class: VerifyAccountClass;
      group: string | null;
      exampleId: string | null;
      message: string;
    };
```

`message` is counts and the group. It never contains an email, a name, a password hash, a feed URL, a title, or a database URL. `exampleId` is one v4 id or null.

`group` uses these names: `account`, `subscriptions`, `addByRss`, `followsPlaylist`, `followsUser`, `directoryFollows`, `playlists`, `playlistMembers`, `clips`, `playback`, `signIn`, `publicId`, `membership`.

Export `verifyAccount`, `judgeAccountCompatibility`, and `judgePublicPath`. The two `judge*` functions are pure. `verifyAccount` loads rows and calls them.

## Call

```typescript
export async function verifyAccount(
  v4Id: string,
  options: {
    now: Date;
    samplePublicPaths: boolean;
    webOrigin: string | null;
    rehearsalPassword: string | null;
    comparePassword: ((plain: string, hash: string) => Promise<boolean>) | null;
    requestPath?: (url: string) => Promise<{ status: number; location: string | null }>;
  }
): Promise<VerifyAccountResult>
```

- Call `assertLocalDatabase` from `apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts` first. Import it. Do not copy it.
- Reject an id that fails `isValidNanoIdV2IdText` from `@podverse/orm` with `v4 id must be 7–15 characters.`
- Missing `V4_DATABASE_URL` throws `Missing V4_DATABASE_URL.`
- No v4 `users` row throws `No v4 account for that id.`
- No v5 `account` with that `id_text` returns `unaccounted` / `account` / that id / `no v5 account`. It does not throw.
- `samplePublicPaths` true with a blank `webOrigin` throws `Missing web origin for the public path sample.` That is a bad call, not an account failure.
- `rehearsalPassword` set without `comparePassword`, or the reverse, throws `Password sign-in needs both the password and the compare function.`
- The password compare runs only when `v4Id === 'eFv5NFx'` and both values are set. Any other id ignores them.
- A request timeout or a thrown request becomes `public_path` for that account. It does not throw.

## Order

Return the first failure in this order. Later checks do not run.

1. `clip_dropped`, then `playlist_member_dropped`
2. `cap_cut`
3. `unaccounted`
4. `cap_tier`
5. `hash_mismatch`, then `verified_mismatch`, then `sign_in_rejected`
6. `public_id`, then `public_path` when `samplePublicPaths` is true
7. `membership_mismatch`
8. `needs_operator`

A group that is correctly `needs_operator` is left out of the `unaccounted` equation. A partial write of that group is `cap_cut` and is reported first.

## Caps

Constants in `verifyAccount.ts`. Do not import a tier helper. Area B may not have exported one.

- Add by RSS default `100`. Tiers `200`, `300`, `400`, `500`, `1000`, `10000`. Column `account_membership_status.max_add_by_rss_feeds`.
- Directory follows default `500`. Tiers `1000`, `2000`, `3000`, `4000`, `5000`, `10000`. No column. The check does not read one.
- Playlist resources: the trigger `enforce_playlist_resource_limit` in `infra/k8s/base/ops/source/database/linear-migrations/app/0001_app_schema.sql` allows `10000` and refuses the next insert. Over the cap means more than `10000`.
- The queue trigger evicts a row instead of refusing. Do not treat a long queue as `needs_operator`. A playback id with no resource and no pending row is `unaccounted`.

Counts are unique trimmed non-empty ids, not raw array length.

- Add by RSS count: unique non-empty `addByRSSPodcastFeedUrls` entries, before canonicalization. Two entries that canonicalize to one URL count as one.
- Directory-follow count: unique non-empty subscribed podcast ids, plus unique non-empty subscribed playlist ids, plus unique non-empty subscribed user ids, including a self id.
- Playlist member count: non-empty episode ids on that playlist's joins, plus mediaRef ids on those joins whose `mediaRefs` row exists and is not official. An order id with no join row is not a member.

Add by RSS:

A stored number covers the count when it is non-null and greater than or equal to the count. The copy leaves that number in place, including a number above 10000, and writes the feeds. The copy writes the smallest tier only when the count is over 100 and the stored number is null or below the count. It never writes a number above 10000, and it never writes 100.

- Count at or under `100`: the column is null, or a stored number that covers the count. A number below the count is `cap_tier`. Every canonical URL is written (below).
- Count over `100` and at or under `10000`: the column is the smallest tier greater than or equal to the count, or any stored number that covers the count, including a number above 10000. A number below the count, or null, is `cap_tier`. Every canonical URL is written.
- Count over `10000` and the column covers the count: every canonical URL is written and the column stays that number. That result is not `needs_operator` and not `cap_cut`.
- Count over `10000` and the column does not cover the count: `account_following_add_by_rss_channel` has no row for the account. The column may stay null or stay a number below the count. That result is `needs_operator` / `addByRss`. Any feed row is `cap_cut` / `addByRss`. Those URLs are not required in the accounting check.

Directory follows:

- Count at or under `10000`: no tier column. Each id is accounted below.
- Count over `10000`: `account_following_channel`, `account_following_playlist`, and `account_following_account` have no row for the account, and `legacy_pending_row` has no `subscription` or `follow_account` row for the account. That result is `needs_operator` / `directoryFollows`. Any of those rows is `cap_cut` / `directoryFollows`. The per-id accounting below is skipped for all three follow groups.

Playlist:

- Member count at or under `10000`: the playlist row exists and its members are accounted.
- Member count over `10000`: no `playlist` row with that `id_text`, no `playlist_resource` for it, and no pending `legacy_id` that starts with `${playlistId}:`. That result is `needs_operator` / `playlists`, and `exampleId` is the playlist id. A row, a resource, or such a pending id is `cap_cut` / `playlists`. That playlist's members are not required elsewhere.

When several groups are `needs_operator` and nothing earlier failed, return the first of `addByRss`, `directoryFollows`, `playlists`.

## Library accounting

Do not call `classifyLibraryCopy`. Its `pending` count overlaps rows that were also written, and a balanced report does not prove the insert happened. Use the same group names. Import nothing from `copyAccountLibraryApply.ts`.

A non-empty id is accounted when a v5 row or a `legacy_pending_row` covers it, as follows. Pending status `dropped` covers the id except for clips and playlist members. Several v4 rows that share one id need one covering row.

| Group | v4 ids | Covered by |
| --- | --- | --- |
| `subscriptions` | each subscribed podcast id | a followed channel whose `id_text` is that id or the `legacy_id_map` `v5_id_text` for `legacy_kind = 'podcast'`, or a pending row `row_kind = 'subscription'` and `legacy_id` equal to that id, any status |
| `addByRss` | each URL `canonicalAddByRSSFeedUrl` keeps | `account_following_add_by_rss_channel.feed_url` equal to that canonical URL. A null canonical URL is omitted, not `unaccounted` |
| `followsPlaylist` | each subscribed playlist id | `account_following_playlist` joined to `playlist.id_text`. No pending kind exists. A missing row is `unaccounted` |
| `followsUser` | each subscribed user id | skipped when the id is this account. Otherwise a follow row or pending `follow_account`, any status |
| `playlists` | each owned playlist that is not over the member cap | `playlist.id_text` equal to the v4 id |
| `playlistMembers` | each join episode id, and each join mediaRef that exists and is not official, on a playlist that was copied | a `playlist_resource` on that playlist whose item or clip `id_text` is the member id or the map's `v5_id_text` for that episode or mediaRef, or a pending row `legacy_id = ${playlistId}:${memberId}` with `row_kind` `snapshot_playlist_member` or `playlist_clip` |
| `clips` | each owned mediaRef that is not official | `clip.id_text` for this account, or pending `snapshot_clip` |
| `playback` | each distinct legacy id across queue, history, and now playing. The id is `mediaRefId` when set, otherwise `episodeId`. A row with both empty is omitted | any `queue_resource` on this account whose item or clip `id_text` is that id or the map's `v5_id_text`, or a pending row `row_kind` in `queue`, `history`, `now_playing` with that `legacy_id`, any status. Zone is not compared. One written row covers every v4 row with that id |

`clip_dropped`: a `snapshot_clip` row for one of this account's user-clip ids has status `dropped`.

`playlist_member_dropped`: a `snapshot_playlist_member` or `playlist_clip` row for one of this account's copied playlists has status `dropped`.

The first missing id in the table order above is the `unaccounted` result. `exampleId` is that id. `message` is `<group> <v4 count> v4, <covered count> covered`.

## Sign-in

Read `users.password` and `users."emailVerified"` for this id. Read `account_credentials.password` and `account.verified`. Compare the hashes with `===`. Compare the flags with `===` after reading v4 as a boolean (`true` only when the column is true).

Keep both strings in local variables. Do not put them on the result, in a log line, or in a thrown error.

When the live compare runs, call `comparePassword(rehearsalPassword, v5Hash)`. `false` is `sign_in_rejected` / `signIn`. Do not add `bcrypt` to `apps/workers/package.json` in this plan. The caller passes the compare function.

## Public ids

For the account, `legacy_id_map` has `legacy_kind = 'user'`, `legacy_id` and `v5_id_text` equal to the v4 id, `v5_kind = 'account'`, `status = 'mapped'`, and `account.id_text` is that id.

For each copied playlist, the same shape with `legacy_kind = 'playlist'`, `v5_kind = 'playlist'`, and `playlist.id_text` equal to the v4 id.

For each user clip that has a `clip` row, the same shape with `legacy_kind = 'mediaRef'`, `v5_kind = 'clip'`, and `clip.id_text` equal to the v4 id.

A clip or playlist that was not written does not need a map row. A `needs_operator` playlist does not need one. The first missing or mismatched row is `public_id`. `exampleId` is the v4 id. `message` is the `legacy_kind`.

`judgePublicPath(input: { id: string; requestedPath: string; status: number; location: string | null }): VerifyAccountResult`

- Status `200` through `299` passes.
- Status `300` through `399` passes when `location` parses as a URL and its pathname is `requestedPath`, or one pathname segment equals `id`.
- Anything else, including `404` and a redirect to `/profiles`, is `public_path`. `message` is `requestedPath` and the status. Do not include the response body.

The loader samples only when `samplePublicPaths` is true. It takes written playlists whose v4 `isPublic` is true, sorted by id, first 3, and written user clips whose v4 `isPublic` is true, sorted by id, first 3. It does not request `/profile/:id`. Seeded accounts are `SharableStatusEnum.Private` in `seedAccountIdentity.ts`, and a missing profile redirects to `/profiles`, so a profile request would not show that the account exists.

Request `${webOrigin}/playlist/${id}` and `${webOrigin}/clip/${id}` with `fetchWithTimeout` from `@podverse/helpers-backend` (`redirect: 'manual'`, `timeoutMs: 10000`, `maxBodyBytes: 1024`). Strip one trailing slash from `webOrigin`. Read `status` and the `location` header. Cancel the body. Do not log or parse it. `requestPath` replaces that call in tests. The loader calls `judgePublicPath`.

## Membership

Reuse `decideV4Membership` from `apps/workers/src/commands/orm/v4Identity/seedAccountIdentityLib.ts`. Pass `options.now`, `users."membershipExpiration"`, and `users."freeTrialExpiration"`. Tier `premium` is `account_membership_id` `2` (`AccountMembershipEnum.Premium`). Tier `trial` is `1`.

Active grants are `billing_membership_grant` rows for the account with `revoked_at` null.

- Future paid expiry (`decideV4Membership` tier `premium`): exactly one active `legacy_import` grant. Zero or more than one is `membership_mismatch`.
- Expected `ends_at`: read one `appStorePurchase` row with `"ownerId"` equal to the v4 id and `"purchase_date_ms"` matching `^[0-9]+$` and the integer in `[1703635200000, 1706745600000)` (`2023-12-27T00:00:00.000Z` inclusive through `2024-02-01T00:00:00.000Z` exclusive). When such a row exists and the v4 expiry is after `starts_at` plus five UTC years, expected `ends_at` is `starts_at` plus five UTC years (`Date.UTC` year plus 5, same month, day, and time). Otherwise expected `ends_at` is the v4 `membershipExpiration`.
- The grant `ends_at` matches that instant within one second.
- When `carriedTrialEndsAt` is set: exactly one active `trial` grant, `ends_at` within one second of that instant. When it is null: no active `trial` grant.
- Any active grant whose `source` is not `trial` or `legacy_import` is `membership_mismatch`. That includes `migration_baseline`.
- `account_membership_status.membership_expires_at` is null when there is no active `trial` or `legacy_import` grant. Otherwise it is within one second of the later of those grants' `ends_at`.
- A past paid expiry has no active `legacy_import` grant. The tier still follows `decideV4Membership`.

`group` is `membership`. `exampleId` is the account v4 id. `message` names the field that differed (`tier`, `legacy_import`, `trial`, `ends_at`, `membership_expires_at`, `other_grant`) and no timestamp is required. Do not include an email.

## Loader

v4 uses `pg` `Client` and `V4_DATABASE_URL`, `SELECT` only, then `client.end()`. v5 uses `getDataSourceReadWrite().query`. Do not edit `copyAccountLibrary.ts` to export `readV4Snapshot`. The private reader stays there. This loader selects ids, flags, hashes, and expiries only.

v4, one account:

- `users`: `"subscribedPodcastIds"`, `"subscribedPlaylistIds"`, `"subscribedUserIds"`, `"addByRSSPodcastFeedUrls"`, `password`, `"emailVerified"`, `"membershipExpiration"`, `"freeTrialExpiration"`. Not `email`. Not `name`.
- `playlists` for `"ownerId"`: `id`, `("isPublic" IS TRUE)`, and the join counts' ids from `playlists_episodes_episodes` and `playlists_media_refs_media_refs`. Not `title`. Not `description`. Not `itemsOrder`.
- `mediaRefs` for `"ownerId"` or those join ids: `id`, `("isOfficialChapter" IS TRUE OR "isOfficialSoundBite" IS TRUE)`, `("ownerId" = $1)`, `("isPublic" IS TRUE)`. Not `title`.
- `userQueueItems`, `userHistoryItems`, `userNowPlayingItems` for `"ownerId"`: `"episodeId"`, `"mediaRefId"` only.
- The App Store existence query above. No other column.

v5, by `account.id`:

- `account.id`, `account.id_text`, `account.verified`
- `account_credentials.password`
- `account_membership_status.account_membership_id`, `membership_expires_at`, `max_add_by_rss_feeds`
- `billing_membership_grant.source`, `starts_at`, `ends_at`, `revoked_at`
- followed channel `id_text`, followed playlist `id_text`, followed account `id_text`, add-by-RSS `feed_url`
- owned `playlist.id_text`, owned `clip.id_text`
- `playlist_resource` item and clip `id_text` per playlist `id_text`
- `queue_resource` item and clip `id_text` for this account's queues
- `legacy_pending_row.row_kind`, `legacy_id`, `status` for this account. Not `context`.
- `legacy_id_map.legacy_kind`, `legacy_id`, `v5_kind`, `v5_id_text`, `status` for the user id, the playlist ids, the clip ids, the subscribed podcast ids, and the playback episode and mediaRef ids.

Build the pure input from those rows and call `judgeAccountCompatibility`. Then the hash compare, then the path sample.

## What this plan does not do

- It does not write `max_add_by_rss_feeds`, pending rows, or the phase-status table.
- It does not log the directory-follow tier. Area B does that during the copy.
- It does not change a web route. The profile page stays a redirect to `/profiles` when the API returns 404.
- It does not add an env key. Area H owns `apps/workers/ENV.md`.
