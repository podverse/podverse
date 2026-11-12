# 15 — Near-term Rehearsal Checklist

Ordered next steps after the inventory docs. Do these before writing the
migration workers, and before running the legacy apps. Beta deploy is not
required. Check items off as they finish.

The prod-copy database is the snapshot named only by `V4_DATABASE_URL`
([06](06-database-migration-rehearsal.md)). Never commit the URL, a dump, or
query output that contains an email or a raw row. Counts go in
`.artifacts/v4-rehearsal-counts/` (gitignored) or stay in the operator's notes.

The rehearsal account is `mitch@podverse.fm`.

## 1. Clean rehearsal target

Writes go to a local v5 database. Alpha already has internal accounts, and
[07](07-account-and-data-migration-model.md) skips an email that already
exists in v5, so a copy aimed at alpha can finish without moving anything.

- [ ] Point the rehearsal at a local v5 database, not the alpha database.
- [ ] Refresh the prod copy if it is stale. Newest `users.updatedAt` on the
      counted snapshot is `2026-10-30T03:09:51Z`.
- [ ] Connect with a read-only role when one exists. Only the operator runs
      commands against this copy.

From the **Root** tab, after `~/.config/podverse/v4-database-url` has real
values:

```bash
set -gx V4_DATABASE_URL (grep '^V4_DATABASE_URL=' ~/.config/podverse/v4-database-url | string split -f 2 -m 1 '=')
psql "$V4_DATABASE_URL" -c 'SELECT 1'
```

## 2. One-account trace

Read-only counts for the rehearsal account, in the copy order from
[07](07-account-and-data-migration-model.md). This is the expected answer the
later worker run has to match. No writes.

Ran read-only on the 2026-10-30 snapshot. One account. v4 id `eFv5NFx`
(length 7, verified). Counts only. The stored expiry and playlist rows are in
`.artifacts/v4-rehearsal-counts/rehearsal-account-trace.txt`.

- [x] Subscriptions: 173 ids. 6 have no `podcasts` row. The other 167 have a
      numeric Podcast Index id.
