**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Rehearsal loop

Run the phases in order, resume from the status table, restore a clean database for sample and full, and stop when the last 200 accounts in one phase fail too often. Phase bodies stay stubs until plan 84.

## Rows

R1, R28, R29, R44, R46, R47, R51

## Runs after

10, 40, 50, 80, 81

## Files

- `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsalLoop.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsalLoopLib.ts` (create)
- `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsalLoopLib.test.ts` (create)
- `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsalLoop.test.ts` (create)
- `apps/workers/src/commands/orm/v4Rehearsal/rehearsalPhaseHandlers.ts` (create)

Plan 80 created the loop file as a two-argument throw. Replace that function. Keep the export name `runParsedRehearsal`. Do not edit `runFullRehearsal.ts`, `localDatabaseImage.ts`, `rehearsalLog.ts`, `accountPhaseStatus.ts`, `pickStageAccounts.ts`, the registry, or doc 16. Do not create `v4Rehearsal/index.ts`.

## Tests

Unit tests in `runFullRehearsalLoopLib.test.ts`. Also one `runFullRehearsalLoop.test.ts` that calls `runParsedRehearsal` with injected deps and never spawns a database tool. No Playwright, no Maestro. Test names are complete sentences.

Lib:

- `failureWindowTripped` is false for 199 true values, false for 200 values of which 10 are true, and true for 200 values of which 11 are true.
- `shouldRestore` is `create_clean` for pilot, `restore` for sample and full, and `none` when `resume` is true or `phase` is set.
- `progressCounts` for preflight start is done 0, failed 0, skipped 0, total 1. Preflight finish is done 1 and the same zeros. A library count of done 10, failed 1, deferred 3, needs_operator 2, and pick length 20 is skipped 5, total 20. done + failed + skipped above the pick length throws `phase_count_mismatch`.
- `parseStoredRun` keeps a parseable `startedAt` and a snapshot string that `Date.parse` accepts and that contains neither `@` nor `://`. A different stage throws `pick_stage_mismatch`. A missing `startedAt` throws `invalid_run_file`.
- `parseStoredPick` keeps `v4Id` and `rule` strings and drops every other field. A non-array throws `invalid_run_file`.
- `assertProgressLine` accepts `rehearsal stop=error_rate phase=library` and throws `invalid_progress_line` for a line that contains `@`, `://`, a newline, or does not start with `rehearsal `.

Loop, with fake deps:

- Pilot calls `ensureCleanDump` and does not call `restoreClean`. Handlers run in `REHEARSAL_PHASES` order. A `'written'` result prints `rehearsal clean_dump=written`.
- Sample prints `rehearsal restore=starting stage=sample`, then calls `closePools`, `disconnectOtherClients`, `restoreClean`, and `openPools` in that order, then prints `rehearsal restore=finished stage=sample`, and only then calls preflight.
- Sample with `resume` true does not restore. `--phase library` dumps once, calls the library handler only, and does not restore.
- A dump rejection skips the handler.
- The library handler's 200th `noteAccount({ failed: true })` prints the stop line and the next phase is not called. 199 true outcomes still call the next phase. 190 false outcomes and 10 true outcomes still call the next phase.
- `runnableIds` with limit 2 returns the first two ids from the injected list, and `retryFailed` true passes `includeFailed` true.
- Resume does not call `pick`. A missing run directory throws `Missing rehearsal run.` A new run whose directory already exists throws `Rehearsal run already exists.`
- The object passed to `pick` uses `runNow`. A progress call uses the injected clock, and moving that clock by 60 seconds is visible on the next progress call.

## Release scratchpad

none

## What this plan decides

Phases run in `REHEARSAL_PHASES` order from `rehearsalLog.ts`: preflight, identity, catalog, library, replay, membership, verify. `--phase` runs that one phase. One account failure does not skip the rest of the phase. The next phase does not start after `rehearsal_stopped`.

`sample` and `full` restore the clean image unless `--resume` or `--phase` is set. `pilot` writes the image when the file is missing and does not restore. This command reads `V4_DATABASE_URL` and does not refresh it. A later `--stage full`, after the operator has replaced that snapshot, is the run before go-live. There is no fourth stage and no flag for it.

