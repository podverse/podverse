# 06 — Database Migration Rehearsal

## Goal

Near-term work: practice against the prod-copy v4 database, measure sizes and
timings, and prove mapping and account import ideas **before** beta or store
cutover. No production writes.

## Status

Draft. Needs operator review. This is the first implementation-facing track.

## What we know

- A production database copy already exists on a test server. It is a snapshot,
  not live production. Reference it only as **`V4_DATABASE_URL`**. Never commit
  the URL, credentials, dumps, or query results that contain PII.
- The value lives in `~/.config/podverse/v4-database-url` (`KEY=value`, `#`
  comments). Replace every `REPLACE_WITH_*` token before use. A file that still
  contains `REPLACE_WITH_` is unset.
- Real v4 user table is `users` with `email`, `password`,
  `membershipExpiration`, `freeTrialExpiration`, array subscription fields, and
  related queue/history tables. See `podverse-api@develop`
  `src/entities/user.ts`.
- [BILLING-OPERATIONS.md](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover)
  exports `users.email` and `users.membershipExpiration`. The column is
  `timestamp without time zone`. Format it with `to_char` and a `Z` suffix.
  Do not query `account_credentials` for this export.

## Proposed approach

### Access rules

- Read-only role on the copy whenever possible. A superuser URL is not a license
  to write. Rehearsal SQL is `SELECT` only.
- All reports: counts, timings, sample **ids only** (no emails, no tokens).
- Artifacts and CSVs stay outside the git tree (`.artifacts/v4-rehearsal-counts/`,
  already gitignored).

### Connection file

`~/.config/podverse/v4-database-url` is the only home file to read. Load it for
the `psql` process. Do not print the value. Do not copy it into the repo.

From the **Root** tab, after the `REPLACE_WITH_*` tokens are real:

```bash
set -gx V4_DATABASE_URL (grep '^V4_DATABASE_URL=' ~/.config/podverse/v4-database-url | string split -f 2 -m 1 '=')
```

If the file is missing or still contains `REPLACE_WITH_`, skip the queries and
record "counts not run".

### Read-only count templates

Column names match `podverse-api@develop` entities. Quote camelCase identifiers.
`query_to_xml` runs `count(*)` per public table. It does not modify data.

```sql
SELECT relname AS table_name,
       (xpath(
         '/row/c/text()',
         query_to_xml(
           format('SELECT count(*) AS c FROM %I.%I', nspname, relname),
           false,
           true,
           ''
         )
       ))[1]::text::bigint AS row_count
FROM pg_class
JOIN pg_namespace ON pg_namespace.oid = relnamespace
WHERE nspname = 'public'
  AND relkind = 'r'
ORDER BY relname;
```

```sql
SELECT count(*) AS users,
       count(*) FILTER (WHERE email IS NULL) AS email_null,
       count(*) FILTER (WHERE "membershipExpiration" IS NULL)
         AS membership_expiration_null,
       count(*) FILTER (WHERE "freeTrialExpiration" IS NULL)
         AS free_trial_expiration_null
FROM users;
```

```sql
SELECT count(*) AS podcasts,
       count(*) FILTER (WHERE "podcastIndexId" IS NULL) AS podcast_index_id_null,
       count(*) FILTER (WHERE "podcastGuid" IS NULL) AS podcast_guid_null
FROM podcasts;
```

```sql
SELECT count(*) AS feed_urls,
       count(*) FILTER (WHERE url IS NULL) AS url_null,
       count(*) FILTER (WHERE "isAuthority" IS TRUE) AS authority_true
FROM "feedUrls";
```

### This snapshot

Read-only counts ran against the prod-copy. Newest `users.updatedAt` on the
copy is `2026-10-30T03:09:51Z`. Counts only. No emails and no raw rows. The
same numbers are under `.artifacts/v4-rehearsal-counts/` (gitignored).

| Table                             | Rows        |
| --------------------------------- | ----------- |
| `users`                           | 22,510      |
| `podcasts`                        | 7,709,610   |
| `episodes`                        | 195,891,836 |
| `feedUrls`                        | 8,054,788   |
| `mediaRefs`                       | 8,433,479   |
| `playlists`                       | 2,849       |
| `playlists_episodes_episodes`     | 11,251      |
| `playlists_media_refs_media_refs` | 589         |
| `userHistoryItems`                | 2,757,743   |
| `userQueueItems`                  | 50,605      |
| `userNowPlayingItems`             | 9,262       |
| `notifications`                   | 8,689       |
| `fcmDevices`                      | 3,928       |
| `upDevices`                       | 179         |
| `appStorePurchase`                | 10,650      |
| `googlePlayPurchase`              | 377         |
| `paypalOrders`                    | 1,248       |
| `bitpayInvoices`                  | 14          |
| `accountClaimToken`               | 4           |
| `authors`                         | 5,071,499   |
| `categories`                      | 110         |
| `liveItems`                       | 608         |
| `stats_podcast`                   | 241,619     |
| `stats_episode`                   | 461,294     |
| `stats_media_ref`                 | 177,253     |
| `podcasts_authors_authors`        | 7,247,792   |
| `podcasts_categories_categories`  | 7,693,711   |
| `recentEpisodesByPodcast`         | 1,798,773   |
| `recentEpisodesByCategory`        | 0           |
| `auth_user`                       | 6           |
| `django_session`                  | 485         |

