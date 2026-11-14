# Full local migration rehearsal — summary

Request: [00-REQUEST.md](00-REQUEST.md). Area prompts, models, and waves:
[../abcplan-v4-full-local-migration-rehearsal/COPY-PASTA.md](../abcplan-v4-full-local-migration-rehearsal/COPY-PASTA.md).

Copy every v4 account from the prod-copy snapshot into a local v5 database, in the
phases and stages already written in
[16](/docs/proposals/v4-to-v5-migration/16-full-local-migration-rehearsal.md). An
agent runs it overnight from compact statistics. Plan that doc. The account-cap
rules in [07](/docs/proposals/v4-to-v5-migration/07-account-and-data-migration-model.md)
stay as written.

Settled choices in the request stay settled. This file only groups them.

## Requirement ledger

- **R1** (area H) "running a full migration for all of the users into localhost" / "a thorough process like this to be done locally" — Plan: 80, 82, 84
- **R2** (area I) "we want to run it in a way where I can give that task to an agent to do" — Plan: 90
- **R3** (area E) "if an error happens along the way, it can flag and save those errors. To a log file" / "log any errors that surface during that process" — Plan: 50
- **R4** (area E) "saved somewhere that it won't be committed because we want to not accidentally reveal personally identifying information" — Plan: 50
- **R5** (area E) "we do want to identify as we migrate any issues that we uncover as we try migrating accounts" — Plan: 50
- **R6** (area E) "don't want to stream an absurd amount of text to the LLM agent and incur unnecessary costs" — Plan: 50
- **R7** (area E) "monitor the statistics of what is successful and what isn't" — Plan: 50
- **R8** (area D) "a phased approach of sorts" / "begins with a preliminary run of a small set before we run the full set after that" — Plan: 40
- **R9** (area C) "maintain compatibility after the migration as much as possible" — Plan: 30
- **R10** (area B) "the snapshot that we are testing with is a bit out of date with what the final database will be" / "we can't anticipate things like which user IDs go over certain limits that need to be handled in a special way" — Plan: 20, 22
- **R11** (area B) "conditionally detect which accounts need which rules" — Plan: 20, 22
- **R12** (area I) "when an issue is obvious" / "the agent to just go ahead and fix the issue" — Plan: 90
- **R13** (area I) "when an issue is not obvious" / "a deferred task for later, which gets saved in a file somewhere" — Plan: 90
- **R14** (area I) "run this long operation overnight" — Plan: 90
- **R15** (area I) "after it completes any deferred tasks, the operator can work with the agent to decide how to fix" — Plan: 90
- **R16** (area I) "exclusively use Grok 4.7" / "Every planning step and every implementation prompt uses Cursor Grok 4.7 only. Do not name Opus 5.5 or Codex 5.3." — Plan: 90
- **R17** (area I) "whatever the lowest thinking level is that you are confident will be able to handle the task" / "Extra high is allowed when the reasoning table calls for it (a database migration, resume and idempotency, or a cap-tier write). Do not put the whole set on one level." — Plan: 90
- **R18** (area B) "An account over a v5 default keeps its whole v4 library. The copy writes the smallest tier that covers the count, chosen from that account's counts at copy time. No id list is fixed from the snapshot." — Plan: 20, 22
- **R19** (area B) "Add by RSS tiers: 200, 300, 400, 500, 1000, 10000." — Plan: 20, 22
- **R20** (area B) "Directory-follow tiers: 1000, 2000, 3000, 4000, 5000, 10000." — Plan: 20, 23
- **R21** (area B) "An account at or under the default gets no override." — Plan: 20, 22
- **R22** (area B) "Past 10,000, that group is `needs_operator` and is not copied. Nothing is truncated. Migration never writes Unlimited. The account's other groups still copy." — Plan: 20, 22, 23
- **R23** (area B) "After the copy, the tier is the cap. Removing rows does not lower it." — Plan: 22
- **R24** (area B) "The directory-follow cap is not shipped. When it ships, it assigns the same tier to every existing account already over 500." — Plan: 20, 23
- **R25** (area B) "A cap with no per-account override, including the 10,000 resources per playlist trigger, is `needs_operator` for that group." — Plan: 24
- **R26** (area B) "Any other refusal while copying a row is an error class. Nothing is swallowed." — Plan: 21
- **R27** (area D) "The snapshot is older than the database the real copy reads. Pilot membership is picked by rule when the stage starts. Counts in the docs are examples." — Plan: 40
- **R28** (area H) "Phases, in order, across every account in the stage" — Plan: 82
- **R29** (area H) "preflight with a local database dump" — Plan: 81, 82
- **R30** (area H) "identity" — Plan: 83, 84
- **R31** (area F) "catalog seed and parse until settled" — Plan: 60
- **R32** (area H) "library copy" — Plan: 84
- **R33** (area H) "replay until a pass resolves nothing new" — Plan: 84
- **R34** (area G) "membership" — Plan: 70
- **R35** (area C) "a per-account check" — Plan: 30
- **R36** (area C) "every v4 row is written, pending, or dropped for an allowed reason" — Plan: 30
- **R37** (area C) "clips and playlist members are never dropped" — Plan: 30
- **R38** (area C) "the bcrypt hash matches byte for byte" — Plan: 30
- **R39** (area C) "public v4 ids still resolve" — Plan: 30
- **R40** (area C) "membership matches" — Plan: 30
- **R41** (area C) "caps did not cut a library" — Plan: 30
- **R42** (area D) "about 100 accounts picked by rule" — Plan: 40
- **R43** (area D) "about 1,000 at random" — Plan: 40
- **R44** (area H) "on a clean database" — Plan: 81, 82
- **R45** (area D) "every account" — Plan: 40
- **R46** (area H) "on a refreshed copy" — Plan: 82
- **R47** (area H) "the full stage once more on a newer copy before go-live" — Plan: 82
- **R48** (area E) "Logs go to `.artifacts/v4-full-rehearsal/<run-id>/`, which is gitignored." — Plan: 50
- **R49** (area E) "No email, name, password hash, raw row, or database URL." — Plan: 50
- **R50** (area E) "The agent reads `summary.json` and up to three example lines of one error class. It does not read the full log." — Plan: 50
- **R51** (area H) "The runner stops itself when more than 5% of the last 200 accounts fail in one phase." — Plan: 82
- **R52** (area A) "Each account's status per phase lives in the local app database" — Plan: 10
- **R53** (area A) "that same record is what the end-of-grace batch and the operator's daily review will use" — Plan: 10
- **R54** (area I) "A class is obvious when the decided docs already say what the row should become, the change is in the migration commands or a helper they call, the same fix covers the whole class, and the fix does not drop a clip or playlist member, change a public id or path, truncate a library, write Unlimited, or add a database migration. The agent makes that fix and retries the accounts in that class." — Plan: 90
- **R55** (area I) "Anything else is appended to `.artifacts/v4-full-rehearsal/<run-id>/deferred.md` (class, count, what it saw, why it was not fixed, three example v4 ids). The agent does not stop to ask, and it does not commit. A class already deferred is counted and not investigated again." — Plan: 90
- **R56** (area I) "Fixes the agent did make go to `fixes.md` in that same folder. Both files are gitignored because they name v4 ids. In the morning the operator decides each deferred entry." — Plan: 90
- **R57** (area I) "One prompt runs the stages in order. A deferred class does not stop the next stage." — Plan: 90
- **R58** (area I) "A stalled prompt stays on Grok and is rerun one reasoning level higher. It is not moved to another model." — Plan: 90
- **R59** (area I) "Plans resolve every either/or and name exact paths, because Grok follows the plan instead of designing it." — Plan: 90
- **R60** (area B, step 11) A stored `max_add_by_rss_feeds` under the feed count and at or under 100 is cleared so the default of 100 applies, and the feeds copy. A stored number that already covers the count stays. — Plan: 20, 22
- **R61** (area I, step 12) `needs_operator`, `email_case_left_out`, and `identity_not_done` are written to `deferred.md`. Status stays. The agent does not investigate them. — Plan: 90