The failure window is per phase. It stores the last 200 `noteAccount` booleans. It trips only when the window has 200 entries and `failed / 200 > 0.05`. Ten failures do not trip. Eleven do. A phase with fewer than 200 finished accounts does not trip. `noteAccount({ failed: false })` is not a failure. Plan 84 uses false for `needs_operator` and for a left-out twin.

`runNow` is one `Date` for the stage pick and for membership. On a new run it is `new Date()` once. On resume it is `startedAt` from `run.json`. Progress, dump timestamps, and error timestamps use `wallClock()`, which is `new Date()` on each call. Passing `runNow` into progress would freeze the 60 second line.

## Pure helpers

`runFullRehearsalLoopLib.ts`. No I/O.

```typescript
export const FAILURE_WINDOW = 200;

export function failureWindowTripped(outcomes: readonly boolean[]): boolean

export function shouldRestore(input: {
  stage: RehearsalStage;
  resume: boolean;
  phase: RehearsalPhase | null;
}): 'none' | 'create_clean' | 'restore'

export function progressCounts(input: {
  phase: RehearsalPhase;
  pickCount: number;
  counts: Record<AccountPhaseStatusValue, number> | null;
  closing: boolean;
}): { done: number; failed: number; skipped: number; total: number }

export function parseStoredRun(value: unknown, stage: RehearsalStage): {
  startedAt: Date;
  snapshotAt: string | null;
}

export function parseStoredPick(value: unknown): Array<{ v4Id: string; rule: string }>

export function assertProgressLine(line: string): void
```

`failureWindowTripped` uses `outcomes.slice(-FAILURE_WINDOW)`. Shorter than 200 returns false. Otherwise count true values and compare with `> 0.05`.

`shouldRestore` returns `none` when `resume` is true or `phase` is not null. Pilot returns `create_clean`. Sample and full return `restore`.

`progressCounts` for `preflight` ignores `counts`. Start (`closing` false) is all zeros and total 1. Close is done 1, failed 0, skipped 0, total 1. Any other phase with `counts` null throws `phase_count_mismatch`. Otherwise it uses `done`, `failed`, and skipped = `deferred + needs_operator`. Total is `pickCount`. `pending` stays out of skipped. When `done + failed + skipped > total`, throw `phase_count_mismatch`.

`parseStoredRun` requires an object with `stage` equal to the argument and `startedAt` a string `Date.parse` accepts. Otherwise `invalid_run_file` or `pick_stage_mismatch`. `snapshotAt` is kept only when it is a string `Date.parse` accepts and it contains neither `@` nor `://`. Otherwise null.

`parseStoredPick` requires `{ accounts: unknown }`. Each element must be an object with string `v4Id` and string `rule`. Keep those two fields. Anything else throws `invalid_run_file`.

`assertProgressLine` requires a single line that starts with `rehearsal ` and contains neither `@` nor `://`. Otherwise `invalid_progress_line`.

Import the stage, phase, and status types with `import type`. Value-import `REHEARSAL_PHASES` only if a helper needs it. The lib must not import `pg`.

## Loop

Replace `runParsedRehearsal` so the command's two-argument call still typechecks.

```typescript
export async function runParsedRehearsal(
  parsed: ParsedRehearsalArgs,
  connectionString: string,
  deps: RehearsalDeps = defaultRehearsalDeps(),
): Promise<void>
```

`connectionString` is passed to `pick` and is not logged, not written to a line, and not put on the context.

`RehearsalDeps` fields:

- `silence: { pause(): void; resume(): void }`
- `clock: () => Date`
- `writeLine: (line: string) => void`
- `runDirExists: (runDir: string) => Promise<boolean>`
- `readRunFile: (runDir: string) => Promise<unknown>`
- `readPickFile: (runDir: string) => Promise<unknown>`
- `openLog: (input: { runId: string; now: Date }) => Promise<RehearsalLog>`
- `ensureCleanDump: (filePath: string) => Promise<'written' | 'present'>`
- `cleanDumpExists: (filePath: string) => Promise<boolean>`
- `disconnectOtherClients: () => Promise<void>`
- `restoreClean: (filePath: string) => Promise<void>`
- `closePools: () => Promise<void>`
- `openPools: () => Promise<void>`
- `dumpPhase: (filePath: string) => Promise<number>`
- `pick: (input: { connectionString: string; stage: RehearsalStage; seed: string; now: Date }) => Promise<Array<{ v4Id: string; rule: string }>>`
- `countPhase: (phase: AccountPhase) => Promise<Record<AccountPhaseStatusValue, number>>`
- `listRunnable: (phase: AccountPhase, includeFailed: boolean) => Promise<string[]>`
- `handlers` with `preflight` returning `Promise<string | null>` and `identity`, `catalog`, `library`, `replay`, `membership`, `verify` each returning `Promise<void>`