Episode, mediaRef, and episode-category join tables in that run were 0 rows:
`episodes_authors_authors`, `episodes_categories_categories`,
`media_refs_authors_authors`, `media_refs_categories_categories`.

| Check                                           | Count     |
| ----------------------------------------------- | --------- |
| Users with a future `membershipExpiration`      | 1,390     |
| Users with `membershipExpiration` null          | 19,573    |
| Users with `freeTrialExpiration` set            | 19,678    |
| Users with a future `freeTrialExpiration`       | 410       |
| Users with `emailVerified`                      | 20,520    |
| Users with an email and `emailVerified` false   | 1,990     |
| Users with podcast subscriptions                | 15,166    |
| Distinct subscribed podcast ids                 | 63,786    |
| Users with add-by-RSS URLs                      | 3,274     |
| Distinct add-by-RSS URLs                        | 21,228    |
| Users with playlist subscriptions               | 32        |
| Playlists with `isDefault`                      | 34        |
| Users with user follows                         | 13        |
| Users with `subscribedPodcastListIds` non-empty | 0         |
| Users with non-empty `historyItems` JSON        | 241       |
| Users with non-empty `queueItems` JSON          | 38        |
| Podcasts with numeric `podcastIndexId`          | 7,709,609 |
| Podcasts with null or blank `podcastIndexId`    | 1         |
| Podcasts with null `podcastGuid`                | 6,995,717 |
| Public podcasts                                 | 4,785,087 |
| Authority feed URLs                             | 7,683,972 |
| Feed URLs with null `isAuthority`               | 370,816   |
| Episodes with null or blank `guid`              | 4,067,063 |
| Episodes with null `pubDate`                    | 155       |
| Official-chapter mediaRefs                      | 7,292,641 |
| Official-soundbite mediaRefs                    | 1,128,457 |
| History rows whose target is a mediaRef         | 6,805     |
| History or queue rows with both targets null    | 0         |
| Now-playing rows with null `episodeId`          | 258       |
| Unclaimed `accountClaimToken` rows              | 1         |

410 of the 19,678 free-trial timestamps are still in the future. None of
those 410 users also have a future `membershipExpiration`. 406 of them end
within 90 days and are the trial carryover. 4 end after 2120 (one each in
2121, 2123, 3019, and 3022) and are not imported. Paid expiries are not
capped: 1,235 future `membershipExpiration` values are more than 90 days
out, 848 are more than a year out, and the latest is `9000-01-01`.

About 64,000 distinct subscribed podcasts, against 7.7 million podcasts and
196 million episodes, is the selective-seed set. Copying the catalog is the
expensive path.

### Crosswalk gaps on this snapshot

v4-side only. No v5 database was queried. A subscribed podcast id counts as
ready for the Podcast Index hop when its `podcastIndexId` is numeric.

| Check                                                                      | Count  |
| -------------------------------------------------------------------------- | ------ |
| Distinct subscribed podcast ids                                            | 63,786 |
| Subscribed ids with no `podcasts` row                                      | 42     |
| Subscribed ids with a null or non-numeric `podcastIndexId`                 | 0      |
| History rows whose `episodeId` has no episode                              | 0      |
| History rows whose episode `guid` is null or blank                         | 2,707  |
| Queue rows whose `episodeId` has no episode                                | 0      |
| Queue rows whose episode `guid` is null or blank                           | 59     |
| Playlist episode links with no episode                                     | 0      |
| `mediaRefs` that are neither an official chapter nor an official soundbite | 12,381 |

42 subscribed ids cannot crosswalk because the podcast row is gone. Every
subscribed podcast that still exists has a numeric Podcast Index id. History
and queue rows point at episodes that still exist. 2,707 history rows and 59
queue rows will need the enclosure URL, because the episode guid is blank.
The 12,381 mediaRefs are the user-clip pool if the two official flags do not
overlap. Overlap was not counted.

