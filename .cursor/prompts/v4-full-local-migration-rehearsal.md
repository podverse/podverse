# Full local migration rehearsal

The overnight agent follows this file. It does not follow the finished inventory prompt.

## Who runs it

The operator message "Run the full local migration rehearsal overnight prompt" means follow
this file. Run it on Cursor Grok 4.7, reasoning high. If that run stalls, rerun this same
file one reasoning level higher, still on Cursor Grok 4.7.

One prompt runs every stage. Do not ask the operator a question. Do not commit. Do not
push. Do not open a pull request. Leave edits in the working tree.

## What it runs

From the monorepo root, three processes, each with a new run id. Do not pass `--resume`
between them. Do not pass `--limit`. Do not pass `--dry-run`. Do not start a second
`--stage full`.

```bash
npm run build:packages
npm run build -w apps/workers
npm run v4_run_full_rehearsal -w apps/workers -- --stage pilot
npm run v4_run_full_rehearsal -w apps/workers -- --stage sample
npm run v4_run_full_rehearsal -w apps/workers -- --stage full
```

The command is `v4RunFullRehearsal`. Phases, in order: preflight, identity, catalog,
library, replay, membership, verify. One account failure does not stop the run. The
process stops itself when more than 5% of the last 200 finished accounts in one phase
failed. Ten failures in a full window do not stop it. Eleven do. A phase with fewer than
200 finished accounts does not stop on rate.

Sample and full restore `.artifacts/v4-full-rehearsal/clean.dump` unless the process is a
resume or a single `--phase`. Pilot writes that file when it is missing and does not
restore it. The first pilot has to start from a local database that does not already hold
rehearsal accounts. This command reads `V4_DATABASE_URL` and does not refresh it. Do not
replace the snapshot. The later full run, after the operator replaces the snapshot, is
another night.

Build before the first stage. Build again after every code edit that the focused test
kept, `npm run build:packages` and then `npm run build -w apps/workers`. If that build
fails, `git checkout --` the files of that edit and treat the class as deferred. If the
first build fails before any stage, stop the night and say the build failed. Do not start
a stage on a stale `dist`.

## Launch script

Write `.artifacts/v4-full-rehearsal/launch-stage.mjs` once. Do not commit it. It is the
only way to start a stage.

- Repo root is `path.resolve(import.meta.dirname, '../..')`.
- Resolve `V4_DATABASE_URL` from the process environment. When that is empty, read
  `~/.config/podverse/v4-database-url` (`KEY=value`, `#` comments). When the file is
  missing, the key is missing, or the value contains `REPLACE_WITH_`, print `url=missing`
  and exit 1. Do not search the machine. Do not print the value, and do not put it in
  argv.
- Spawn `npm` with args `run`, `v4_run_full_rehearsal`, `-w`, `apps/workers`, `--`, then
  the flags below. Set `V4_DATABASE_URL` on the spawned process environment. Detach that
  process. Redirect its stdout and stderr to a new log file. Print `pid=<pid>` and
  `log=<path>` and exit.
- A new stage log is `.artifacts/v4-full-rehearsal/stdout-<stage>.log`. A resume log is
  `.artifacts/v4-full-rehearsal/stdout-<stage>-<runId>.log`.
- Flags for a new stage: `--stage` only.
- Flags for a resume: `--stage`, `--resume`, `--run-id`, `--retry-failed`, and `--phase`
  only when this prompt says to pass `--phase`.
- When `--stage` is `full` and `WEB_DOMAIN` is empty or `localhost:3000`, set the spawned
  process `WEB_DOMAIN` to `localhost:3002`. Any other non-empty value stays. Do not edit
  an env file. The web app serves `next dev -p 3002`.
- Do not print any other environment value. A second new `--stage full` is refused by the
  prompt text above, not by a lock file. The later full run, after the snapshot is
  replaced, is another night and must be able to start.

Before sample or full, if `clean.dump` is missing, stop the night. Do not build a dump by
hand. The message to record is `Missing clean database dump.`

## Parser and web

Catalog waits until feeds are settled. It does not start the parser. A restore disconnects
database sessions, so a parser that was already running does not finish the wait.

- Before pilot, start `npm run dev:workers:parsers` in the background from the repo root
  (**Workers**). Record the pid.
- When a log line `rehearsal restore=finished` appears, stop the pid this prompt started
  and start `npm run dev:workers:parsers` again. Record the new pid. Do not stop a process
  this prompt did not start. If this prompt has not started one yet, start one.
- Do not start `scheduled_jobs_run_due`. Do not add a timeout. The catalog wait is allowed
  to run for days.
- Before `--stage full`, request `http://localhost:3002`. When it does not respond, start
  `npm run dev -w apps/web` in the background (**Dev**) and wait until it responds. When
  it already responds, do not start a second server.