## Seams

Wave 1 areas plan in parallel. An area may add files under the paths it owns. It
does not take another area's path, and it does not add
`apps/workers/src/commands/orm/v4Rehearsal/index.ts`.

- **Phase status (area A owns the table and the writer).** Status values are pending, done, failed, deferred, and `needs_operator`, per phase, in the local app database. Area H is the only writer besides A's module. The library copy, the catalog phase, the membership phase, the pick, and the log do not write this table.
- **`needs_operator` (area B owns the copy result).** The library copy reports that class on its result, copies the account's other groups, and leaves the status row to area H.
- **Cap storage.** Add by RSS uses the existing `max_add_by_rss_feeds` column. Area A owns the only new linear migration in this set (the status table) and the baseline regen. Area B does not add a migration. The directory-follow cap stays unshipped; the copy logs the tier it would write. If area B finds a missing column, it says so under Notes for later prompts and leaves the migration number alone.
- **One worker command (area H owns registration).** `packages/worker-commands/src/registry.ts`, `apps/workers/src/commands/index.ts`, `apps/workers/src/lib/startup/categoriesForCommand.ts`, the workers `package.json` script, and `apps/workers/ENV.md` are area H. Other areas export functions for H to call.
- **Doc 16 stays the spec.** No area edits `docs/proposals/v4-to-v5-migration/16-full-local-migration-rehearsal.md`.

