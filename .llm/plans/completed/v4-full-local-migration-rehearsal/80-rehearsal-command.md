**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Rehearsal command

Register `v4RunFullRehearsal`. It parses the stage flags, refuses a non-local database, and stops before any phase. Later plans fill in the run.

## Rows

R1

## Runs after

50

## Files

- `packages/worker-commands/src/registry.ts`
- `apps/workers/src/commands/index.ts`
- `apps/workers/src/lib/startup/categoriesForCommand.ts`
- `apps/workers/src/lib/startup/categoriesForCommand.test.ts`
- `apps/workers/package.json`
- `apps/workers/ENV.md`
- `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsal.ts` (create)
- `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsalLib.ts` (create)
- `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsalLib.test.ts` (create)
- `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsalLoop.ts` (create)

Do not create `apps/workers/src/commands/orm/v4Rehearsal/index.ts`. Do not edit `apps/workers/src/commands/commandNames.ts` (it re-exports `KNOWN_COMMANDS`), `apps/workers/src/index.ts`, `apps/workers/src/lib/startup/validation.ts`, doc 16, or any file owned by plans 10–79. Do not add a Kubernetes CronJob.

## Tests

Unit tests in `runFullRehearsalLib.test.ts` only. Workers Vitest already includes `src/**/*.test.ts`. No database, no Playwright, no Maestro. Test names are complete sentences.

- `--stage pilot` returns stage `pilot`, phase null, resume false, retryFailed false, limit null, and runId null.
- Each value in `REHEARSAL_PHASES` is accepted as `--phase`.
- `--stage sample --phase library --resume --retry-failed --limit 0 --run-id 20261113T043700Z` returns those values, including limit `0`.
- A missing `--stage` throws `Missing --stage.`
- `--stage Pilot` throws `invalid_stage`.
- `--phase no` throws `invalid_phase`.
- `--resume` without `--run-id` throws `Missing --run-id.`
- `--limit` with no value, `--limit -1`, and `--limit 1.5` throw `--limit must be a whole number.`
- An unknown key `foo` throws `Unknown rehearsal flag.`
- The key `_` is ignored.

## Release scratchpad

none

## Command

Named export `v4RunFullRehearsal` from `runFullRehearsal.ts`. Same `CommandLineArgs` shape as `v4CopyAccountLibrary`. Import `assertLocalDatabase`, `hasOption`, and `optionValue` from `../v4Library/copyAccountLibrary.js`. Do not copy those functions.

Help is handled before the local-database check. `process.stdout.write` the help text and return. No logger call.

```text
v4RunFullRehearsal

Copy one stage of v4 accounts into the local v5 database. Phases run in order:
preflight, identity, catalog, library, replay, membership, verify. One account
failure does not stop the run. The run stops when more than 5% of the last 200
accounts failed in the current phase.

Flags:
  --stage name     pilot, sample, or full (required)
  --phase name     Run one phase and then stop
  --resume         Continue a run. Requires --run-id
  --run-id id      The run folder name
  --retry-failed   Include failed accounts
  --limit n        Most accounts to process in a phase
  --help           Show this text

sample and full restore .artifacts/v4-full-rehearsal/clean.dump unless
--resume or --phase is set. pilot writes that file when it is missing and
does not restore it. The first pilot run must start from a local database
that does not already hold rehearsal accounts.

This command reads V4_DATABASE_URL and does not refresh it. Run --stage full
again after that snapshot is replaced, before go-live.

The catalog phase waits until feeds are settled. It does not start the parser.
Apply refuses unless DB_HOST is local.
```

Export that string as `V4_RUN_FULL_REHEARSAL_HELP`.

After help:

1. `parseRehearsalArgs(args)`.
2. `assertLocalDatabase()`.
3. `process.env.V4_DATABASE_URL?.trim() ?? ''`. Empty throws `Missing V4_DATABASE_URL.`
4. `runParsedRehearsal(parsed, connectionString)` from `./runFullRehearsalLoop.js`.

This plan's loop file exports only:

```typescript
export async function runParsedRehearsal(
  _parsed: ParsedRehearsalArgs,
  _connectionString: string,
): Promise<void> {
  throw new Error('rehearsal_not_ready');
}
```

`ParsedRehearsalArgs` is exported from the lib. The underscore names keep the stub lint-clean. Plan 82 replaces the function body and adds an optional third argument. Keep the two-argument call in this command.

Comment on `v4RunFullRehearsal`, present tense: the command refuses a non-local database before any phase runs.

## Flag parse

`runFullRehearsalLib.ts`. No `pg`, no filesystem, no logger. Import `REHEARSAL_PHASES` and `REHEARSAL_STAGES` from `./rehearsalLog.js`. Import `hasOption` and `optionValue` from `../v4Library/copyAccountLibrary.js`. `import type` is its own line.

```typescript
export type ParsedRehearsalArgs = {
  stage: RehearsalStage;
  phase: RehearsalPhase | null;
  resume: boolean;
  retryFailed: boolean;
  limit: number | null;
  runId: string | null;
};
```

