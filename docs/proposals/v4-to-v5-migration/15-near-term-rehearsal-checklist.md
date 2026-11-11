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

- [x] Identity seed for the rehearsal account on the local database. The v4
      id is `account.id_text` (`eFv5NFx`), the verified flag is true, and the
      bcrypt hash and name are stored. `v4_library_copied_at` is null. No
      membership row, no grant, and no signup trial. Repeat runs use
      `v4SeedAccountIdentity` with `--v4-id` and `--dry-run`.
- [ ] Library copy for that one account, through the legacy map.
- [ ] Sign in on local web and mobile with the v4 password.
- [ ] Copied group counts match the step 2 trace.
- [ ] `billingImportLegacyMembershipExpiry` dry run against the seeded account.

## Not blockers for this list

- The legacy apps do not have to be running. A visual pass against the step 2
  counts is optional.
- The phone-storage spike in
  [08](08-mobile-first-launch-migration.md#storage-spike) can run in parallel.
  It needs a private build installed over the v4 store ids.
- The v4 API change that rejects an account after its library is copied is
  needed before the grace period, not before this rehearsal.