## What this set builds, and what it leaves

Builds the runner, the status record, cap tiers written at copy time, the
per-account check, the pilot pick, the run folder, and the overnight prompt.
Doc 16 "What it builds" is that list, including `--stage`, `--phase`, `--resume`,
`--retry-failed`, and `--limit`, and the same local-database refusal the
existing v4 commands use.

Leaves the phone-storage spike, the end-of-grace batch, and the daily review
screen. Those later reads use the record from area A. Leaves shipping the
directory-follow cap, refreshing `V4_DATABASE_URL`, and the management tier
screen in `.llm/plans/active/account-add-by-rss-cap-500.md`. This set writes
`max_add_by_rss_feeds` during the copy. R23 means the copy writes that tier and
does not shrink it when rows are removed.

## Areas

### Area A — Account phase status

- **Rows:** R52, R53
- **Starts from:** `infra/k8s/base/ops/source/database/linear-migrations/app/0009_product_membership_shared_add_by_rss_limit.sql`, `API_EXPECTED_MIGRATION_FILENAME` in `infra/k8s/base/api/source/api.env` and `infra/k8s/base/ops/kustomization.yaml`, and doc 16 "Where state lives".
- **Depends on:** none.
- **Shares files with:** none. Area H imports the writer and does not edit it.
- **Owns:** the next app linear migration after `0009`, the generated baselines via `make db_regen_linear_baseline` (both gz archives; do not hand-edit them), the app readiness marker, the ORM entity and service, and `apps/workers/src/commands/orm/v4Rehearsal/accountPhaseStatus.ts`. The management readiness marker stays. This area does not build the grace batch or the daily review.
- **Plan number block:** 10–19
- **Wave:** 1. Planning step 02.

### Area B — Cap tiers on library copy

- **Rows:** R10, R11, R18, R19, R20, R21, R22, R23, R24, R25, R26
- **Starts from:** `apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts`, `copyAccountLibraryApply.ts`, `copyAccountLibraryLib.ts`, doc 07 "Account caps v4 did not have", and `max_add_by_rss_feeds` on `packages/orm/src/entities/account/accountMembershipStatus.ts`.
- **Depends on:** none.
- **Shares files with:** none. Area H calls `v4CopyAccountLibrary` and does not edit these files.
- **Owns:** the three library-copy files and their tests. Writes the existing Add by RSS override. Logs the directory-follow tier it would write. Reports `needs_operator` on the result. No linear migration.
- **Plan number block:** 20–29
- **Wave:** 1. Planning step 03.

