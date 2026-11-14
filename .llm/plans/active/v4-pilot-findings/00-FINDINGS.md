# v4 pilot findings — for operator review

Pilot run `20261114T034901Z`, 100 picked accounts, snapshot `2026-10-30T03:09:51Z`. Counts only.
The one account named here is the rehearsal account `eFv5NFx`. Account ids for every other
outlier are in the gitignored file
`../podverse_docs_v4_to_v5_migration_inventory/.artifacts/v4-full-rehearsal/20261114T034901Z/outliers-local.md`.

## Result

| Phase | Done | Failed | Deferred |
| --- | --- | --- | --- |
| identity | 95 | 0 | 5 |
| catalog | 95 | 0 | 5 |
| library | 94 | 1 | 5 |
| replay | 95 | 0 | 5 |
| membership | 95 | 0 | 5 |
| verify | 64 | 31 | 5 |

The 5 deferred accounts are the losing rows of email-case twins (F11), by design.

Phase times: identity 1 minute, catalog 16 hours (almost all of it waiting on retry backoff),
library 23 minutes, replay 2 minutes, membership 1 minute, verify 4 minutes.

Every verify failure traces to one of F1, F3, F4, F5, or F6. None is data corruption.

## Findings

Each finding says whether it only showed because the pilot is partial. "Full scale" means it
happens in a full migration too.

### F1 — Timestamps shift by the Mac's timezone (16 verify failures)

- 10 trial accounts: the v5 trial grant ends 6 hours after the v4 `freeTrialExpiration`.
- 6 paid accounts: `account_membership_status.membership_expires_at` is 5 or 6 hours behind the
  grant's end (5 for dates in daylight time).
- Cause: v4 timestamps are `timestamp without time zone` holding UTC. The identity seed reads
  them through node-postgres, which parses them in the process timezone (US Central here).
  `account_membership_status.membership_expires_at` is also `timestamp without time zone`, and
  node writes a `Date` into it in local time. Verify formats both as UTC, so it caught the shift.
- Pilot-only? Mostly. Production pods run in UTC, so the dates would be right there. A rehearsal
  or a migration run from a laptop is wrong for every trial and paid account. The code should not
  depend on the host timezone. **Plan 01.**

### F2 — v4 "Only with link" playlists and clips become private (not caught by verify)

- v4 `isPublic = false` means "Only with link": the v4 API serves a playlist or clip to anyone
  with the id (`getPlaylist`, `getMediaRef` do not check `isPublic`). The legacy app labels it
  "Only with link".
- The copy maps `isPublic = false` to v5 `private`. v5 returns 404 for a private playlist or clip
  to anyone but the owner.
- Full v4: **all 2,849 playlists** are `isPublic = false`. 2,865 user clips are too.
- Result after migration: every shared playlist link and every shared "Only with link" clip link
  returns 404, and the 32 playlist follows point at playlists the follower cannot open.
- Verify missed it because its public-path sample only picks public rows.
- Full scale. **Plan 02** maps them to v5 `unlisted`.
- Profiles have the same gap: 1,381 v4 users have a public profile, which v4 serves to anyone, and
  the identity seed makes every v5 account private. The operator chose to copy the flag.
  **Plan 12.**

### F3 — Clip pointers in history and queue are lost (12 verify failures)

- In 12 accounts, 1 to 13 playback rows each (40 rows total) point at a v4 clip the copy did not
  write as a clip: 25 are official chapters or soundbites, 15 are another user's clip.
- In all 40 the parent episode is in the account's v5 history, so the listening record survives.
  What is lost is the clip pointer.
- `eFv5NFx` has 8 of these. One of them points at a clip that is already in v5 (its owner was in
  the pilot) and still was not linked, because the playback copy only looks at the account's own
  clips.
- Full scale: copy order decides whether another user's clip exists yet. **Plan 05** links it
  when it exists, records a pending row when it does not, and lets replay attach it later.
  Official chapters stay as the parent episode, recorded as a resolved pending row.

