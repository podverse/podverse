**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Rehearsal log

One module writes the gitignored run folder, redacts text before it lands, and returns the single progress line the runner prints. Area H calls it. This plan does not register a worker command, write the phase-status table, dump the database, or stop the run.

## Rows

R3, R4, R5, R6, R7, R48, R49, R50

## Runs after

none

## Files

- `apps/workers/src/commands/orm/v4Rehearsal/rehearsalLog.ts` (create)
- `apps/workers/src/commands/orm/v4Rehearsal/rehearsalLog.test.ts` (create)

Leave these unchanged: `packages/helpers-backend/src/redactForLog.ts`, `.gitignore`, `docs/proposals/v4-to-v5-migration/16-full-local-migration-rehearsal.md`, `apps/workers/src/commands/index.ts`, `packages/worker-commands/src/registry.ts`. Do not add `apps/workers/src/commands/orm/v4Rehearsal/index.ts`.

## Tests

Unit tests only, in `rehearsalLog.test.ts` (Vitest, `apps/workers` include `src/**/*.test.ts`). No API integration, Playwright, or Maestro. No operator command block.

Cover these behaviors:

- Text redaction replaces an email, a bcrypt hash, a database URL, a URL that contains userinfo, and a `password=` assignment. A normal `https://` feed URL and a v4 id stay.
- A message that is a raw row becomes `[dropped]`.
- `errors.jsonl` is one compact JSON object per line with the six keys below. Extra caller fields (`email`, `name`, `passwordHash`) never appear. A fourth error for one class increments `count` and leaves `exampleV4Ids` at three.
- `summary.md` has the same counts and contains no v4 id. `summary.json` keeps the three example ids.
- Progress: one start line, no line for the next 99 accounts, a line at 100, a line when `now` is 60 seconds past the last line with no new hundred, and a line from `finishPhase`. The line matches the format below and has no v4 id.
- `deferred.md` refuses a second entry for the same class. `readErrorExamples` returns three lines when five exist.
- `openRehearsalLog` with `../` or an email as `runId` throws `Error('invalid_run_id')` and creates no directory. `defaultRehearsalRoot()` ends with `.artifacts/v4-full-rehearsal`. Read `.gitignore` from that same six-parent root and expect a line whose text is `.artifacts/`.
- Tests write under `os.tmpdir()` via `rootDir`. They do not write the real `.artifacts` tree.

## Release scratchpad

none

## Public API

Named exports only. No default export. No app logger. The module never writes stdout.

Import `redactForLog` from `@podverse/helpers-backend`. Relative imports inside workers use the `.js` specifier. `import type` is its own line. No `any`. No type assertions. `===` / `!==` only.

```typescript
import { redactForLog } from '@podverse/helpers-backend';
```

`redactForLog` (`packages/helpers-backend/src/redactForLog.ts`) replaces sensitive object keys with `[REDACTED]` and leaves string values alone. Its tests keep `name` and `feed_url`. Do not edit that file. Database URLs and bcrypt hashes are not an email-shaped key, so they stay in this module.

```typescript
export const REHEARSAL_PHASES = [
  'preflight',
  'identity',
  'catalog',
  'library',
  'replay',
  'membership',
  'verify',
] as const;

export const REHEARSAL_STAGES = ['pilot', 'sample', 'full'] as const;

export const PROGRESS_EVERY_ACCOUNTS = 100;
export const PROGRESS_EVERY_MS = 60_000;
export const MESSAGE_MAX_CHARS = 400;

export type RehearsalPhase = (typeof REHEARSAL_PHASES)[number];
export type RehearsalStage = (typeof REHEARSAL_STAGES)[number];

export function createRunId(now: Date): string;
export function defaultRehearsalRoot(): string;
export function dumpFilePath(rootDir: string, runId: string, phase: RehearsalPhase): string;
export function redactRehearsalText(input: string): string;
export function openRehearsalLog(options: {
  runId: string;
  now: Date;
  rootDir?: string;
}): Promise<RehearsalLog>;
```

`RehearsalLog` methods, all named:

- `writeRun(input): Promise<void>`
- `writePick(input): Promise<void>`
- `appendError(input): Promise<void>`
- `noteProgress(input): Promise<string | null>`
- `finishPhase(input): Promise<string>`
- `replacePhaseCounts(input): Promise<void>`
- `appendDeferred(input): Promise<{ appended: boolean }>`
- `appendFix(input): Promise<{ appended: boolean }>`
- `listDeferredClasses(): Promise<string[]>`
- `readErrorExamples(className: string): Promise<RehearsalErrorLine[]>`
- `recordDump(input): Promise<void>`
- `recordStop(input): Promise<void>`
- `readonly dir: string`