### Area C — Compatibility check

- **Rows:** R9, R35, R36, R37, R38, R39, R40, R41
- **Starts from:** doc 16 "What compatible means", and the counts `v4CopyAccountLibrary` already returns.
- **Depends on:** none.
- **Shares files with:** none.
- **Owns:** `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.ts` and its test. Returns the pass or the error class. Does not write the status table. The full stage's public-path sample requests the local web app; this area does not change web routes unless a check has no existing page.
- **Plan number block:** 30–39
- **Wave:** 1. Planning step 04.

### Area D — Stage pick

- **Rows:** R8, R27, R42, R43, R45
- **Starts from:** doc 16 "Stages" (the pilot rules, the random sample, and every account). v4 reads stay read-only, using the same select style as `copyAccountLibrary.ts`.
- **Depends on:** none.
- **Shares files with:** none.
- **Owns:** `apps/workers/src/commands/orm/v4Rehearsal/pickStageAccounts.ts` and its test. Returns the v4 ids and the pilot rule for each. Area E writes `pick.json`. Area H passes this result to E. The clean-database restore, the refreshed copy, and the later full run are area H.
- **Plan number block:** 40–49
- **Wave:** 1. Planning step 05.

### Area E — Rehearsal log

- **Rows:** R3, R4, R5, R6, R7, R48, R49, R50
- **Starts from:** doc 16 "Errors and logs" and "How an agent runs it", `packages/helpers-backend/src/redactForLog.ts`, and `.gitignore` (`.artifacts/` is already ignored).
- **Depends on:** none.
- **Shares files with:** none in this set. Only this area may change `redactForLog.ts`, and only for an email-shaped string the helper does not already replace.
- **Owns:** `apps/workers/src/commands/orm/v4Rehearsal/rehearsalLog.ts` and its test. File shapes: `run.json`, `pick.json`, `errors.jsonl`, `summary.json`, `summary.md`, `deferred.md`, `fixes.md`, and `dumps/`. Progress line every 100 accounts or 60 seconds. Area H performs the 5% stop (R51) and the database dump; this area defines the folder and the redaction those writes pass through.
- **Plan number block:** 50–59
- **Wave:** 1. Planning step 06.

### Area F — Catalog settle

- **Rows:** R31
- **Starts from:** `apps/workers/src/commands/orm/v4Catalog/seedAccountCatalog.ts`, `seedAccountCatalogLib.ts`, doc 05 "Launch queue", and doc 16 phase 2. The full stage also includes shows that only appear on a clip, playlist, or playback row. Pilot and sample seed only the shows their accounts need.
- **Depends on:** none.
- **Shares files with:** none.
- **Owns:** the existing catalog seed files, their tests, and `apps/workers/src/commands/orm/v4Catalog/seedStageCatalog.ts` when one account's command is the wrong shape. Returns settled and failed-parse counts. Does not write the status table. Resume across a crash is area H.
- **Plan number block:** 60–69
- **Wave:** 1. Planning step 07.

### Area G — Membership phase

- **Rows:** R34
- **Starts from:** `apps/workers/src/commands/billing/importLegacyMembershipExpiry.ts` and doc 16 phase 5: rebuild the paid-expiry file in the same sitting, then that command. A future paid v4 expiry is Premium with that expiry. A carried trial is Trial. Nothing else is a grant. The pass check is area C (R40).
- **Depends on:** none.
- **Shares files with:** none.
- **Owns:** `apps/workers/src/commands/billing/rebuildLegacyMembershipExpiryFile.ts`, and `importLegacyMembershipExpiry.ts` only where the file it already accepts needs a change. Exports a function. Does not register a worker command.
- **Plan number block:** 70–79
- **Wave:** 1. Planning step 08.

### Area H — Rehearsal runner