`defaultRehearsalDeps` wires:

- silence: `getLogger()` from `@workers/factories/logger.js`. `pause` stores `logger.level` and sets `logger.level = 'silent'`. `resume` writes the stored level back. Comment, present tense: the app logger stays quiet so process stdout is the rehearsal progress lines.
- clock: `() => new Date()`
- writeLine: `assertProgressLine`, then `process.stdout.write(line + '\n')`
- run dir, run file, and pick file: `node:fs/promises` under `path.join(defaultRehearsalRoot(), runId)`. `readFile` plus `JSON.parse` inside try. A missing file or bad JSON rejects with `invalid_run_file` for the run file and the pick file.
- `openLog`: `openRehearsalLog({ runId, now })` from `./rehearsalLog.js`
- clean dump path: `cleanDumpPath(defaultRehearsalRoot())` and the plan 81 functions `writeCleanDumpIfMissing`, `cleanDumpExists`, `disconnectOtherLocalClients`, `restoreCleanDump`, `dumpPhaseFile`
- `closePools` / `openPools`: `getDataSourceRead` and `getDataSourceReadWrite` from `@podverse/orm`. Close destroys each DataSource whose `isInitialized` is true. Open calls `initialize()` on those same objects. Do not call `createORMContext` again. Disconnect runs after the pools are closed, so the terminate query does not cut this process's own pool out from under a later query.
- `pick`: `pickStageAccounts` from `./pickStageAccounts.js`
- `countPhase`: `countAccountPhaseStatus`
- `listRunnable`: `listAccountPhaseV4UserIds`
- handlers: the named exports from `./rehearsalPhaseHandlers.js`

`runDir` is `path.join(defaultRehearsalRoot(), runId)`.

### Run id and clock

New run: `runId` is `parsed.runId` when it is non-null, otherwise `createRunId(runNow)` with `runNow = new Date()`. `runDirExists` true throws `Rehearsal run already exists.`

Resume: `parsed.runId` is non-null because plan 80 already required it. `runDirExists` false throws `Missing rehearsal run.` `parseStoredRun(await readRunFile(runDir), parsed.stage)` supplies `runNow` and the stored snapshot. Do not call `pick`.

`pause` the logger after those checks and `resume` it in a `finally` that surrounds the rest of the function, including a thrown `rehearsal_stopped`.

`openLog({ runId, now: runNow })`.

### Clean image

Call `shouldRestore`. `create_clean`: `ensureCleanDump`. When the result is `'written'`, `writeLine('rehearsal clean_dump=written')`. `restore`: when `cleanDumpExists` is false, throw `Missing clean database dump.` Otherwise write `rehearsal restore=starting stage=<stage>`, `closePools`, `disconnectOtherClients`, `restoreClean`, `openPools`, then `rehearsal restore=finished stage=<stage>`. If disconnect or restore throws, skip `openPools` and rethrow. The process exits on that error. `none`: do not touch the clean file.

The stage word is the parsed stage. Those two lines are the only restore output.

### Pick

Resume: `parseStoredPick(await readPickFile(runDir))`. Do not call `writePick`.

New run: `pick({ connectionString, stage, seed: runId, now: runNow })`, then `log.writePick({ stage, now: runNow, accounts })`. Keep that array. A later pick call can change paid, trial, and expired rows because it depends on `now`.

### Context

