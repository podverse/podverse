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
| Users with `emailVerified`                      | 20,520    |
| Users with podcast subscriptions                | 15,166    |
| Distinct subscribed podcast ids                 | 63,786    |
| Users with add-by-RSS URLs                      | 3,274     |
| Distinct add-by-RSS URLs                        | 21,228    |
| Users with playlist subscriptions               | 32        |
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

About 64,000 distinct subscribed podcasts, against 7.7 million podcasts and
196 million episodes, is the selective-seed set. Copying the catalog is the
expensive path.

### Rehearsal phases

1. **Inventory counts** — row counts for every table in
   [04](04-v4-data-inventory-and-scope.md); null rates for `podcastIndexId`,
   email, membership expiry.
2. **Crosswalk dry run** — resolve podcasts → PI id / URL; report mapped vs
   unresolved percentages (no v5 writes required for the first pass).
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

- The copy may be stale relative to live prod. Treat timings as lower bounds
  with headroom.
- Accidental writes to the copy are still bad (destroys a clean rehearsal
  baseline). Prefer a role that cannot write.
- Large history tables may dominate runtime; plan pagination early.
- The membership export SQL reads `users`. A CSV dry run has not been
  executed, because that file would contain email addresses.

## Open questions

- How often is the copy refreshed from prod?
- Target max seconds for a single-user lazy migration under load?
- Who may run rehearsal commands (operator only vs shared jump host)?

## Future plan sets

- Worker command stubs + corrected membership export snippet in billing docs.
- Runbook for refresh of the prod copy (outside this repo).
- Acceptance thresholds before starting beta migrator builds.