- **Rows:** R1, R28, R29, R30, R32, R33, R44, R46, R47, R51
- **Starts from:** `packages/worker-commands/src/registry.ts`, the local-database refusal in `copyAccountLibrary.ts` (`DB_HOST`), and doc 16 "Phases", "Stages", and "What it builds".
- **Depends on:** areas A through G (planning steps 02–08).
- **Shares files with:** none. It imports the modules those areas own.
- **Owns:** `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsal.ts`, the registry row, `apps/workers/src/commands/index.ts`, `categoriesForCommand.ts`, the workers npm script, and `apps/workers/ENV.md`. Calls `v4SeedAccountIdentity` (email-case twins already live in that command), `v4CopyAccountLibrary`, and `v4ReplayLegacyRows`. Loops replay until a pass resolves nothing new. Dumps the local database before each phase. Restores a clean database for the sample and full stages. Reads `V4_DATABASE_URL` and does not refresh the snapshot. Stops when more than 5% of the last 200 accounts fail in one phase. One account's failure does not stop the run.
- **Plan number block:** 80–89
- **Wave:** 2. Planning step 09.

### Area I — Overnight agent prompt

- **Rows:** R2, R12, R13, R14, R15, R16, R17, R54, R55, R56, R57, R58, R59
- **Starts from:** doc 16 "How an agent runs it", the runner command from area H, and the log files from area E.
- **Depends on:** area E (step 06) and area H (step 09).
- **Shares files with:** none.
- **Owns:** one prompt under `.cursor/prompts/`. No product code. R16, R17, R58, and R59 apply to every plan in the set: each plan's model line is Cursor Grok 4.7 at that plan's own reasoning, and Assemble copies those lines. This area's plan states that rule and writes the overnight prompt.
- **Plan number block:** 90–99
- **Wave:** 3. Planning step 10.

## Order

Wave 1 is steps 02–08 (areas A–G). They do not call each other. Wave 2 is step
09 (area H), which calls them. Wave 3 is step 10 (area I), which names the
runner and the log files.

Second pass after the first review: steps 11 and 12. Step 11 revises plans 20
and 22 for R60. Step 12 revises plan 90 for R61. They edit different files.
The other review answers match the plans already written.

Implementation phases are in [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) and
[COPY-PASTA.md](COPY-PASTA.md).

Plan 30's Add by RSS check accepts a stored `max_add_by_rss_feeds` that already
covers the count, including a number above 10000, and then expects the feeds to
be written. A number below the count is `cap_tier`. A count past 10000 with no
covering number is `needs_operator`, the feed rows are absent, and the column
is left as stored.

## Decisions to review

Collected from each area step's `## Decisions`. Settled in
[00-REQUEST.md](00-REQUEST.md) under "Review of the first planning pass".
Two lines below are replaced by that review. The rest stand as written.

### Step 02 — plan 10

- One row per v4 user id and phase, with `account_id` null until the account exists. The other reading was a required account id, which cannot record identity before that row exists.
- No run or stage column. A clean restore clears rehearsal rows, and production keeps one record. A run id would leave the later review with more than one row per account.
- `done` stays `done`. A refused rewrite returns `done_is_terminal` and does not raise. A new stage starts from a restore. Reopening `done` fights the library copy, which already refuses a second apply after `v4_library_copied_at` is set.
- `failed`, `deferred`, and `needs_operator` store a short class and no message. `pending` and `done` store none. The gitignored log keeps the message, which can contain an email.
- Library copied is `done`. Library failed is `failed`. Left is every library row that is not `done`, so a failed copy is also left. The other reading, left equals `pending` only, hides failed copies from the backlog.
- End-of-grace "not yet migrated" is library `pending`. The failure report is library `failed`. `deferred` and `needs_operator` stay in the counts and out of both automatic lists.
- Phases stored: `identity`, `catalog`, `library`, `replay`, `membership`, `verify`. Preflight is a dump, not a per-account row. There is no `skipped` status.
- Delete behavior is `ON DELETE CASCADE`, matching `legacy_pending_row`.
- This writer does not set `v4_library_copied_at`. The library copy already does.

### Step 03 — plans 20, 21, 22, 23