Mutating methods share one promise chain so two writes cannot interleave a JSONL line. Each method returns that chain.

## Paths

`defaultRehearsalRoot()` joins `.artifacts/v4-full-rehearsal` onto the repo root. Find the root from `import.meta.url` of this file, six directories up. That depth is the same for `apps/workers/src/commands/orm/v4Rehearsal/rehearsalLog.ts` and for `apps/workers/dist/commands/orm/v4Rehearsal/rehearsalLog.js`. Do not use `process.cwd()`.

`createRunId(now)` formats `now.toISOString()` as `YYYYMMDDTHHMMSSZ` (drop `-`, `:`, and the milliseconds). Example: `2026-11-13T04:37:00.000Z` becomes `20261113T043700Z`.

`openRehearsalLog` accepts only that shape (`/^[0-9]{8}T[0-9]{6}Z$/`). Anything else throws `Error('invalid_run_id')` and creates no directory. The thrown message is that code alone.

`rootDir` defaults to `defaultRehearsalRoot()`. The run directory is `path.join(rootDir, runId)`. `openRehearsalLog` creates that directory and `dumps/` inside it (`recursive: true`). An existing directory stays, including `errors.jsonl`.

`dumpFilePath` returns `path.join(runDir, 'dumps', phase + '.dump')` after checking `phase` is a `RehearsalPhase`. This module does not spawn `pg_dump` and does not read the dump. The `.dump` file is the local database image area H writes so a phase can be restored. It can contain account rows. It stays under this gitignored folder. No text file in the run folder copies those rows.

## Redaction

`redactRehearsalText` returns a single line:

1. If the trimmed input starts with `{` or `[` and contains `"email"`, `"passwordHash"`, `"password_hash"`, `"displayName"`, `"display_name"`, or `"name"` as a quoted key, return `[dropped]`.
2. Replace database URLs with `[REDACTED_URL]`:
   `/(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss):\/\/\S+/gi`
3. Replace any URL that has userinfo with `[REDACTED_URL]`:
   `/[a-z][a-z0-9+.-]*:\/\/[^\s/@]+:[^\s/@]*@[^\s]+/gi`
4. Replace a bcrypt hash with `[REDACTED_HASH]`:
   `/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g`
5. Replace a password assignment with `password=[REDACTED]`:
   `/\bpassword\s*[:=]\s*\S+/gi`
6. Replace an email-shaped string with `[REDACTED_EMAIL]`:
   `/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g`
7. Replace newlines with a space.
8. If the result is longer than 400 characters, keep 400 and append `...`.

A feed URL with no userinfo is unchanged. Apply this to every free-text field before write: error `message`, deferred `saw` and `why`, fix file list is not free text (see below).

`appendError` also passes the message through `redactForLog` first, as the object `{ message }`, then runs `redactRehearsalText` on the resulting string. `message` is not a sensitive key, so this step is the shared key scrub; the string scan is what removes an email inside the sentence.

There is no name detector. A person's name in a sentence can be written. Callers must not put a name in `message`, `saw`, or `why`. Keys other than the ones listed for each file are ignored, so a caller that also passes `email`, `name`, or `passwordHash` does not get those keys on disk.

`sanitizeV4Id`: accept `/^[A-Za-z0-9_-]{1,32}$/`. Otherwise store `invalid-id` and drop the original (an email fails this and is not written).

`sanitizeClass`: accept `/^[a-z][a-z0-9_]*(?::[A-Za-z][A-Za-z0-9_]*)?$/` with length at most 80. These must pass: `unaccounted`, `needs_operator`, `cap_refused`, `email_case_collision`, `parse_failed`, `item_not_found`, `db_constraint:users_pkey`, `unexpected:TypeError`. Anything else is `unexpected:invalid_class`. Do not copy the rejected string into the message.

`sanitizeGroup`: `null`, or `/^[a-z][a-z0-9_]{0,39}$/`. Anything else becomes `null`.

`sanitizeRule`: `/^[A-Za-z0-9][A-Za-z0-9 _-]{0,79}$/`. Anything else becomes `unknown`.

Phase and stage values outside the two const arrays throw `Error('invalid_phase')` or `Error('invalid_stage')` before a write. The message is that code alone.

## Files on disk

Pretty JSON is `JSON.stringify(value, null, 2)` plus a trailing newline. `errors.jsonl` is `JSON.stringify(line)` plus `\n`, one object per line, no pretty print.

### `run.json` (rewrite)

```json
{
  "runId": "20261113T043700Z",
  "stage": "pilot",
  "phase": "identity",
  "snapshotAt": null,
  "startedAt": "2026-11-13T04:37:00.000Z",
  "flags": { "resume": false, "retryFailed": false, "limit": null }
}
```