### F4 — A followed playlist is dropped when its owner is copied later (1 verify failure)

- The copy skips a playlist follow when the playlist is not in v5 yet, and writes no pending
  row. Replay has nothing to finish.
- In the pilot the owner was not picked. In a full migration the owner is copied, but if the
  follower is copied first the follow is lost.
- Full v4: 32 playlist follows across 32 accounts. **Plan 04** adds a `follow_playlist` pending
  row that replay resolves.

### F5 — History past 10,000 rows (1 verify failure; outlier)

- v5 keeps at most 10,000 rows per queue (`enforce_queue_resource_limit`) and evicts the oldest
  history row first. Played state lives only in queue history.
- The pilot's largest-history account has 54,176 history rows; v5 kept 10,000.
- **Outlier profile:** account created 2025-08-22. Every row is `completed` with position 0, and
  all 54,176 were written in 72 distinct minutes over three days, up to 3,543 in one minute,
  across 106 podcasts. This matches the legacy app's "Mark all as played" per podcast. The account
  now has 0 subscriptions, 1 queue item, 1 playlist, no clips, no membership. Not harmful; the
  rows are played markers, not listening.
- Full v4: 25 accounts over 10,000 history rows (largest 54,176), 105 over 5,000. About 174,000
  rows would be evicted. About 11 of the 25 are bulk-marked like this one; the rest were written
  across 1,000 to 5,800 distinct minutes and look like real long-term listening.
- Full scale. **Plan 06** grandfathers them with a per-account queue limit tier, following the
  `max_follows` pattern.

### F6 — A non-URL Add by RSS value refuses the whole group (1 library failure)

- `addByRssFeedUrlForCopy` falls back to the raw string when it is not an http(s) URL. The
  `varchar_url` domain rejects it, and the whole Add by RSS group rolls back. The pilot account
  lost all 30 of its feeds over 8 values starting with `#`.
- Full v4: 31 accounts hold 275 values that are not http(s) URLs. 230 of them belong to one
  account and are Android `content://` file references; the rest are hashtags, JSON fragments,
  words, and a `file:///` path. 12 more are fixable (uppercase scheme, a leading space,
  `https:/`), and the existing canonicalizer already repairs those.
- Full scale. **Plan 03** skips values that are not feed URLs and counts them.

### F7 — Feed parse failures need a recorded reason (249 feeds, 3.2%)

Classified from the parser logs, by distinct feed:

| Reason | Feeds |
| --- | --- |
| HTTP 404 | 132 |
| HTTP 410 | 22 |
| HTTP 403 | 8 |
| HTTP 5xx | 6 |
| Body over 20 MiB | 32 |
| DNS lookup failed | about 30 |
| TLS certificate errors | 7 |
| Request canceled (timeout) | 21 |
| Not a feed (HTML page, no `channel`) | about 28 |
| No feed URL for the Podcast Index id | a few |
| `numeric field overflow` | 1 |

- Only the generic "Migration feed parse did not finish" reaches the retry job, and HTML bodies
  are written to the log.
- Full scale: a full migration seeds about 63,786 subscribed feeds, so expect roughly 2,000
  failures. **Plan 07** records a classified reason and stops logging bodies.

### F8 — Large popular feeds over the 20 MiB body cap (32 feeds; outlier)

- 32 distinct feeds exceeded `PARSER_MAX_FEED_BODY_BYTES` (20 MiB): 14 on Omny, 8 on Megaphone,
  2 on Simplecast, 2 on `rss.pdrl.fm`, and one each on Art19, Acast, Flightcast, RedCircle,
  Amperwave, and Libsyn. These are large, active shows with long back catalogs, not junk.
- The parser already supports `feed.max_response_body_bytes_override` (up to 50,000,000) and an
  `OversizedDetected` condition, but nothing raises the override for a migration feed.
- Full scale: about 0.4% of feeds, so roughly 250 shows. **Plan 09** raises the override for
  v4-subscribed feeds that hit the cap and retries them once.

### F9 — Item duration overflows `NUMERIC(10,2)` and fails the whole feed