## What the agent reads

Run output is `.artifacts/v4-full-rehearsal/<run-id>/`. The folder is gitignored. Do not
`git add` it.

| File           | Agent                                                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run.json`     | Read it. Stage, flags, `startedAt`. No account rows.                                                                                                                  |
| `summary.json` | Read it only through the mark script's `summary` mode, which drops `exampleV4Ids`.                                                                                    |
| `errors.jsonl` | Do not open it. The mark script streams it.                                                                                                                           |
| `summary.md`   | Counts only. Quoting a count is fine.                                                                                                                                 |
| `pick.json`    | Do not open it.                                                                                                                                                       |
| `dumps/`       | Do not open it.                                                                                                                                                       |
| `deferred.md`  | Do not open it in chat. The mark script lists `##` headings.                                                                                                          |
| `fixes.md`     | Same. Headings and file paths only, through the mark script.                                                                                                          |
| stdout log     | Read lines that start with `rehearsal `. On process exit, also read the last 20 lines. If a line contains `@` or `://`, do not copy that line into the final message. |

The run id is the new directory name matching `/^[0-9]{8}T[0-9]{6}Z$/` that appears after
launch. Confirm `run.json` `stage`. Do not pass `--run-id` on a new stage. The command
makes the id.

Watch the stdout log while the stage process runs. Do not read it from the start on every
poll. A progress line looks like:

```text
rehearsal phase=library done=98 failed=2 skipped=0 total=1000 rate=0.0200 estimate_left_s=9000
```

Catalog wait lines start with `rehearsal phase=catalog`. A restore prints
`rehearsal restore=starting` and then `rehearsal restore=finished`. A rate stop prints
`rehearsal stop=error_rate phase=<phase>` and the process throws `rehearsal_stopped`.
Later phases do not run. `summary.json` `stop` records that. `parse_failed` is logged and
is not part of that window. `needs_operator`, `email_case_left_out`, and
`identity_not_done` are not failures.

Investigate only after the stage process exits. Do not investigate between phases of a
live process.

## Mark script

Write `.artifacts/v4-full-rehearsal/mark-rehearsal.mjs` once. Do not commit it. Repo root
is `path.resolve(import.meta.dirname, '../..')`. Import the built log module from
`apps/workers/dist/commands/orm/v4Rehearsal/rehearsalLog.js` and call
`openRehearsalLog({ runId, now: new Date() })`. Do not reimplement paths. Modes print the
words below and nothing else.

- `summary <runId>` prints `summary.json` with every `exampleV4Ids` removed. When the file
  is missing, print `summary=missing`.
- `examples <runId> <className>` prints at most three `readErrorExamples` lines, one
  compact JSON object per line.
- `headings` walks every `deferred.md` and `fixes.md` under
  `.artifacts/v4-full-rehearsal/*/`. For a deferred heading print `deferred <class>`. For
  a fix heading print `fix <class>`, and for each `- Files:` line print
  `fix-file <class> <path>`. Do not print example ids.
- `left-count <runId>` prints three lines, in this order:
  `left needs_operator count=<n> source=<summary|status|none>`,
  `left email_case_left_out count=<n> source=<status|none>`,
  `left identity_not_done count=<n> source=<status|none>`. `source=none` is only with
  `count=0`. For `needs_operator`, use the stripped `summary.json` class count when that
  count is above 0 (`source=summary`). Otherwise, and for the other two names always, the
  count is the number of distinct `v4_user_id` from the select below (`source=status`).
  When the select fails, keep a `needs_operator` line that already came from
  `summary.json`. Each name that needed the select and did not get it is
  `left <name> mark_failed`. Exit 1 after those three lines. Do not print an id.
- `defer <runId>` reads `<run-dir>/defer-note.json`:
  `{ "className", "count", "saw", "why" }`. Do not print an id.
  - `needs_operator`, `email_case_left_out`, or `identity_not_done`: recompute the count
    with the `left-count` rule. When it is 0, print `count=0` and `status_unchanged` and
    do not call `appendDeferred`. Otherwise call `appendDeferred` with that count, the
    note's `saw` and `why`, and at most three ids from that same rule. Print
    `appended=true count=<n>` or `appended=false count=<n>`, then `status_unchanged`. Do
    not call `setAccountPhaseStatusMany`.
  - `parse_failed`: load at most three ids from `summary.json` and call `appendDeferred`
    with the note's count, saw, and why. Print `appended=true` or `appended=false`, then
    `status_unchanged`. Do not call `setAccountPhaseStatusMany`.
  - Any other class: load at most three ids from `summary.json` and call `appendDeferred`
    with the note's count, saw, and why. Print `appended=true` or `appended=false`. Then
    stream `errors.jsonl`, keep ids for that class whose `phase` is not `preflight` and
    whose `v4Id` matches `/^[A-Za-z0-9_-]{1,32}$/`, and call
    `setAccountPhaseStatusMany({ v4UserIds, phase, status: 'deferred', errorClass: className })`
    once per phase, including when `appended` is false. Print
    `marked phase=<phase> applied=<n> refused_done=<n>`.