`parseRehearsalArgs(args: CommandLineArgs): ParsedRehearsalArgs`

Allowed keys are `_`, `help`, `stage`, `phase`, `resume`, `retry-failed`, `limit`, and `run-id`. Any other own key throws `Unknown rehearsal flag.` The message is that sentence alone.

- `stage` is required. A missing value throws `Missing --stage.` A value not in `REHEARSAL_STAGES` throws `invalid_stage`.
- `phase` absent means null. A present value must be in `REHEARSAL_PHASES` or the throw is `invalid_phase`.
- `resume` and `retry-failed` are `hasOption`. They do not read the value.
- `resume` true and `run-id` missing or blank throws `Missing --run-id.`
- `run-id` present: `optionValue`. Blank becomes null. When the string is non-null it must match `/^[0-9]{8}T[0-9]{6}Z$/` or the throw is `invalid_run_id`.
- `limit` absent means null. Present: `optionValue`. Null, a non-integer, or a negative number throws `--limit must be a whole number.` `0` is kept.

There is no `--dry-run` key. It falls through to the unknown-key throw.

## Registration

In `packages/worker-commands/src/registry.ts`, insert this object immediately after the `v4SeedAccountCatalog` object:

```typescript
{
  name: 'v4RunFullRehearsal',
  label: 'v4: run a local migration rehearsal',
  description:
    'Copy one stage of v4 accounts into the local database: identity, catalog, library, replay, membership, then a per-account check. Refuses a non-local database. Does not refresh the v4 snapshot.',
  category: 'orm',
  risk: 'normal',
  example_cli: 'npm run v4_run_full_rehearsal -w apps/workers -- --stage pilot',
},
```

In `apps/workers/src/commands/index.ts`, import `v4RunFullRehearsal` from `./orm/v4Rehearsal/runFullRehearsal.js` immediately after the `v4ReplayLegacyRows` import, and add the same name to the default export object immediately after `v4ReplayLegacyRows`.

In `BASE_ORM_MQ_COMMANDS` inside `categoriesForCommand.ts`, add `'v4RunFullRehearsal'` next to `'v4SeedAccountCatalog'`. The command queues catalog parses, so it needs Base, ORM, and MQ. Do not add Billing, Parser, or WebNotifications.

In `categoriesForCommand.test.ts`, add a case beside the `v4SeedAccountCatalog` case: `v4RunFullRehearsal` maps to Base, ORM, and MQ.

In `apps/workers/package.json` scripts, immediately after `v4_seed_account_catalog`:

```json
"v4_run_full_rehearsal": "node ./dist/index.js v4RunFullRehearsal"
```

## ENV.md

In the command-group table, append `, v4RunFullRehearsal` after `v4SeedAccountCatalog` in the Base + ORM + MQ row.

Add this subsection immediately after `### v4 catalog seed (`v4SeedAccountCatalog`)`:

```markdown
### v4 full rehearsal (`v4RunFullRehearsal`)

Base + ORM + MQ, plus `V4_DATABASE_URL` read by this command. The command does
not refresh that snapshot. `--stage` is `pilot`, `sample`, or `full`. Optional
flags are `--phase`, `--resume`, `--run-id`, `--retry-failed`, and `--limit`.
Apply refuses unless `DB_HOST` is local.

`sample` and `full` restore `.artifacts/v4-full-rehearsal/clean.dump` unless
`--resume` or `--phase` is set. `pilot` writes that file when it is missing
and does not restore it. The first pilot run has to start from a local
database that does not already hold rehearsal accounts. Run `--stage full`
again after the snapshot is replaced, before go-live.

Dump and restore use `DB_APP_MIGRATOR_USER` and `DB_APP_MIGRATOR_PASSWORD`
when both are non-empty. Otherwise they use the read-write pair. The password
is passed only as the spawned process environment `PGPASSWORD`. It is not a
process argument and it is not logged.

The catalog phase waits until feeds are settled. It does not start the parser.
Before `sample` and `full` restore, other client sessions on the local app
database are disconnected. Start the parser again after the restore line
`rehearsal restore=finished` or the catalog wait does not end.

Progress lines on stdout start with `rehearsal `. The app logger is quiet
while a run is in progress. Run files live under
`.artifacts/v4-full-rehearsal/<run-id>/`, which is gitignored.

`WEB_DOMAIN` is read only for `--stage full` verify. A value with no scheme
is requested as `http://` plus that host. Set it to the port the local web
app serves. `V4_REHEARSAL_PASSWORD` is optional. When it is non-empty, the
full rehearsal compares it for v4 id `eFv5NFx` only. Unset skips that
compare. The value is not logged.
```

Do not add either new name to startup validation. Do not put the password in `.env.example`.

## Out of scope

Do not open the run folder, dump a database, pick accounts, or call the phase commands. Plan 81 owns the dump. Plan 82 owns the loop. Plan 84 owns the phase bodies.