- A stored `max_add_by_rss_feeds` that already covers the count is left as stored, including a number above 10000, and the feeds copy. The other reading is that past 10000 is always `needs_operator`, which would make a rerun after a raise copy nothing. Plans 20 and 22.
- Replaced by the first-pass review (R60). A stored number below the count and at or under 100 is cleared so the default of 100 applies, and the feeds copy. A count over 100 still writes the smallest tier that covers it. Plans 20 and 22.
- Queue, history, and now playing are not skipped at 10000. That trigger deletes a row instead of raising, and those groups have no refusing cap. The other reading is to hold the whole playback group for an operator. Plan 21.
- Directory follows past 10000 are not copied, even though that cap has no column and nothing in the database would refuse the rows. The other reading is to copy them and only log the tier. Plan 23.
- `v4_library_copied_at` stays null when any group is `needs_operator` or has an error class, so the same command can run again. The other reading is to set the timestamp and have the runner clear it. Plan 21.

### Step 04 — plan 30

- Proof is v4 ids against v5 rows and `legacy_pending_row`, not a second pass of `classifyLibraryCopy`. Those buckets overlap pending with written rows, and they always sum, so they cannot show a missed insert.
- A follow of the account's own id is an allowed omission. The other reading was to fail it as unaccounted because no follow row is inserted.
- The HTTP sample is the first 3 public playlists and the first 3 public user clips, sorted by id, and only when the caller asks. `/profile/:id` is not requested. Seeded accounts are private, and a missing profile redirects to `/profiles`, so that request would not show that the account exists. The account is checked with `legacy_id_map` and `account.id_text`.
- A wrong Add by RSS tier is `cap_tier`. A partial write of a group past 10,000 is `cap_cut`. A group past 10,000 with nothing written is `needs_operator`. The other reading was one class for all three.
- `needs_operator` is returned only after clip drops, cuts, unaccounted rows, the tier, sign-in, public ids, and membership have passed.
- The live password check is a compare function the runner passes, and only for `eFv5NFx`. This plan does not add `bcrypt`. The other reading was hash equality only.

### Step 05 — plan 40

- Pilot fills to 100 after rule matches, and keeps every rule match when those already pass 100. The other reading was dropping lower-priority matches to land on exactly 100.
- Email-case twins are the 5 groups with the smallest `lower(btrim(email))`, every member included. The other reading was every twin on the snapshot, which can be the whole pilot.
- "Just over" is the 3 smallest counts strictly above the doc 07 defaults (Add by RSS 100, directory follows 500, playlist resources 10000). The other reading was a single account, or a fixed band above the default.
- The label order puts `rehearsal` first and paid, trial, and expired before unverified. A rule whose first accounts were already labeled takes the next account in its list. The other reading was the sentence order in doc 16, with no fallback inside a slot.
- The paid slot is 5 accounts: one whose expiry is more than five years ahead, when one exists, then the soonest future expiries. Trial uses the carried 90-day window. The other reading was the five soonest paid expiries only, and any non-null trial date.
- Largest and just-over counts ignore blank array entries. Unverified and no-activity use the identity "has lists" cardinality check. The other reading was one predicate for every rule.
- Sample does not force `eFv5NFx` in. A pilot snapshot without that id simply has no `rehearsal` row. Random order is `md5(id || seed)`. The other reading was SQL `random()`, which changes on every call.

### Step 06 — plan 50

- Leave `packages/helpers-backend/src/redactForLog.ts` unchanged. The rehearsal writer calls it for object keys, then scans the string for an email, a bcrypt hash, a database URL, URL userinfo, and a `password=` assignment. The other reading was to scrub emails inside every string in the shared helper, which would change API and worker logs and still would not cover hashes or database URLs.
- `dumps/<phase>.dump` is the local database image area H writes, so it can contain account rows. The text files do not. The other reading was to skip the dump so that no file in the folder could hold a row.
- A person's name in a free-text sentence is not detected. A row-shaped message becomes `[dropped]`, and extra keys such as `email` and `name` are not written. The other reading was a name pattern, which would miss real names and cut real error text.
- `summary.json` `rate` is the whole phase so far: `failed / (done + failed)`. Area H keeps the last-200 window and calls `recordStop` when that window is over 5%. The other reading was to store the last-200 figure in `rate`, which would drop the phase total.
- The progress line also fires once at phase start and once from `finishPhase`, as well as every 100 accounts or 60 seconds. The other reading was only the 100/60 rule, which stays silent for the first minute.

