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
6. **Caps did not cut anything.** Over-default groups have the tier from 07.
   Past 10,000 is `needs_operator`, not a partial copy.

## Phases

Each phase runs across every account in the stage before the next phase
starts, because a library copy must not start before its shows have parsed.

| Phase         | Work                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------- |
| 0. Preflight  | Local database only. Record the snapshot's newest `users.updatedAt`, and dump the local database. |
| 1. Identity   | `v4SeedAccountIdentity` per account. Email-case twins use the rule in `_WAKE-UP.md`.              |
| 2. Catalog    | Seed the shows the stage needs, queue the parses, and wait until those feeds are settled.         |
| 3. Library    | `v4CopyAccountLibrary` per account, writing cap tiers first.                                      |
| 4. Replay     | `v4ReplayLegacyRows` until a pass resolves nothing new.                                           |
| 5. Membership | Rebuild the paid-expiry file in the same sitting, then `billingImportLegacyMembershipExpiry`.     |
| 6. Verify     | The checks under [What compatible means](#what-compatible-means), per account.                    |

The catalog phase for the full stage is the
[launch queue](05-id-mapping-and-catalog-seeding.md#launch-queue) plus shows
that only appear on a clip, playlist, or playback row. It is the slowest
phase. Its time to settle and its failed-parse count are results, not
something to skip. The pilot and sample stages seed only the shows their
accounts need.

Before each phase, the runner dumps the local database into the run folder,
so a bad phase is undone by a restore instead of a reseed.

## Stages

| Stage  | Accounts                                                   | Moves on when                                                                  |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Pilot  | About 100, picked by rule                                  | Zero `unaccounted`, and every error class is fixed or accepted by the operator |
| Sample | About 1,000 picked at random, on a restored clean database | Same, and the rate gives a full-stage estimate                                 |
| Full   | Every account, on a refreshed copy and a clean database    | The operator accepts the remaining classes                                     |

The pilot rules pick, from the copy as it is that day, the largest account in
each group (Add by RSS, subscriptions, clips, history, playlists, playlist
size), accounts just over each cap default, email-case twins, unverified
accounts, paid, trial, and expired memberships, accounts with follows of
other accounts, accounts with default playlists, accounts with no activity,
and `eFv5NFx`. The rest is random. The pick is written to the run folder.

A fix found in a stage is made in the commands, then the stage reruns from a
clean database. Accepted classes are written into this doc with their counts.

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

| File           | Holds                                                                                |
| -------------- | ------------------------------------------------------------------------------------ |
| `run.json`     | Stage, phase, snapshot date, start time, flags                                       |
| `pick.json`    | The v4 ids in this stage, with the pilot rule each was picked by                     |
| `errors.jsonl` | One line per error: v4 id, phase, group, class, message, time                        |
| `summary.json` | Per phase: done, failed, skipped, rate, estimate left; per class: count and 3 v4 ids |
| `summary.md`   | The same counts, no ids. Safe to quote in these docs.                                |
| `dumps/`       | The local database dump taken before each phase                                      |

No file holds an email, a name, a password hash, or a raw v4 row. Error
messages pass through the shared log redaction, and an email-shaped string is
replaced before it is written. A database URL is never logged.

## How an agent runs it

The agent does not read the log as it streams. The runner prints one line
every 100 accounts or 60 seconds: phase, done of total, failed, rate, and
estimate. The agent starts it in the background and waits on that output.

When a phase ends or the runner stops itself, the agent reads `summary.json`
only. It takes the largest error class, opens up to three of its lines in
`errors.jsonl`, and reads the v4 and v5 rows for those ids locally. Then it
either fixes the cause in the commands or reports the class to the operator.
One investigation covers every account in that class.

The agent never pastes an email, a raw row, or a v4 id other than
`eFv5NFx` into chat, a doc, or a commit. Class names and counts are fine.

The agent prompt goes in `.cursor/prompts/` with the runner. Each stage is
one prompt. The operator starts the next stage.

## Where state lives

The runner keeps each account's status per phase (pending, done, failed,
`needs_operator`) in the local app database, so a crash or rerun resumes where
it stopped and skips finished accounts. The end-of-grace batch
([13](13-forced-migration-and-v4-shutdown.md)) and the operator's daily review
of copied, remaining, and failed accounts
([12](12-production-launch-and-grace-period.md)) need the same record. The
plan set builds one record for all three.

## What it builds

One plan set, after this doc is accepted:

- A runner worker command over the existing per-account commands, with
  `--stage`, `--phase`, `--resume`, `--retry-failed`, and `--limit`. It
  refuses a non-local database, like the commands it runs.
- Cap tiers written by `v4CopyAccountLibrary`, and `needs_operator` past
  10,000 ([07](07-account-and-data-migration-model.md#account-caps-v4-did-not-have)).
- The per-account check in [What compatible means](#what-compatible-means).
- The pilot pick rules.
- The run folder files and the agent prompt.

## Honest limits and risks

- The full catalog phase parses tens of thousands of feeds on one machine. It
  can take days and a lot of disk. The run records database size per phase.
- Only the rehearsal account's password is known, so other sign-ins are
  checked by hash, not by signing in.
- A refreshed copy can show classes the old one did not. That is why the full
  stage reruns before go-live.
- The phone-storage spike in [08](08-mobile-first-launch-migration.md) is not
  part of this. This rehearsal covers the server copy only.