- `compatItemAboutDto` writes `parsedItem.duration.toFixed(2)` with no bound. A duration of
  100,000,000 seconds or more overflows `media_player_time` and the whole feed parse fails.
- Full v4: 920 episodes carry a duration that large (feeds that publish milliseconds or bytes).
- Full scale, and it affects regular v5 parsing too, not only migration. **Plan 10.**

### F10 — The retry ladder never settles in a reasonable time

- Backoff after attempts 1–5 is 1 hour, 6 hours, 1 day, 3 days, 7 days. A permanently failing feed
  settles after about 11 days. The catalog wait has no deadline and counts every pending retry.
- The pilot needed the operator to mark 199 jobs failed by hand.
- The rehearsal prompt says not to start `scheduled_jobs_run_due`, but the retries only run
  through it.
- Full scale. **Plan 08** settles permanent failures early and gives the wait an end;
  **plan 11** fixes the prompt.

### F11 — Email-case twins: the losing row's library is dropped (decision for the operator)

- v4 stores 50 addresses twice with different letter case. v5 stores one lowercase address. The
  seed keeps one row by the rule in `_WAKE-UP.md` and drops the other row's library.
- In 36 of the 50 pairs, the dropped row also had use.
- This is a documented decision, but it conflicts with grandfathering. Merging the dropped row's
  library into the kept account is possible: the library copy is per v4 id and already
  deduplicates follows and playback. **The operator chose to merge. Plan 13.**

### F12 — Other outliers checked; none suspicious

| Pick | Size | Verify | Profile |
| --- | --- | --- | --- |
| Largest Add by RSS | 5,215 feeds over 3,645 hosts | passed | News, blog, Reddit, and Google News feeds next to podcasts: an RSS reader import. Grandfathered at the 10,000 tier. Its first signed-in launch will request many Add by RSS parses. |
| Largest subscriptions | 4,314, all existing, 4,129 public | passed | Plausible bulk or OPML import. Grandfathered at the 5,000 follow tier. |
| Largest clips | 811 clips | failed on F3 only | Normal heavy clipper. |
| Largest playlists | — | failed on F3 only | Premium account, normal use. |
| Largest playlist | 467 items | passed | Normal. |
| Just over the directory follow default | 503, 563, 681 | 2 failed, on F6 and F3 | The caps themselves worked. |
| Just over the Add by RSS default | 102, 163, 176 | passed | The tiers worked. |

Also seen, no action: 15 user clips in v4 end before they start (13 owners). v5 has no check on
clip times, so they copy as they are.

### F13 — Scale and timing for the full run

- Full v4: 22,510 users, 15,166 with subscriptions, 63,786 distinct subscribed feeds, 2,757,743
  history rows. The catalog also seeds viewed and library-only shows, so it is larger than the
  subscribed count.
- The pilot checkout carries an uncommitted change to `seedStageCatalog.ts` that counts a show as
  viewed only at a play count of 3 or more. It is not on this branch. Decide whether to commit it
  before the full run; the catalog size depends on it.
- The pilot's library copy of the largest-history account took 1,370 seconds with its queue held
  at 10,000 rows.
- At the pilot's parse rate (three parser processes), seeding the full catalog takes about a day
  and a half before retries. Plan 08's deadline matters most here.
- The library copy ran about 20 accounts a minute. At that rate the full library phase takes
  about 19 hours, plus the large-history accounts. `enforce_queue_resource_limit` counts the whole
  queue on every insert, which is what makes those accounts slow; plan 06 covers that.

## What the operator does now

Nothing. The pilot run is finished and its database stays as it is for reference. After this set
lands, run the cumulative verification and the pilot again with the commands in
[00-EXECUTION-ORDER.md § Cumulative verification](00-EXECUTION-ORDER.md#cumulative-verification).
A local list of the v4 ids behind each finding is in the pilot checkout at
`.artifacts/v4-full-rehearsal/20261114T034901Z/outliers-local.md` (gitignored; never commit it).