`writeRun` input: `{ stage, phase, snapshotAt: string | null, now: Date, flags: { resume: boolean, retryFailed: boolean, limit: number | null } }`.

The first write sets `startedAt` from `now.toISOString()`. A later write keeps the `startedAt` already in the file when that value parses as a date. `snapshotAt` is stored only when it is a string `Date.parse` accepts and it contains neither `@` nor `://`; otherwise `null`. `limit` is stored only when it is an integer `>= 0`; otherwise `null`.

### `pick.json` (rewrite)

```json
{
  "stage": "pilot",
  "pickedAt": "2026-11-13T04:37:00.000Z",
  "accounts": [{ "v4Id": "eFv5NFx", "rule": "rehearsal account" }]
}
```

`writePick` input: `{ stage, now, accounts: Array<{ v4Id: string; rule: string }> }`. Each stored account has only `v4Id` and `rule` after sanitize. This file is the whole stage list. It is gitignored, so v4 ids belong here.

### `errors.jsonl` (append)

Keys in this order: `v4Id`, `phase`, `group`, `class`, `message`, `time`.

```json
{"v4Id":"eFv5NFx","phase":"library","group":"clips","class":"unaccounted","message":"row missing","time":"2026-11-13T04:37:00.000Z"}
```

`appendError` input fields read: `v4Id`, `phase`, `group` (`string | null`), `className`, `message`, `now`. The JSON field is `class`, taken from `className`. `time` is `now.toISOString()`. An empty message after redaction becomes `empty`. `group` may be `null`.

This call updates class totals only. It does not change `done`, `failed`, or `skipped`.

### `summary.json` (rewrite) and `summary.md` (rewrite)

```json
{
  "runId": "20261113T043700Z",
  "updatedAt": "2026-11-13T04:53:40.000Z",
  "phases": {
    "library": {
      "done": 98,
      "failed": 2,
      "skipped": 0,
      "total": 1000,
      "rate": 0.02,
      "estimateLeftSeconds": 9000,
      "phaseStartedAt": "2026-11-13T04:37:00.000Z",
      "databaseBytes": null
    }
  },
  "classes": {
    "unaccounted": { "count": 2, "exampleV4Ids": ["eFv5NFx", "abc1234"] }
  },
  "stop": null
}
```

`rate` is `failed / (done + failed)` when `done + failed > 0`, otherwise `0`. Round with `Math.round(rate * 10000) / 10000`. Skipped accounts stay out of the denominator. The sample above is 2 / 100 = 0.02, with `updatedAt` 1000 seconds after `phaseStartedAt`, so `estimateLeftSeconds` is `Math.round(1000 * 900 / 100)` = 9000.

`estimateLeftSeconds`: `processed = done + failed + skipped`, `remaining = max(0, total - processed)`. When `remaining === 0`, store `0`. When `processed === 0` or elapsed milliseconds `<= 0`, store `null`. Otherwise `Math.round((elapsedMs / 1000) * (remaining / processed))`. Elapsed is `now - phaseStartedAt`.

`phaseStartedAt` is set the first time a phase is reported and kept after that, including across a new process that opens the same run id. `databaseBytes` is an integer `>= 0` or `null`.

`exampleV4Ids` is the first three distinct sanitized ids for that class, in append order. Later errors increment `count` only.

On open, load `summary.json` when it parses and `runId` matches. When it does not parse, keep going with empty totals and leave `errors.jsonl` in place. The next flush overwrites `summary.json`.

Phase objects are written in `REHEARSAL_PHASES` order, omitting phases that were never reported. Classes are ordered by `count` descending, then name ascending.

`summary.md` has counts only. No v4 id, no email, no `phaseStartedAt`.

```markdown
# Rehearsal summary

- Run: 20261113T043700Z
- Updated: 2026-11-13T04:53:40.000Z

## Phases

| Phase | Done | Failed | Skipped | Total | Rate | Estimate left (s) | Database bytes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| library | 98 | 2 | 0 | 1000 | 0.0200 | 9000 |  |

## Classes

| Class | Count |
| --- | --- |
| unaccounted | 2 |
```

Rate in the markdown table is `rate.toFixed(4)`. A null estimate is `unknown`. A null `databaseBytes` is an empty cell. When `stop` is set, add a line under the run id: `- Stop: library error_rate`.

Rewrite `summary.json` and `summary.md` on `appendError`, on a progress emit, on `finishPhase`, on `replacePhaseCounts`, and on `recordStop`.

### `deferred.md` and `fixes.md` (append)

Create the file with a title when it is missing: `# Deferred` or `# Fixes`, then a blank line.

Deferred entry:

