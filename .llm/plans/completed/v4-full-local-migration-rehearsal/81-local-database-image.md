**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Local database image

Dump and restore the local app database for the rehearsal. The password stays in the spawned process environment. This plan does not decide when a stage restores. Plan 82 does.

## Rows

R29, R44

## Runs after

none

## Files

- `apps/workers/src/commands/orm/v4Rehearsal/localDatabaseImage.ts` (create)
- `apps/workers/src/commands/orm/v4Rehearsal/localDatabaseImage.test.ts` (create)

Do not create `v4Rehearsal/index.ts`. Do not edit `copyAccountLibrary.ts`, the registry, `commands/index.ts`, `categoriesForCommand.ts`, `package.json`, `ENV.md`, or doc 16.

## Tests

Unit tests in `localDatabaseImage.test.ts`. They call the pure functions only. Do not spawn `pg_dump`, `pg_restore`, or a `pg` client. No database, no Playwright, no Maestro. Test names are complete sentences.

- `cleanDumpPath('/tmp/root')` is `path.join('/tmp/root', 'clean.dump')`.
- `buildDumpArgs` and `buildRestoreArgs` contain `-h`, the host, `-U`, the user, `-d`, and the database. Neither array contains the password, `@`, or `://`.
- Dump args include `-Fc`, `--no-owner`, and `-f`. Restore args include `--clean`, `--if-exists`, `--no-owner`, `--no-privileges`, `--exit-on-error`, and the file path as the last item. Restore args do not include `-f` or `-Fc`.
- `dumpRoleFromEnv` uses `DB_APP_MIGRATOR_USER` and `DB_APP_MIGRATOR_PASSWORD` when both are non-empty, and the read-write pair when the migrator user is blank.
- A blank host, port, database, user, or password throws an error whose message is exactly `Could not dump the local database.` The message does not contain the env values.
- `TERMINATE_OTHER_CLIENTS_SQL` selects `pg_terminate_backend(pid)` from `pg_stat_activity` and keeps `pid <> pg_backend_pid()` and `backend_type = 'client backend'`.

## Release scratchpad

none

## Pure surface

`localDatabaseImage.ts`. Named exports. No default export. No logger. Import `assertLocalDatabase` from `../v4Library/copyAccountLibrary.js` and call it at the start of every function that connects or spawns. Do not copy the host check.

```typescript
export function cleanDumpPath(rootDir: string): string {
  return path.join(rootDir, 'clean.dump');
}
```

That file sits in the rehearsal root, beside the run-id directories. It is not `dumps/<phase>.dump`.

```typescript
export type DumpRole = {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
};

export function dumpRoleFromEnv(env: NodeJS.ProcessEnv): DumpRole
```

Read `DB_HOST`, `DB_PORT`, `DB_APP_NAME`, `DB_APP_READ_WRITE_USER`, and `DB_APP_READ_WRITE_PASSWORD`. When `DB_APP_MIGRATOR_USER` and `DB_APP_MIGRATOR_PASSWORD` are both non-empty after trim, use that pair instead of the read-write pair. Trim every field except the password, which is used as stored. Any empty host, port, database, user, or password throws `Could not dump the local database.` Do not attach `cause`. Do not include an env value in the message.

```typescript
export function buildDumpArgs(input: {
  host: string;
  port: string;
  user: string;
  database: string;
  filePath: string;
}): string[]

export function buildRestoreArgs(input: {
  host: string;
  port: string;
  user: string;
  database: string;
  filePath: string;
}): string[]
```

Dump argv, in order: `-h`, host, `-p`, port, `-U`, user, `-d`, database, `-Fc`, `--no-owner`, `-f`, filePath.

Restore argv, in order: `-h`, host, `-p`, port, `-U`, user, `-d`, database, `--clean`, `--if-exists`, `--no-owner`, `--no-privileges`, `--exit-on-error`, filePath.

The password is not an argument.

```typescript
export const TERMINATE_OTHER_CLIENTS_SQL = `SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND backend_type = 'client backend'`;
```

## Spawn

`writeCleanDumpIfMissing(filePath)`, `cleanDumpExists(filePath)`, `restoreCleanDump(filePath)`, `disconnectOtherLocalClients()`, and `dumpPhaseFile(filePath)`.

`cleanDumpExists` is `fs.access` and returns boolean. It does not create the file.

`writeCleanDumpIfMissing` returns `'present'` when the file already exists and does not open `pg_dump`. When it is missing, `mkdir` the parent (`recursive: true`), dump to that path, and return `'written'`.

`dumpPhaseFile` always dumps. `mkdir` the parent first. Return the file size from `fs.stat` after a zero exit. A missing file or a non-zero exit throws `Could not dump the local database.`

`restoreCleanDump` runs `pg_restore`. A non-zero exit, or a `dumpRoleFromEnv` failure, throws `Could not restore the local database.` `disconnectOtherLocalClients` uses that same restore message. The two dump functions keep `Could not dump the local database.`

`disconnectOtherLocalClients` calls `assertLocalDatabase`, opens one `pg` `Client` with the dump role, runs `TERMINATE_OTHER_CLIENTS_SQL`, and `end()`s the client in `finally`. Then it returns. A failure throws `Could not restore the local database.` The restore function is what plan 82 calls next. This function does not restore.

Spawn `pg_dump` or `pg_restore` with `node:child_process` `spawn`, `shell: false`, and `stdio: 'ignore'`. Env is `{ ...process.env, PGPASSWORD: role.password }`. Do not write stderr into the run folder. Do not log argv, the role, or the driver error. Do not set `cause` on the thrown error.

Client connection fields are `host`, `port` as a number, `user`, `password`, `database`, and `ssl: env.DB_SSL_CONNECTION === 'true'`. A non-numeric port uses the same stable dump or restore error as a failed spawn.

Comment on `cleanDumpPath`, present tense: this file is the local database image from before the first stage writes, and later stages restore it.

## Out of scope

Do not call these functions from the rehearsal command. Plan 82 chooses pilot, sample, full, resume, and `--phase`. Do not read `V4_DATABASE_URL`. Do not drop the database. Do not edit a migration.