- `fix <runId> <className> <retried> <file...>` calls `appendFix`. Print `appended=true`
  or `appended=false`.

Status writes go through `apps/workers/dist/commands/orm/v4Rehearsal/accountPhaseStatus.js`
after ORM is up. Copy the `ormConfig` object from the `CATEGORY_ORM` branch of `runApp` in
`apps/workers/src/index.ts`. Do not add keys. Validate it with `validateORMConfig` and
`assertConfigValid` from `@podverse/helpers-config`, then `createORMContext` from
`@podverse/orm`, then `initialize()` on `dataSourceRead` and `dataSourceReadWrite`.
Dynamic-import the status module after that. `destroy()` both data sources in a `finally`
when they are initialized. On a validation or connection failure, print `mark_failed` and
exit 1. Do not print a connection string. The only SQL is this select, and only from
`left-count` and from `defer` for `needs_operator`, `email_case_left_out`, and
`identity_not_done`. `$1` is that class name and nothing else. Do not run any other
statement.

```sql
SELECT DISTINCT v4_user_id
FROM account_phase_status
WHERE error_class = $1
ORDER BY v4_user_id
```

`count` for an investigated class is the integer on the stripped summary, copied into the
note. `saw` and `why` are short sentences. They must not contain an email, a name, a
password hash, a raw row, a database URL, or a v4 id. The script's redaction is a
backstop. Example ids for an investigated class, including `parse_failed`, come from
`summary.json`, not from the note. Example ids for `needs_operator`,
`email_case_left_out`, and `identity_not_done` come from the `left-count` rule.

## Classes

Before the class walk, run `headings`, then handle `needs_operator`,
`email_case_left_out`, and `identity_not_done`, in that order. Run `left-count`. Append a
name only when its line has `count=` above 0. A `mark_failed` line is not appended and is
not investigated. When any line is `mark_failed`, the final message includes
`left-count failed`. Continue the class walk.

The runner does not write `deferred.md`. `email_case_left_out` and `identity_not_done`
are not error lines, so they are not in `summary.json`. `needs_operator` is an error line
when the runner logged one. This prompt is what appends all three.

When the printed count is 0, do not call `defer` for that name. When the count is above
0, write `defer-note.json` and call `defer`. Do not run `examples`. Do not open an
account. Do not edit code for that class.

- `headings` already lists that name as `deferred`: saw `Same class.` and why
  `Already deferred in an earlier stage.`
- `headings` already lists that name as `fix`: saw `Same class.` and why
  `A fix for this class is already recorded.`
- Otherwise: saw `The runner left this class on the account row.` and why
  `The overnight prompt does not investigate this class.`

`defer` prints `status_unchanged` for these three names. It does not call
`setAccountPhaseStatusMany`. The account status stays whatever the runner wrote.

The class walk skips these three names, including a `needs_operator` line in the stripped
summary. Walk every other class in that summary's order (count descending, then name).

`parse_failed` is investigated once per stage. It is not an account-status failure. The
id on those lines is a podcast id. Defer it when the decided docs do not already say that
feed should parse. `defer` writes that entry and prints `status_unchanged`. Never mark
account status for it.

A class whose name starts with `unexpected:` is not obvious. Defer it. The log line has
no error message and no stack.

A class already listed by `headings` as `deferred` is not investigated. Append one entry
in this run with saw `Same class.` and why `Already deferred in an earlier stage.` Then
mark status, unless it is `parse_failed`, `needs_operator`, `email_case_left_out`, or
`identity_not_done`.

A class already listed as `fix` is not edited again. Append deferred with saw
`Same class.` and why `A fix for this class is already recorded.` Then mark status,
unless it is `parse_failed`, `needs_operator`, `email_case_left_out`, or
`identity_not_done`.

## Obvious fix

A class is obvious only when all of these are true:

- `docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md`,
  `docs/proposals/v4-to-v5-migration/07-account-and-data-migration-model.md` (section
  "Account caps v4 did not have"), or
  `docs/proposals/v4-to-v5-migration/16-full-local-migration-rehearsal.md` already says
  what the row should become.
- The edit is in a file in the allowed list, or in a file that an allowed file already
  imports.
- The same edit covers the whole class.
- The edit does not drop a clip or a playlist member, change a public id or a public
  path, truncate a library, write Unlimited, or add a database migration.

Anything else is deferred. That includes two readings of a doc, a case the docs do not
cover, and a fix outside the allowed files.