```typescript
export type RehearsalRunContext = {
  stage: RehearsalStage;
  runId: string;
  runNow: Date;
  wallClock: () => Date;
  flags: { resume: boolean; retryFailed: boolean; limit: number | null };
  accounts: Array<{ v4Id: string; rule: string }>;
  log: RehearsalLog;
  emitProgress: () => Promise<void>;
  noteAccount: (input: { failed: boolean }) => Promise<void>;
  runnableIds: (phase: AccountPhase) => Promise<string[]>;
  writeLine: (line: string) => void;
};
```

`runnableIds` calls `listRunnable(phase, parsed.retryFailed)` and, when `parsed.limit` is a number, `slice(0, limit)`. The list order is the status module's `v4_user_id` ascending order. Do not sort it by pick rule. Limit `0` returns an empty array.

`noteAccount` appends `input.failed` to the current phase's window. When `failureWindowTripped` becomes true, `writeLine('rehearsal stop=error_rate phase=<phase>')`, `log.recordStop({ phase, now: wallClock() })`, and throw `Error('rehearsal_stopped')`. The window resets at the start of each phase. It is not read from `summary.json`.

`emitProgress` loads `countPhase` for an account phase (`phase !== 'preflight'`). Preflight passes `counts: null`. `closing` is false. `noteProgress` receives those counts, `now: wallClock()`, `phaseStartedAt` from the first emit of this phase in this process (keep the first wall-clock `Date`), and `databaseBytes` from the dump just taken. When the returned line is non-null, `writeLine` it.

`writeRun` uses `now: runNow` and the snapshot string held by the loop. Flags are `{ resume, retryFailed, limit }` from `parsed`.

### Each phase

For each phase in `REHEARSAL_PHASES`, skip it when `parsed.phase` is non-null and different.

1. `writeRun` with this phase and the snapshot held so far (null until preflight returns one).
2. `dumpPhase(dumpFilePath(defaultRehearsalRoot(), runId, phase))`. Keep the byte count. `log.recordDump({ phase, bytes, now: wallClock() })`. A throw skips the handler and skips later phases. Do not catch it.
3. For a phase other than preflight, `countPhase` and `replacePhaseCounts` with the same count fields as `emitProgress`, `now: wallClock()`, and the dump byte count. This sets the cadence so a resumed process does not print only because it restarted.
4. Reset the failure window.
5. Call the handler with the context. Preflight's return value replaces the held snapshot when it is a string. Null leaves the held snapshot as it was. When the held snapshot changed, `writeRun` again before the close so `run.json` stores the new snapshot even if the next phase never starts. Every `writeRun` passes the held snapshot. A null input stores null, so this second write is what records the preflight time.
6. `finishPhase` with `closing: true` and `writeLine` of the returned line. Do not also `emitProgress` for that same moment.

When the handler throws `rehearsal_stopped`, do not `finishPhase` and do not run a later phase. The `finally` still resumes the logger. Rethrow.

Any other handler throw skips `finishPhase` and later phases and rethrows. Do not mark accounts in this file.

`isAccountPhase` is `phase !== 'preflight'`. The other six names are `AccountPhase`. `countPhase` and `runnableIds` are only called with an account phase.

## Handler stubs

`rehearsalPhaseHandlers.ts` exports the seven functions named above. Each throws `Error('phase_not_wired')`. `runPreflightPhase` is declared to return `Promise<string | null>`. Import the context type only. Plan 84 replaces the bodies and keeps the names.

```typescript
export async function runPreflightPhase(_context: RehearsalRunContext): Promise<string | null>
export async function runIdentityPhase(_context: RehearsalRunContext): Promise<void>
export async function runCatalogPhase(_context: RehearsalRunContext): Promise<void>
export async function runLibraryPhase(_context: RehearsalRunContext): Promise<void>
export async function runReplayPhase(_context: RehearsalRunContext): Promise<void>
export async function runMembershipPhase(_context: RehearsalRunContext): Promise<void>
export async function runVerifyPhase(_context: RehearsalRunContext): Promise<void>
```

## Out of scope

Do not call `v4SeedAccountIdentity`, `v4SeedStageCatalog`, `v4CopyAccountLibrary`, `v4ReplayLegacyRows`, the membership rebuild, or `verifyAccount`. Do not silence the logger in the help path. Help returns in plan 80 before this function.