- [x] Add by RSS: 11 URLs, none blank.
- [x] Follows: 0 playlist follows, 2 user follows. Both user ids exist.
- [x] Playlists: 5 owned, all private. 2 are `isDefault` (music `Txa2zVmQ7`,
      mixed `g_lAQnsaL`). The mixed Likes row has `itemCount` 1 and an
      `itemsOrder` id (`9F6JX-FAJ2`) with no episode, mediaRef, or join row.
      `jRHA_i7eo` has the same kind of gap for `aaopHbfZr`. The copy drops
      those ids. The rule is in
      [05](05-id-mapping-and-catalog-seeding.md#crosswalk-chain-playlist).
- [x] User clips: 925. This account owns no official chapters or soundbites.
      85 clip ids are shorter than 9. None are missing an episode.
- [x] Queue: 0 `userQueueItems`. Legacy `queueItems` JSON is empty.
- [x] History: 710 `userHistoryItems` (700 episode, 10 mediaRef, 222
      completed). Legacy `historyItems` JSON has 195 entries. The copy uses
      the table.
- [x] Now playing: 1 `userNowPlayingItems` row by `ownerId`, episode
      `40N_8L4oS`, no mediaRef. `users.userNowPlayingItemId` is null.
- [x] Membership: future paid expiry, more than 5 years ahead. 0 of 49 App
      Store rows fall in the 2023-12-27 through 2024-01-31 window, so the
      5-year cap does not apply. Import Premium with the stored expiry. The
      trial timestamp is null, so no Trial grant. Receipt rows stay out
      (49 App Store, 17 Google Play, 22 PayPal).

## 3. Schema groundwork

Nothing can write a migrated row until these exist. One plan set, then linear
migrations and a regenerated baseline. The plan is
[01-schema-groundwork.md](/.llm/plans/active/v4-rehearsal-schema/01-schema-groundwork.md).

- [x] Loosen `nano_id_v2` from 9 characters to 7–15. New ids stay 10. On this
      snapshot, 410 users and 21,099 episodes are shorter than 9
      ([05](05-id-mapping-and-catalog-seeding.md)).
- [x] Add nullable `account.v4_library_copied_at`. Null means the identity is
      reserved and the library is not copied.
- [x] Add the durable legacy map table from
      [05](05-id-mapping-and-catalog-seeding.md#durable-legacy-map).

## 4. Crosswalk dry run

No v5 writes. Report counts only
([06](06-database-migration-rehearsal.md), phase 2). The order is in
[05](05-id-mapping-and-catalog-seeding.md#crosswalk-chain-podcast--channel).

Ran read-only against the 2026-10-30 snapshot and the local `podverse_app`
database. Counts only. The local database has 8 feeds and no `channel_merge`
rows, so this seed size is against an almost empty catalog.

Rehearsal account, 173 subscribed ids:

- [x] Spam or takedown: 0.
- [x] Non-public, kept out of the seed: 14. Missing podcast row: 6.
- [x] Seed candidates: 153, each with a numeric Podcast Index id.
- [x] Applied absorb survivor: 0.
- [x] Already a local feed: 4. No local feed: 149.

Every subscribed podcast, 63,786 distinct ids:

- [x] Spam: 14, all still `isPublic`. Takedown: 0.
- [x] Non-public, `flag_status` `none`: 6,557. Missing podcast row: 42.
- [x] Seed candidates: 57,173. Every one has its own numeric Podcast Index id.
- [x] Applied absorb survivor: 0.
- [x] Already a local feed: 5. No local feed: 57,168. That is the selective
      seed against this local database. Duplicate detection stays the normal
      channel merge after those feeds exist.

## 5. One-account copy on local v5

Worker commands with `--dry-run` and a single-account target. Run them against
the local v5 database from step 1.

The membership plan matches
[07](07-account-and-data-migration-model.md). The paid-expiry file is built in
the same sitting as the dry-run or the apply, and an App Store window expiry
more than five years ahead is already capped in that file.
`billingImportLegacyMembershipExpiry` writes the grant and the expiry only.
The account copy sets Premium or Trial, and it writes a carried trial grant.

Do these in order. Each worker command is one chunk: dry run first, then a
local apply after the operator says yes. Never write to alpha. The clip and
playlist rules for an episode that left its feed are in
[05](05-id-mapping-and-catalog-seeding.md#episodes-that-left-the-feed). A user
clip is never dropped.

- [x] Identity seed for the rehearsal account on the local database.
      `v4SeedAccountIdentity` is built. The v4 id is `account.id_text`
      (`eFv5NFx`), the verified flag is true, and the bcrypt hash and name
      are stored. `v4_library_copied_at` is null. No membership row, no grant,
      and no signup trial. Repeat runs use `--v4-id` and `--dry-run`.
- [x] Library dry run command. `v4CopyAccountLibrary` is built and still
      requires `--dry-run`. It writes nothing, including
      `v4_library_copied_at`. Counts are `resolved`, `unresolved` (waiting on
      a seeded parse or another account's copy), `archivedItem` (create an
      Archived item), `snapshot` (keep `removed_source`, no item),
      `notSeeded` (subscription the seed skips), and `dropped`.
- [x] Rerun that dry run and replace the counts below. Ran
      `v4CopyAccountLibrary --dry-run` for `eFv5NFx` at `2026-11-11T21:16:19Z`.
      It wrote nothing. Subscriptions 173 (resolved 4, unresolved 149,
      notSeeded 20). The notSeeded 20 are the 14 non-public and the 6 missing
      podcasts. The unresolved 149 have no local feed. Add by RSS 11, all
      unresolved. Follows: 0 playlists, 2 users, both unresolved. Playlists 5,
      all resolved because the account is local. Playlist members 19 (resolved
      1, unresolved 18). Order ids dropped: 2. Clips 925 (resolved 16,
      unresolved 113, archivedItem 716, snapshot 80, dropped 0), official
      skipped 0. Queue 0. History 710 (resolved 59, unresolved 618, dropped
      33). Now playing 1, unresolved.
- [x] Catalog seed dry run. Ran `v4SeedAccountCatalog --dry-run` for
      `eFv5NFx` at `2026-11-11T22:27:22Z`. It wrote nothing. Subscriptions
      173 (already local 4, not local 149, non-public 14, missing 6). Clips
      115 (already local 3, not local 104, non-public 8). Playlist members
      18 (already local 1, not local 17). History 104 (already local 4, not
      local 93, non-public 7). Queue 0. Now playing 1, not local. Combined
      260 (already local 4, not local 228, non-public 22, missing 6). Beyond
      subscriptions 87 (not local 79, non-public 8). Spam and takedown are 0.
- [x] Apply that seed on the local database and let those feeds finish
      parsing. Ran `v4SeedAccountCatalog` for `eFv5NFx` at
      `2026-11-11T22:37:13Z`. Created 227 channels, queued 227 parses on
      `rss-slow`, and skipped 1 show with no authority URL. Episodes v4 hid
      stay out of the parse. The later dry run shows those parses landed.
- [x] Rerun `v4CopyAccountLibrary --dry-run` after the parses finish. Ran
      for `eFv5NFx` at `2026-11-12T01:54:37Z`. It wrote nothing.
      Subscriptions 173 (resolved 152, unresolved 1, notSeeded 20). Add by
      RSS 11 (resolved 2, unresolved 9). Follows: 0 playlists, 2 users, both
      unresolved. Playlists 5, all resolved. Playlist members 19 (resolved
      18, unresolved 1). Order ids dropped: 2. Clips 925 (resolved 393,
      unresolved 37, archivedItem 415, snapshot 80, dropped 0), official
      skipped 0. Queue 0. History 710 (resolved 663, unresolved 16, dropped
      31). Now playing 1, resolved.
- [x] Library write. Ran `v4CopyAccountLibrary` for `eFv5NFx` at
      `2026-11-12T02:46:07Z`. It wrote on the local database and set
      `v4_library_copied_at`. Written: 177 Archived items, 887 clips, 18
      playlist members, 660 playback rows. Classifier counts match the
      post-parse dry run. A second run is skipped once the timestamp is set.
- [x] Sign in on local web and mobile with the v4 password. Both succeeded.
      The Add by RSS first-parse 403s are expected: this account still has
      no membership, and that route refuses until one exists.
- [x] Recopy after a settled parse. A public episode with no local item is
      no longer left waiting once that feed's parse has finished or failed
      and is not running. The first write was cleared on the local database
      and `v4CopyAccountLibrary` ran again for `eFv5NFx` at
      `2026-11-12T03:43:28Z`. Written: 211 Archived items, 924 clips, 19
      playlist members, 660 playback rows. Classifier: clips unresolved 0
      (archivedItem 452, resolved 393, snapshot 80), playlist members
      unresolved 0, history unresolved 0 (dropped 47).
- [x] Recopy after the no-channel rule. A show the seed skips for having no
      authority URL now counts as not seeded, and a clip or playlist member
      with no local channel is written as a snapshot instead of skipped.
      Ran at `2026-11-12T03:51:50Z`. Written: 211 Archived items, 925 clips,
      19 playlist members, 660 playback rows.
- [x] Copied group counts match the step 2 trace, with the dropped history
      and queue rows for episodes that left their feed counted separately.
      Local rows for `eFv5NFx` after the recopy: subscriptions 152 of 173
      (21 not seeded, including the show with no authority URL). Add by RSS
      11 of 11. Playlist follows 0. User follows 0 of 2 (those accounts are
      not local; nothing replays them yet). Playlists 5 of 5. Playlist
      members 19 of 19. Clips 925 of 925 (844 on an item, 81 snapshots).
      Queue upcoming 0. History 659 of 710 (47 dropped because the episode
      is not an Active item, 16 of them on two shows whose first parse
      failed; 4 collapsed to one row). Now playing 1. Archived items 211.
      Retry and replay for those gaps are not built; see
      [05 § Migration resilience](05-id-mapping-and-catalog-seeding.md#migration-resilience).
- [x] `billingImportLegacyMembershipExpiry --dry-run` against the seeded
      account. Ran at `2026-11-12T04:01:50Z`. It wrote no grants. 2937 rows:
      created 1 (the seeded account), skipped past 1563, unmatched 1373,
      updated 0, unchanged 0, ambiguous 0, invalid 0.
      Re-ran `v4SeedAccountIdentity` for `eFv5NFx` at `2026-11-12T04:15:15Z`
      after the seed learned to write settings, membership status, and
      metaboost. A carried trial was not
      written for this account. The paid-expiry file was rebuilt in this
      sitting: 2937 rows, 297 capped at `2031-11-12T05:08:14Z`. The apply
      ran at `2026-11-12T05:09:48Z` and wrote grants. Counts: created 1,
      skipped past 1563, unmatched 1373, updated 0, unchanged 0, ambiguous 0,
      invalid 0. After that apply the account is Premium with a future expiry.
      All 11 Add by RSS follows still have no title. The first-parse 403s were
      the missing membership. A signed-in app foreground retries them. The
      server does not start that parse.

## Not blockers for this list

- The legacy apps do not have to be running. A visual pass against the step 2
  counts is optional.
- The phone-storage spike in
  [08](08-mobile-first-launch-migration.md#storage-spike) can run in parallel.
  It needs a private build installed over the v4 store ids.
- The v4 API change that rejects an account after its library is copied is
  needed before the grace period, not before this rehearsal.