Allowed files:

- `apps/workers/src/commands/orm/v4Identity/`
- `apps/workers/src/commands/orm/v4Catalog/`
- `apps/workers/src/commands/orm/v4Library/`
- `apps/workers/src/commands/orm/v4Rehearsal/`
- `apps/workers/src/commands/billing/rebuildLegacyMembershipExpiryFile.ts`
- `apps/workers/src/commands/billing/rebuildLegacyMembershipExpiryFileLib.ts`
- `apps/workers/src/commands/billing/importLegacyMembershipExpiry.ts`
- `apps/workers/src/commands/billing/importLegacyMembershipExpiryLib.ts`

A new file is not allowed. A file under `infra/k8s/` is not allowed. Do not edit doc 16.
Do not edit this prompt. Do not edit `.cursor/prompts/CURSOR-PROMPTS.md`.

Before editing, run `examples` for that class. For those ids, a query may run from the
mark script's folder so the URL stays in the environment. Select id and status or count
columns only. Do not select email, name, display name, password, or a password hash. Do
not `SELECT *`. When a result contains `@`, do not quote it. One investigation covers the
class. Do not open a fourth account.

When the edit's files include a path already printed as `fix-file` for a kept fix, do not
edit. Defer with why `The file already has a kept fix.`

After an edit, run the one Vitest file next to the edited source, from the repo root:

```bash
npm run test -w apps/workers -- src/commands/orm/v4Library/copyAccountLibrary.test.ts
```

Use the real neighbor path. One file. Do not run the full suite, Playwright, or Maestro.
When no neighbor test exists, do not add one. When the test fails, `git checkout --` each
file of this edit and defer the class with why `The focused test failed.`

When the test passes, or there was no test, rebuild and resume. Call `fix` only after the
retry shows the class count dropped. `retried` is the class count from before the retry.
A reverted edit does not get a `fixes.md` entry.

## Retry

Resume uses the same run id and the same stage.

- The stage process exited 0: pass `--phase` of the class. Take the phase from the three
  example lines. When they disagree, use the phase with more of those lines.
- The stage process threw `rehearsal_stopped`: do not pass `--phase`. Pending accounts in
  later phases still have to run.
- Any other non-zero exit: do not retry. Defer the class you were about to fix, or stop
  the night when the text is `Missing V4_DATABASE_URL.`, `invalid_run_id`, a non-local
  database refusal, or `Missing clean database dump.`

```bash
npm run v4_run_full_rehearsal -w apps/workers -- --stage pilot --resume --retry-failed --run-id 20261113T043700Z --phase library
```

That line shows the shape. Use the real stage, run id, and phase. Launch it through
`launch-stage.mjs`.

`--retry-failed` includes every account still `failed` in the phases that run. Deferred
and `needs_operator` stay out. After the retry exits, run `summary` again.

- The class count dropped, including to zero: keep the edit and call `fix`. When a
  remainder is above zero, defer the remainder with why `The same edit left a remainder.`
  Do not edit that class again.
- The retry exited 0 and the class count did not drop: `git checkout --` the files of
  this edit, then defer with why `The edit did not clear the class.`
- The first retry threw `rehearsal_stopped`: resume once more with the same flags and no
  new edit. When that second process exits 0 and the count dropped, keep the edit and
  call `fix`. When the count still did not drop, `git checkout --` the files of this edit
  and defer with why `The edit did not clear the class.`

One edit per class for the whole night. A deferred class does not stop the next stage.

Membership resume keeps `runNow` from `run.json` `startedAt`. Do not pass a clock flag.
The paid-expiry file is in the temp directory and the command deletes it.

`V4_REHEARSAL_PASSWORD` is optional. When it is unset, leave it unset. Do not search for
a password. The command compares it for v4 id `eFv5NFx` only. Do not print it.

## Stop the night

Stop, still without asking, when any of these happen:

- `url=missing`
- the first build fails
- `Missing clean database dump.`
- the command refuses a non-local database
- `Missing V4_DATABASE_URL.`
- `http://localhost:3002` never responds after the web process was started for the full
  stage

Record the reason in the final message. Stages already finished stay finished.

## Morning

The final message lists, and nothing more personal than this:

- each stage's run id
- per phase, done, failed, skipped, and total from the stripped summary
- each deferred class and its count, and the path of that run's `deferred.md`
- each kept fix: class, count retried, and file paths, and the path of that run's
  `fixes.md`
- a stop reason when the night stopped early

Do not put an email, a name, a password hash, a raw row, a database URL, or a v4 id other
than `eFv5NFx` in that message, in a committed file, or in a commit. Class names and
counts are fine.

In the morning the operator reviews each `deferred.md` with an agent and decides each
entry. This prompt does not start that review. `fixes.md` is the list of uncommitted
edits to review.