```markdown
## unaccounted

- Count: 12
- Saw: short redacted sentence
- Why: short redacted sentence
- Examples: eFv5NFx, abc1234

```

`appendDeferred` input: `{ className, count, saw, why, exampleV4Ids: string[] }`. `count` must be an integer `>= 0` or the entry is not written (`appended: false`). Examples are at most three sanitized ids, joined with `, `. `saw` and `why` go through `redactRehearsalText`.

When a line `## <class>` for that sanitized class already exists, return `{ appended: false }` and leave the file unchanged.

Fix entry:

```markdown
## unaccounted

- Files: `apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts`
- Retried: 12

```

`appendFix` input: `{ className, files: string[], retried: number }`. A file path must match `/^[A-Za-z0-9._/-]+$/` and must not contain `..`. Drop the rest. When none remain, the line is `- Files: none`. `retried` must be an integer `>= 0`, otherwise `0`. The same one-entry-per-class guard as deferred.

`listDeferredClasses` returns class names from `## ` headings that match `sanitizeClass`, in file order. It does not return the title.

### `dumps/manifest.json` (rewrite)

```json
{
  "dumps": [
    { "phase": "preflight", "file": "preflight.dump", "bytes": 1234, "time": "2026-11-13T04:37:00.000Z" }
  ]
}
```

`recordDump` input is `{ phase, bytes, now }` only. `file` is always `phase + '.dump'`. There is no path argument and no command string. `bytes` is an integer `>= 0`, otherwise `null`. A second call for the same phase replaces that entry.

## Progress line

H prints the returned string. This module does not.

```text
rehearsal phase=library done=98 failed=2 skipped=0 total=1000 rate=0.0200 estimate_left_s=9000
```

`rate` is `toFixed(4)`. A null estimate is `estimate_left_s=unknown`. No v4 id, no message, no email.

`noteProgress` and `finishPhase` take `{ phase, done, failed, skipped, total, now, phaseStartedAt, databaseBytes?: number | null }`. Counts are integers `>= 0` and `done + failed + skipped <= total`. Otherwise throw `Error('invalid_counts')` before a write.

`noteProgress` always updates the in-memory phase counts. It returns a line only when:

- this phase has not emitted yet (the start line, including `done + failed + skipped === 0`), or
- processed accounts have grown by at least 100 since the last line, or
- `now` is at least 60_000 ms after the last line.

`finishPhase` uses the same count update and always returns a line.

`replacePhaseCounts` writes the summary immediately, sets the cadence baseline to the current processed count, and sets the last line time to `now`, so the next `noteProgress` does not emit just because the process restarted. It returns nothing. It does not clear class totals or `phaseStartedAt`.

No timer lives in this module. Sixty seconds elapse only when a caller passes a later `now`.

## Stop record

`recordStop({ phase, now })` sets `stop` to `{ phase, reason: 'error_rate', at: now.toISOString() }` and rewrites the summary files. A second call overwrites it. This module does not decide when to stop and does not compute a last-200 window. `rate` in the summary is the whole phase so far (`failed / (done + failed)`), which is a different number from that window.

## What area H calls

Import from `@workers/commands/orm/v4Rehearsal/rehearsalLog.js`.

1. `createRunId(now)`, then `openRehearsalLog({ runId, now })`.
2. `writeRun` at the start and whenever the phase changes.
3. `writePick` with area D's `{ v4Id, rule }` list. `rule` must match `sanitizeRule`.
4. Before each phase, write the dump bytes to `dumpFilePath(defaultRehearsalRoot(), runId, phase)`, then `recordDump({ phase, bytes, now })`. Do not write the dump command, a connection string, or stderr into `dumps/`.
5. On a failed account, `appendError`, then `redactRehearsalText` on any stderr before that message is built. Do not also send the raw error to the app logger.
6. `noteProgress` after each account, and at least every 60 seconds during a wait that has no account callback (catalog settle).
7. `finishPhase` when the phase ends. Do not also call `noteProgress` for that same moment.
8. After a crash, open the same run id and call `replacePhaseCounts` from the phase-status table before the next `noteProgress`. Class totals stay as `summary.json` left them.
9. When H's own last-200 window is above 5 percent failed, call `recordStop` and return. Do not use `summary.json` `rate` for that decision.

`readErrorExamples(className)` streams `errors.jsonl` with `node:readline` and returns at most three parsed lines for that class, then closes the stream. The agent uses this, or the three ids already on `summary.json`. It does not load the whole file.

## Comments

One comment, on `dumpFilePath`: the `.dump` file is a local database image used to restore a phase, and the manifest stores phase, file name, byte size, and time. No comment cites a plan, a doc, or a step number.