Public shortid lengths are in
[05](05-id-mapping-and-catalog-seeding.md#retained-public-ids). None are
longer than 15. The floor is 7. Rows shorter than 9: 410 users, 12 playlists,
222 podcasts, 295 mediaRefs, and 21,099 episodes.

### App Store rows that are not purchases

`appStorePurchase` has 10,650 rows, one per Apple transaction id. Rows whose
`purchase_date_ms` falls on 2023-12-27 through 2024-01-31 are not purchases.
That window is 8,671 rows from 607 accounts, including accounts with dozens of
rows each, saved on the same day as the Apple purchase date. Treat them as
simulated. Do not import them and do not count them as revenue.

For a revenue estimate, replace those 36 days with the average of the nearby
months where each account bought about once (May 2022–July 2023 and October–
November 2023): about 37 purchases a month, which is 44 purchases for that
window, at the $18 list price. Real paid rows outside the window stay. Three
rows with a cancellation date are refunds and stay out as well. PayPal
`completed` or `approved`, Google Play `purchaseState` 0, and BitPay
`confirmed` or `complete` are the other incoming payments. List-price total
after that replacement is about $64,218. Store commissions are not in this
database.

Decided: do not import these receipt tables into v5. Membership access comes
from the expiry date. Before that import, write an operator-held archive
outside the git repo, one file per table. The archive may contain payment
tokens, so it is not committed. App Store rows in the 2023-12-27 through
2024-01-31 window stay in the archive and stay marked as not real purchases.

### Memberships more than five years out

Of 848 future `membershipExpiration` values more than one year out, 717 are
more than five years out. 97 of those end within ten years. 619 end after ten
years and before year 8000. One is `9000-01-01`.

"Activity" here means a history, queue, or now-playing row, an owned playlist,
a user clip, a podcast subscription, an add-by-RSS URL, or a followed playlist.
233 of the 717 have at least one of those. 484 do not.

| Group                                       | Accounts | No activity | Some activity |
| ------------------------------------------- | -------- | ----------- | ------------- |
| App Store purchase in the 2023-12-27 window | 297      | 130         | 167           |
| App Store purchase only outside that window | 8        | 1           | 7             |
| PayPal or Google Play, no App Store row     | 4        | 0           | 4             |
| No payment row                              | 408      | 353         | 55            |

The 297 window accounts have a median of 19 App Store rows in that window
(minimum 3, maximum 198). 269 of them have 10 or more. 203 of the 297 expire
more than ten years out.

Of the 408 with no payment row, 277 were created between `2019-09-04 23:13`
and `2019-09-05 00:00` and expire on `2119-09-04`. 268 of those 277 have no
activity. 7 expire in 3022, and 1 expires in year 9000. The other 123 unpaid
expiries were created from 2019 through 2024. 80 of those 123 have no
activity, and 43 have some. Those 43, plus the active remainder of the
one-hour batch, are the 55 unpaid accounts with activity.

Decided: cap only accounts that have an App Store purchase in the
2023-12-27 through 2024-01-31 window. 607 accounts have such a row. 297 of
them expire more than five years out and are imported as five years from
the import time. 154 already end within five years and stay as stored. 156
are not a future membership. Unpaid long expiries, including the 2019-09-04
batch and the active gift accounts, are not capped.

### Rehearsal phases

1. **Inventory counts** — row counts for every table in
   [04](04-v4-data-inventory-and-scope.md); null rates for `podcastIndexId`,
   email, membership expiry.
2. **Crosswalk dry run** — drop spam and takedown, split non-public podcasts
   out of the seed, resolve the rest by Podcast Index id, then follow an
   applied absorb merge to the surviving channel. Report those counts and
   the unresolved seed size. No v5 writes.
3. **Account import dry run** — create accounts in an isolated v5 DB from a
   subset; verify bcrypt login; measure per-thousand-user time.
4. **Graph import dry run** — subscriptions, playlists, clips, queue/history for
   the subset; measure failures.
5. **Membership export dry run** — corrected CSV from `users`; feed the existing
   `billingImportLegacyMembershipExpiry` dry-run against the isolated v5 DB
   **after** accounts exist.
6. **Scale-up** — larger batches until timing supports lazy-login SLOs and
   end-of-grace batch windows ([07](07-account-and-data-migration-model.md)).

### Tooling shape (later plan sets)

Prefer `apps/workers` commands: idempotent, `--dry-run`, count-only reports,
explicit `--limit` / id ranges. Do not put one-off SQL in chat history as the
source of truth; check commands into the monorepo when ready.

## Honest limits and risks

- Refresh the copy when a practice run starts, and once more immediately
  before the identity seed. There is no schedule between those points. Treat
  timings as lower bounds with headroom.
- Accidental writes to the copy are still bad (destroys a clean rehearsal
  baseline). Prefer a role that cannot write. Only operators run commands
  against this copy. There is no shared jump-host login.
- Large history tables may dominate runtime; plan pagination early.
- The membership export SQL reads `users`. A CSV dry run has not been
  executed, because that file would contain email addresses.

## Future plan sets

- Worker command stubs + corrected membership export snippet in billing docs.
- Runbook for refresh of the prod copy (outside this repo).
- Acceptance thresholds before starting beta migrator builds.