### Step 07 — plan 60

- The phase waits until `isV4MigrationFeedSettled` is true for every mapped feed, including the migration retry ladder. The other reading was to return after the first parse finishes or fails. A feed that keeps failing can hold this phase for days. There is no timeout.
- A failed parse is a count plus the v4 podcast ids. The function still returns. The other reading was to throw and stop the stage.
- A second call queues a first parse only when that channel's `id_text` is the v4 podcast id and no parse has started, and it does not reset an existing retry job. The other reading was to never queue a show that already has a local channel.

### Step 08 — plan 70

- The paid-expiry file contains only the caller's v4 ids. The other reading was the full `users` export. A stage phase must not grant accounts that are not in the stage.
- The caller passes one `now`, and the import uses it as `starts_at`. The other reading was `new Date()` inside each function. Plan 30 expects a capped `ends_at` to equal that grant's `starts_at` plus five UTC years, and a later retry must not move the end.
- Two ids that share a lowercase email and both have an expiry are left out of the file. The other reading was keeping the later date. That would attach the left-out twin's expiry to the kept account.
- Counts come back from the import function. There is no `--report` and no new CLI flag. A report contains emails, which the run folder cannot hold.
- Area H writes the CSV under `os.tmpdir()` and deletes it after the import. The other reading was a file in the run folder. Those named files must not contain an email.

### Step 09 — plans 81, 82, 83, 84

- The run before go-live is a later `--stage full` after the snapshot is replaced. One overnight pass is pilot, then sample, then full once. The command does not refresh `V4_DATABASE_URL`. Plan 82.
- The 5% stop waits for 200 finished accounts in that phase. Ten failures in that window do not stop it. Eleven do. Plan 82.
- A replay pass that does not lower the eligible-row count finishes successfully, including accounts that still have unresolved rows. Plan 84.
- A left-out email-case twin is `deferred` with class `email_case_left_out` on identity and every later phase, and it is not an error line. Plan 84.
- The identity command returns its action so a bad row is not treated as a left-out twin. Plan 83.
- The app logger is silent during the run. The agent watches stdout lines that start with `rehearsal `. Plan 82.
- `--limit` slices the status list in `v4_user_id` order. It does not shrink the full-stage catalog. Plans 82 and 84.
- The clean image is `.artifacts/v4-full-rehearsal/clean.dump`. Pilot writes it when it is missing. Sample and full restore it unless the run is resuming or a single phase. Plans 81 and 82.
- A restore closes this process's pools and disconnects other client sessions on the local app database. Plan 82.

### Step 10 — plan 90

- The agent investigates only after the stage process exits, so it does not race a live phase.
- A retry after a clean exit passes `--phase`. A retry after `rehearsal_stopped` does not, so later phases still run.
- `fix` is recorded only after the class count drops. An edit that does not drop the count is reverted and deferred. One edit per class for the night.
- A class starting with `unexpected:` is deferred. Those log lines have no message and no stack.
- Replaced by the first-pass review (R61). `needs_operator`, `email_case_left_out`, and `identity_not_done` are written to `deferred.md`. Their status stays, and the agent does not investigate them. `parse_failed` stays as planned: it may be deferred and does not change account status, because that id is a podcast id. Plan 90.
- Chat sees counts. Example ids stay in the run folder except the three lines for the class being investigated.
- For `--stage full`, an empty `WEB_DOMAIN` or `localhost:3000` becomes `localhost:3002` on the spawned process. The web app serves port 3002.
