# 16 — Full Local Migration Rehearsal

## Goal

Copy every v4 account from the prod-copy snapshot into a local v5 database
before any real copy runs. Find every way an account fails, and prove that
copied accounts still behave as they did in v4: same sign-in, same library,
same public URLs. An agent runs it and watches compact statistics, not the
full log. Errors are kept in a gitignored folder because they name v4 ids.

This is required before the grace period. The one-account rehearsal in
[15](15-near-term-rehearsal-checklist.md) section 5 proved the commands on
`eFv5NFx` only.

## The snapshot is not the final database

The snapshot is older than the database the real copy reads. Accounts will
be added, libraries will grow, and other accounts will cross a cap. So the
rehearsal does not depend on any id list taken from the snapshot:

- The pilot sample is picked by rules when the stage starts (see
  [Stages](#stages)), not from fixed ids.
- Cap tiers are decided per account at copy time
  ([07](07-account-and-data-migration-model.md#account-caps-v4-did-not-have)).
- Counts in these docs are examples. The run reports its own.
- Refresh the copy before the full stage, as
  [06](06-database-migration-rehearsal.md) already decides, and rerun the
  full stage at least once more against a newer copy before go-live.

## What compatible means

Every account is checked after its copy. An account passes when all of these
hold:

1. **Every v4 row is accounted for.** For each group, v4 rows equal v5 rows
   written, plus rows recorded in `legacy_pending_row`, plus rows dropped for a
   reason the group is allowed to drop for
   ([05](05-id-mapping-and-catalog-seeding.md#migration-resilience)). A
   difference is the error class `unaccounted`. This is the main measure.
2. **Clips and playlist members are never dropped.** A dropped one is an error.
3. **Sign-in works.** The stored bcrypt hash equals the v4 hash byte for byte,
   and the verified flag matches. A real password sign-in is only tried for
   the rehearsal account, which is the one password the operator knows.
4. **Public v4 ids still resolve.** Each of the account's playlists, user clips,
   and the account itself has a `legacy_id_map` row, and a migrated public
   entity keeps its v4 shortid as `id_text`
   ([11](11-web-api-and-url-cutover.md)). The full stage also requests a
   sample of those v4 paths from the local web app and expects a page or a
   redirect, not a 404.
5. **Membership matches.** A future paid v4 expiry is Premium with that expiry
   (capped where 06 caps it). A carried trial is Trial. Nothing else is a grant.
6. **Caps did not cut a group the tier covers.** Over-default groups have the
   tier from 07. Past the last tier is `needs_operator`. A queue past 100,000
   keeps 100,000 rows.

## Phases

Each phase runs across every account in the stage before the next phase
starts, because a library copy must not start before its shows have parsed.

| Phase         | Work                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------- |
| 0. Preflight  | Local database only. Record the snapshot's newest `users.updatedAt`, and dump the local database. |
| 1. Identity   | `v4SeedAccountIdentity` per account. Email-case twins use the rule in `_WAKE-UP.md`.              |
| 2. Catalog    | Seed the shows the stage needs, queue the parses, and wait until settled or the wait deadline.    |
| 3. Library    | `v4CopyAccountLibrary` per account, writing cap tiers first.                                      |
| 4. Replay     | `v4ReplayLegacyRows` until a pass resolves nothing new.                                           |
| 5. Membership | Rebuild the paid-expiry file in the same sitting, then `billingImportLegacyMembershipExpiry`.     |
| 6. Verify     | The checks under [What compatible means](#what-compatible-means), per account.                    |

The catalog phase for the full stage is the
[launch queue](05-id-mapping-and-catalog-seeding.md#launch-queue) plus shows
that only appear on a clip, playlist, or playback row. It is the slowest
phase. Its time to settle and its failed-parse count are results, not
something to skip. The wait ends when nothing is waiting or after
`--catalog-wait-hours` (default 24). Migration feed retries run only in the
scheduled job loop beside the parsers. Feeds still waiting keep retrying.
After the stage, replay runs again until no `waiting_parse` rows remain or
those retries have settled. The runner also refuses to start unless the
process offset is zero (`TZ=UTC`). The pilot and sample stages seed only the
shows their accounts need.

## Before go-live

The rehearsal runner does not write the podcast legacy map. Before the store
build is live, run `v4WriteLegacyPodcastMap` so
`POST /legacy/podcast/lookup` can answer. Run `-dryRun` first. That pass
counts and writes nothing. The apply writes the rows in
[Legacy podcast lookup](05-id-mapping-and-catalog-seeding.md#legacy-podcast-lookup).

Before each phase, the runner dumps the local database into the run folder,
so a bad phase is undone by a restore instead of a reseed.

## Stages

| Stage  | Accounts                                                   | Moves on when                                                              |
| ------ | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| Pilot  | About 100, picked by rule                                  | Every account passed, was fixed and retried, or is listed in `deferred.md` |
| Sample | About 1,000 picked at random, on a restored clean database | Same. The rate gives a full-stage estimate.                                |
| Full   | Every account, on a refreshed copy and a clean database    | Same. The operator reviews `deferred.md` and `fixes.md` in the morning.    |

The pilot rules pick, from the copy as it is that day, the largest account in
each group (Add by RSS, subscriptions, clips, history, playlists, playlist
size), accounts just over each cap default, email-case twins, unverified
accounts, paid, trial, and expired memberships, accounts with follows of
other accounts, accounts with default playlists, accounts with no activity,
and `eFv5NFx`. The rest is random. The pick is written to the run folder.

An obvious fix is made in the commands, then only the accounts in that class
are retried. The next stage still starts from a clean database, so the fixed
code is what it runs. A class that is not obvious is written to `deferred.md`
and does not stop the stage or the next one. A class already in `deferred.md`
is counted again and is not investigated again.

## Errors and logs

One account's failure never stops the run. Each phase runs per account, and
each group inside the library copy runs in its own transaction. A failed group
records an error and the account's other groups continue. A failed account is
retried with `--retry-failed` after a fix.

The run stops itself when the error rate is high enough to mean a bug, not
bad data: more than 5% of the last 200 accounts failed in one phase. That
saves hours on a systematic failure.

Every error has a class: a short stable name such as `unaccounted`,
`needs_operator`, `cap_refused`, `email_case_collision`, `parse_failed`,
`item_not_found`, or `db_constraint:<name>`. An unknown exception is
`unexpected:<error name>`. New classes are expected. Classes are what the
summary groups by.

Run output goes to `.artifacts/v4-full-rehearsal/<run-id>/`. `.artifacts/` is
gitignored. Treat the folder as private: it names v4 ids.

| File           | Holds                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------- |
| `run.json`     | Stage, phase, snapshot date, start time, flags                                                |
| `pick.json`    | The v4 ids in this stage, with the pilot rule each was picked by                              |
| `errors.jsonl` | One line per error: v4 id, phase, group, class, message, time                                 |
| `summary.json` | Per phase: done, failed, skipped, rate, estimate left; per class: count and 3 v4 ids          |
| `summary.md`   | The same counts, no ids. Safe to quote in these docs.                                         |
| `deferred.md`  | One entry per class the agent did not fix. See [How an agent runs it](#how-an-agent-runs-it). |
| `fixes.md`     | One entry per class the agent fixed: files changed, and how many accounts were retried.       |
| `dumps/`       | The local database dump taken before each phase                                               |

No file holds an email, a name, a password hash, or a raw v4 row. Error
messages pass through the shared log redaction, and an email-shaped string is
replaced before it is written. A database URL is never logged.

## How an agent runs it

The agent does not read the log as it streams. The runner prints one line
every 100 accounts or 60 seconds: phase, done of total, failed, rate, and
estimate. The agent starts it in the background and waits on that output.

When a phase ends or the runner stops itself, the agent reads `summary.json`
only. It takes the largest error class that is not already in `deferred.md`,
opens up to three of its lines in `errors.jsonl`, and reads the v4 and v5 rows
for those ids locally. One investigation covers every account in that class.
The run is meant to go overnight. The agent does not stop to ask, and it does
not commit.

A class is obvious when all of these are true:

- The decided docs already say what the row should become
  ([05](05-id-mapping-and-catalog-seeding.md),
  [07](07-account-and-data-migration-model.md), this doc).
- The change is in the migration commands or a helper they call.
- The same fix applies to the whole class.
- It does not drop a clip or playlist member, change a public id or path,
  truncate a library, write Unlimited, or add a database migration.

The agent makes that fix, appends an entry to `fixes.md`, and retries the
accounts in that class with `--retry-failed`.

Anything else is not obvious. That includes a case the docs do not cover, two
readings of a doc, and a fix outside the migration commands. The agent appends
one entry to `deferred.md`: the class, the count, what it saw, why it did not
fix it, and the three example v4 ids. It marks those accounts deferred and
continues. The same class is not investigated again. Both files stay in the
run folder because they name v4 ids. In the morning the operator goes through
`deferred.md` with an agent and decides each one. `fixes.md` is the list of
changes to review.

The agent never pastes an email, a raw row, or a v4 id other than
`eFv5NFx` into chat, a committed doc, or a commit. Class names and counts are
fine. `deferred.md` and `fixes.md` may name v4 ids because they are gitignored.

The agent prompt goes in `.cursor/prompts/` with the runner. One prompt runs
the stages in order, so an overnight run does not wait between them.

## Where state lives

The runner keeps each account's status per phase (pending, done, failed,
deferred, `needs_operator`) in the local app database, so a crash or rerun resumes where
it stopped and skips finished accounts. The end-of-grace batch
([13](13-forced-migration-and-v4-shutdown.md)) and the operator's daily review
of copied, remaining, and failed accounts
([12](12-production-launch-and-grace-period.md)) need the same record. The
plan set builds one record for all three.

## What it builds

One plan set, after this doc is accepted:

- A runner worker command over the existing per-account commands, with
  `--stage`, `--phase`, `--resume`, `--retry-failed`, `--limit`, and
  `--catalog-wait-hours`. It refuses a non-local database, and it refuses to
  start unless the process offset is zero (`TZ=UTC`).
- Cap tiers written by `v4CopyAccountLibrary`, and `needs_operator` past the
  last tier ([07](07-account-and-data-migration-model.md#account-caps-v4-did-not-have)).
  Queue tiers run through 100,000. Past that, the copy keeps 100,000 rows.
- The per-account check in [What compatible means](#what-compatible-means).
- The pilot pick rules.
- The run folder files and the agent prompt. Every prompt in the set is
  Cursor Grok 4.7. Reasoning is the lowest level that can do that prompt.
  Opus and Codex are not used.

## Honest limits and risks

- The full catalog phase parses tens of thousands of feeds on one machine. It
  can take days and a lot of disk. The run records database size per phase.
- Only the rehearsal account's password is known, so other sign-ins are
  checked by hash, not by signing in.
- A refreshed copy can show classes the old one did not. That is why the full
  stage reruns before go-live.
- The phone-storage spike in [08](08-mobile-first-launch-migration.md) is not
  part of this. This rehearsal covers the server copy only.

## Pilot `20261114T034901Z`

100 accounts picked by rule, snapshot `2026-10-30T03:09:51Z`. Counts only. The
one account named here is `eFv5NFx`.

| Phase      | Done | Failed | Deferred |
| ---------- | ---- | ------ | -------- |
| identity   | 95   | 0      | 5        |
| catalog    | 95   | 0      | 5        |
| library    | 94   | 1      | 5        |
| replay     | 95   | 0      | 5        |
| membership | 95   | 0      | 5        |
| verify     | 64   | 31     | 5        |

The 5 deferred accounts are the left-out rows of email-case twins. Phase times:
identity 1 minute, catalog 16 hours (almost all of it waiting on retry backoff),
library 23 minutes, replay 2 minutes, membership 1 minute, verify 4 minutes.
Every verify failure is one of F1, F3, F4, F5, or F6.

- **F1.** Timestamps shifted with the host timezone: 16 verify failures (10
  trial grants 6 hours late, 6 paid expiries 5 or 6 hours early). Plan 01 reads
  v4 timestamps as UTC and refuses to start unless the process offset is zero.
- **F2.** v4 "Only with link" would have become private: all 2,849 playlists
  and 2,865 user clips, so a shared link would 404, including the 32 playlist
  follows. Plan 02 writes them unlisted. The same gap on profiles (1,381 public
  v4 profiles) is Q2: plan 12 copies the public profile flag.
- **F3.** 12 accounts lost the clip pointer on 40 history or queue rows (1 to
  13 each; `eFv5NFx` has 8). 25 were official chapters or soundbites and 15
  were another user's clip. The parent episode stayed in history. Plan 05
  links the clip when it exists and records a pending row when it does not.
- **F4.** One playlist follow was dropped because the owner was not copied
  yet. Full v4 has 32 playlist follows across 32 accounts. Plan 04 records a
  `follow_playlist` pending row that replay resolves.
- **F5.** One account had 54,176 history rows and v5 kept 10,000. Those rows
  were all completed, written in 72 distinct minutes over three days (up to
  3,543 in one minute) across 106 podcasts, which matches "mark all as played"
  per podcast; the account then had 0 subscriptions, 1 queue item, and 1
  playlist. Full v4 has 25 accounts over 10,000 history rows (largest 54,176)
  and 105 over 5,000. About 174,000 rows would have been evicted. About 11 of
  the 25 look like that bulk mark; the rest span 1,000 to 5,800 distinct
  minutes. Plan 06 keeps them with a per-account queue tier.
- **F6.** One library failure: values that are not feed URLs rolled back all
  30 Add by RSS feeds on that account (8 of them). Full v4: 31 accounts hold
  275 such values. 230 are file references on one account; 12 more are repaired
  by the existing canonicalizer. Plan 03 skips the rest and counts them.
- **F7.** 249 feeds (3.2%) failed to parse and only a generic retry line was
  kept. A full migration seeds about 63,786 subscribed feeds, so expect roughly
  2,000 failures. Plan 07 records a classified reason and does not log bodies.
- **F8.** 32 feeds exceeded the 20 MiB body cap: 14 on Omny, 8 on Megaphone, 2
  on Simplecast, 2 on another host, and one each on Art19, Acast, Flightcast,
  RedCircle, Amperwave, and Libsyn. These are large active shows. Full scale is
  about 0.4%, roughly 250 shows. Plan 09 raises the body limit once and retries.
- **F9.** One feed failed because an item duration overflowed the time column.
  Full v4 has 920 episodes with a duration of 100,000,000 seconds or more.
  Plan 10 drops that value instead of failing the feed. Ordinary parsing uses
  the same bound.
- **F10.** Retry backoff ran about 11 days, the catalog wait had no deadline,
  and the rehearsal prompt did not start the job loop those retries need. The
  pilot needed 199 jobs marked failed by hand. Plan 08 settles a permanent
  failure on the second attempt and ends the wait after `--catalog-wait-hours`
  (default 24). Plan 11 starts the job loop and reruns replay afterward.
- **F11.** 50 addresses are stored twice with different letter case. In 36
  pairs the left-out row also had use, and its library was dropped. Q1,
  answered: merge that library into the kept account. Plan 13 does that merge.
- **F12.** Other outliers were checked and none looked suspicious. No code
  change. Profiles, without ids: the largest Add by RSS library was 5,215
  feeds over 3,645 hosts and passed (news, blog, Reddit, and Google News feeds
  beside podcasts: an RSS reader import, grandfathered at the 10,000 tier).
  The largest subscription list was 4,314, all already in the directory,
  4,129 public, and passed (a bulk or OPML import, grandfathered at the 5,000
  follow tier). The largest clip library was 811 and failed only on F3. The
  largest playlist library failed only on F3 (a Premium account in ordinary
  use). The largest playlist was 467 items and passed. Accounts just over the
  directory follow default (503, 563, and 681) had 2 failures, on F6 and F3,
  and the caps themselves worked. Accounts just over the Add by RSS default
  (102, 163, and 176) passed, and the tiers worked. Also, 15 user clips end
  before they start (13 owners). v5 does not check clip times, so they copy as
  they are.
- **F13.** Full v4 is 22,510 users, 15,166 with subscriptions, 63,786 distinct
  subscribed feeds, and 2,757,743 history rows. The catalog also seeds viewed
  shows (highest count at least 3) and library-only shows, so it is larger
  than the subscribed count. Copying the largest-history account took 1,370
  seconds with its queue held at 10,000 rows. At the pilot's parse rate (three
  parser processes), seeding the full catalog takes about a day and a half
  before retries, which is where the plan 08 deadline matters. The library
  copy ran about 20 accounts a minute, so the full library phase is about 19
  hours plus the large-history accounts. Plan 06 is what keeps those accounts
  from counting the whole queue on every insert.

### Settled decisions

1. **Visibility.** v4 `isPublic = false` on a playlist or a user clip becomes
   v5 unlisted. `isPublic = true` stays public. The copy and replay do not
   write private.
2. **Add by RSS values.** A value with no http(s) canonical form is not a
   feed. It is not written, it does not count toward the cap, and the copy
   reports the count `addByRssNotFeedUrl`. Values the canonicalizer repairs
   stay.
3. **Playlist follows.** A pending row `follow_playlist` stays unresolved with
   reason `waiting_playlist` until the playlist exists. Replay writes the
   follow. It is not dropped.
4. **Clip pointers.** Another user's clip that is already in v5 is written as
   that clip. One that is not yet in v5 is written as the parent episode plus
   an unresolved pending row (`clip_not_copied`), and replay swaps in the clip
   later. An official chapter or soundbite is the parent episode plus a
   resolved pending row (`official_as_item`), which replay does not read.
5. **History grandfathering.** `max_queue_resources` null means the default of
   10,000. Listed tiers are 20000, 30000, 40000, 50000, 60000, and 100000. The
   copy writes the smallest tier that covers the account's largest per-medium
   queue. Above 100,000 is `needs_operator`.
6. **Parse failure reasons.** One closed set: `http_404`, `http_410`,
   `http_403`, `http_4xx`, `http_5xx`, `body_too_large`, `dns_not_found`,
   `tls_error`, `timeout`, `connection_error`, `not_a_feed`, `no_feed_url`,
   `db_value_out_of_range`, `db_error`, `parse_error`, `unknown`.
7. **Settle.** Permanent reasons are `http_404`, `http_410`, `dns_not_found`,
   `not_a_feed`, and `no_feed_url`. A migration retry with a permanent reason
   fails after its second attempt. Other reasons retry at 15 minutes, then 1
   hour, 6 hours, 1 day, 1 day, and 1 day. The catalog wait also ends after
   `--catalog-wait-hours` (default 24). What is still waiting stays on the job
   loop, and replay finishes `waiting_parse` rows later. Retry jobs the local
   rehearsal creates use a shorter schedule: 15 minutes, then 2, 5, 10, 15,
   and 30 minutes, so the catalog phase measures parse time and failure
   classes rather than days of waiting. Go-live seeding keeps the schedule
   above.
8. **Large feeds.** A migration feed that fails with `body_too_large` gets a
   body limit of 50,000,000 bytes and one immediate retry. A second
   `body_too_large` is permanent and listed for an operator.
9. **Durations.** A feed number written to the media-player time column that
   is not finite, is negative, or is at least 100,000,000 becomes null where
   the column allows null. A soundbite whose duration becomes null is skipped.
10. **Timezone.** v4 timestamps are read as UTC by formatting them in SQL. The
    `v4_*` and membership-import scripts set `TZ=UTC`. The rehearsal refuses
    to start when the process offset is not zero.
11. **Q2 — Public profiles.** Copy the flag. v4 `isPublic = true` becomes a
    public account. Anything else stays private.
12. **Q1 — Email-case twins.** Merge the left-out row's library into the kept
    account. The left-out v4 id is stored on `legacy_id_map` with
    `resolve_key` `email_case_twin`, pointing at the kept account. Its
    library is copied after the kept row's copy, with caps from the combined
    counts. Its membership, password, and email are not used.
