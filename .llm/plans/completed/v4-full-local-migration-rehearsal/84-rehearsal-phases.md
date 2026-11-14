**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Rehearsal phase bodies

Replace the seven `phase_not_wired` stubs. Each phase calls the module that already owns that work. Status rows are written only through `accountPhaseStatus.ts`.

## Rows

R1, R30, R32, R33

## Runs after

10, 24, 30, 50, 60, 70, 82, 83

## Files

- `apps/workers/src/commands/orm/v4Rehearsal/rehearsalPhaseHandlers.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/rehearsalPhaseOutcome.ts` (create)
- `apps/workers/src/commands/orm/v4Rehearsal/rehearsalPhaseOutcome.test.ts` (create)
- `apps/workers/package.json`
- `package-lock.json`

Do not edit `runFullRehearsalLoop.ts`, `identityOutcome.ts`, `seedAccountIdentity.ts`, the library-copy files, `seedStageCatalog.ts`, `verifyAccount.ts`, `rehearsalLog.ts`, `accountPhaseStatus.ts`, or doc 16. Do not create `v4Rehearsal/index.ts`. Do not add a `--dry-run` call. Do not start the parser.

## Tests

Unit tests in `rehearsalPhaseOutcome.test.ts` only. Import from `./rehearsalPhaseOutcome.js`. Do not import the handlers file. No database, no HTTP, no Playwright, no Maestro. Test names are complete sentences.

- An apply result with empty `groupErrors`, empty `needsOperatorGroups`, and `libraryCopiedAtSet` true is done. The same result with `libraryCopiedAtSet` false is failed `library_not_closed`.
- `skip_already_copied` is done. `skip_missing_account` is failed `missing_v5_account` with message `no v5 account`.
- One group error `db_constraint:playlist_resource_pkey` is failed with that class, message `copy refused`, and that group. A `needsOperatorGroups` entry on the same result adds a second error line class `needs_operator` and message `left for operator`. The status stays failed.
- `needsOperatorGroups: ['add_by_rss']` and no group error is status `needs_operator`.
- `help` and `dry_run` are failed `unexpected:dry_run`.
- `replayPassFinished(5, 5)` and `replayPassFinished(5, 6)` are true. `replayPassFinished(5, 4)` is false.
- A requested id in `missingIds` is failed `missing_v4_account`. `ambiguousIds`, `invalidEmailIds`, and `invalidExpiryIds` use `ambiguous_email`, `invalid_email`, and `invalid_expiry`. An id in none of those lists is done.
- `unmatched` equal to `futureIds.length`, with `ambiguous` and `invalid` both 0 and length above 0, marks those future ids failed `membership_unmatched`. The same shape for `ambiguous` uses `membership_ambiguous`, and for `invalid` uses `membership_invalid`.
- `unmatched` 1 and `futureIds.length` 2 leaves the future ids done. `unmatched` 1 and `ambiguous` 1, even when the sum equals the length, leaves them done.
- `webOriginForStage('pilot', 'localhost:3002')` is sample false and origin null. Full with `localhost:3002` is sample true and origin `http://localhost:3002`. A value that already starts with `http://` or `https://` is kept, with one trailing slash removed. Full with a blank domain throws `Missing web origin for the public path sample.` A value containing `@` throws `invalid_web_origin`.
- `thrownErrorClass(new TypeError('x'))` is `unexpected:TypeError`. A thrown string is `unexpected:unknown`.
- `rehearsalPasswordFromEnv('  ')` is null. A non-empty trim is returned unchanged.
- `sweepIdentity(true)` is `done`. `sweepIdentity(false)` is `left_out`.

## Release scratchpad

Append this entry when this prompt runs alone. When it shares a phase with another prompt, do not edit the scratchpad; put the same entry in the final message under `Release notes entry`.

```markdown
## Local full migration rehearsal

- Surfaces: workers
- Change: `v4RunFullRehearsal` copies a stage of v4 accounts into the local database through identity, catalog, library, replay, membership, and a per-account check. It refuses a non-local database, dumps that database before each phase, restores the clean image for sample and full, and stops when more than 5% of the last 200 accounts fail in one phase.
- Who notices: operators running the local migration rehearsal
- Operator steps: start the parser again after `rehearsal restore=finished` so the catalog wait can finish. `--stage full` reads `WEB_DOMAIN` for the public path sample. Optional `V4_REHEARSAL_PASSWORD` checks sign-in for the rehearsal account only.
```

## Shared outcome helpers

`rehearsalPhaseOutcome.ts`. No `pg`, no logger, no filesystem. `import type` for `V4LibraryCommandResult` from `../v4Library/copyAccountLibrary.js` and for `LegacyMembershipImportCounts` from `../../billing/importLegacyMembershipExpiryLib.js`.

```typescript
export type PhaseErrorLine = {
  group: string | null;
  className: string;
  message: string;
};

export type LibraryPhaseDecision =
  | { status: 'done'; className: null; errors: [] }
  | { status: 'failed' | 'needs_operator'; className: string; errors: PhaseErrorLine[] };

export function classifyLibraryResult(result: V4LibraryCommandResult): LibraryPhaseDecision

export function replayPassFinished(before: number, after: number): boolean

export function membershipOutcomes(input: {
  requestedIds: readonly string[];
  missingIds: readonly string[];
  ambiguousIds: readonly string[];
  invalidEmailIds: readonly string[];
  invalidExpiryIds: readonly string[];
  futureIds: readonly string[];
  counts: Pick<LegacyMembershipImportCounts, 'unmatched' | 'ambiguous' | 'invalid'>;
}): Array<{ v4Id: string; status: 'done' | 'failed'; className: string | null }>

export function webOriginForStage(
  stage: 'pilot' | 'sample' | 'full',
  webDomain: string | null,
): { samplePublicPaths: boolean; webOrigin: string | null }

export function thrownErrorClass(error: unknown): string

export function rehearsalPasswordFromEnv(value: string | undefined): string | null

export function sweepIdentity(hasAccount: boolean): 'done' | 'left_out'
```

`replayPassFinished` is `after >= before`.

`thrownErrorClass` uses `unexpected:<name>` when `error` is an `Error` and `error.name` matches `/^[A-Za-z][A-Za-z0-9_]*$/` and `unexpected:` plus that name is at most 80 characters. Otherwise `unexpected:unknown`. Do not read `error.message`.

`rehearsalPasswordFromEnv` trims. Empty or undefined is null.

`sweepIdentity(true)` is `done`. False is `left_out`.

`webOriginForStage` for pilot and sample returns `{ samplePublicPaths: false, webOrigin: null }` and ignores the domain. Null and `''` are blank. Full with a blank domain throws `Missing web origin for the public path sample.` A domain containing `@` throws `invalid_web_origin`. A domain that starts with `http://` or `https://` is used as-is. Any other domain becomes `http://` plus the domain. Remove one trailing slash.

`classifyLibraryResult`:

- `help` or `dry_run`: failed `unexpected:dry_run`, one line, group null, message `unexpected:dry_run`.
- `skip_already_copied`: done.
- `skip_missing_account`: failed `missing_v5_account`, group null, message `no v5 account`.

On `action: 'apply'`, read `result.apply.groupErrors`, `result.apply.needsOperatorGroups`, and `result.apply.libraryCopiedAtSet`.

- Non-empty `groupErrors`: status failed, `className` is the first error's `class`. One line per error: group, that class, message `copy refused`. Then one line per `needsOperatorGroups` entry: that group, class `needs_operator`, message `left for operator`.
- Empty `groupErrors` and non-empty `needsOperatorGroups`: status `needs_operator`, class `needs_operator`, one `left for operator` line per group.
- Both lists empty and `libraryCopiedAtSet` true: done.
- Both lists empty and `libraryCopiedAtSet` false: failed `library_not_closed`, group null, message `library not closed`.

A test fixture fills the unread apply keys with zeros and empty arrays: `addByRssCap` is `{ count: 0, action: 'copy', writeTier: null }`, `directoryFollowCap` is `{ count: 0, action: 'copy', decision: { outcome: 'default' } }`, and `playlistsOverLimit` is `[]`. Do not import `copyAccountLibrary.js` from the test file.

`membershipOutcomes` starts every requested id as done with a null class. Then overlay, in this order, so the first list wins when an id is repeated: `missingIds` / `missing_v4_account`, `ambiguousIds` / `ambiguous_email`, `invalidEmailIds` / `invalid_email`, `invalidExpiryIds` / `invalid_expiry`. After that, when `futureIds.length > 0` and exactly one of `unmatched`, `ambiguous`, and `invalid` equals that length and the other two are 0, mark each future id that is still done as failed `membership_unmatched`, `membership_ambiguous`, or `membership_invalid`. Any other count mix leaves future ids as they stand. Ids that are only in `pastIds`, and requested ids in no list, stay done.

## Handler rules

Import `ensureAccountPhaseRows`, `setAccountPhaseStatus`, `setAccountPhaseStatusMany`, `listAccountPhaseV4UserIdsByStatus`, and `ACCOUNT_PHASE_STATUS_CHUNK` from `./accountPhaseStatus.js`. Import `classifyIdentityAction` from `./identityOutcome.js`. Call `context.emitProgress` after an account is given a final status. Call `context.noteAccount` once for that account, after the status write. `failed: true` only for status `failed`. `needs_operator`, done, and deferred left-out use `failed: false`.

A thrown error from one account becomes `thrownErrorClass`, message equal to that class, group from the phase table below, status failed. Do not pass the caught value to the logger. Do not put `error.message` in the log. Then continue with the next account unless `noteAccount` throws `rehearsal_stopped`.

`setAccountPhaseStatus` returning `{ applied: false, reason: 'done_is_terminal' }` is ignored. The row stays done.

`appendError` field names are `v4Id`, `phase`, `group`, `className`, `message`, and `now: context.wallClock()`. The account id is `v4Id`. A verify `exampleId` that matches `/^[A-Za-z0-9_-]{1,32}$/` is appended to the message as ` example <id>`.

Group names: identity `identity`, library the copy group's name, membership `membership`, verify the result `group` (the log stores null when that string is not lowercase). Catalog parse lines use group null.

### Preflight

`runPreflightPhase` reads the snapshot time and returns it. It does not write status rows.

```sql
SELECT to_char(max(users."updatedAt"), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS snapshot_at
FROM users
```

Export that text as `SNAPSHOT_UPDATED_AT_SQL`. Copy the `pg` `Client` connection pattern in `readV4Identity` inside `seedAccountIdentity.ts`: `process.env.V4_DATABASE_URL?.trim()`, throw `Missing V4_DATABASE_URL.` when empty, `client.end()` in `finally`. A query failure throws `Could not read the v4 snapshot time.` with no `cause` and no URL. One object row whose `snapshot_at` is a string or null is the value. Anything else throws the same message. Return null when the string is empty or `Date.parse` rejects it or it contains `@` or `://`. Otherwise return the string.

The loop stores that return and writes `run.json`. This handler does not call `writeRun`.

### Identity

`ensureAccountPhaseRows` for every picked id and phase `identity`. `runnableIds('identity')`. For each id, call `v4SeedAccountIdentity({ 'v4-id': id })` with no dry-run flag.

`classifyIdentityAction`:

- `failed`: set identity failed with that class, group `identity`, message the class. Then set `catalog`, `library`, `replay`, `membership`, and `verify` to `deferred` with class `identity_not_done`. `noteAccount({ failed: true })`. `emitProgress`.
- `written` or `left_out`: do not set a status yet. Add the id to a hold list. Do not write `accountId` from `classifyIdentityAction` onto the status row. A later account in this same pass can take that row. The lookup below is the decision.

After the loop, look up hold ids in chunks of `ACCOUNT_PHASE_STATUS_CHUNK`:

```sql
SELECT id_text, id
FROM account
WHERE id_text = ANY($1::varchar[])
```

Use `getDataSourceReadWrite().query`. Each row must be an object with string `id_text` and a safe integer `id` of at least 1. Otherwise throw `identity_account_result` and stop the phase. An id that appears is `sweepIdentity(true)`: `setAccountPhaseStatus` done with that `accountId`, `noteAccount({ failed: false })`. An id that does not appear is `sweepIdentity(false)`: set `identity`, `catalog`, `library`, `replay`, `membership`, and `verify` to `deferred` with class `email_case_left_out`, `noteAccount({ failed: false })`. Call `emitProgress` after every 100 hold ids and once after the last hold id.

`email_case_left_out` is the decided twin outcome. Do not `appendError` and do not call `appendDeferred`. A crash before the sweep leaves the held ids pending, and a resume calls the command again.

### Catalog

`ensureAccountPhaseRows` for every picked id and phase `catalog`. Let `ids` be `runnableIds('catalog')`. When `ids` is empty, return. The loop still closes the phase.

When `context.stage` is `full`, call `v4SeedStageCatalog({ stage: 'full', v4Ids: [], dryRun: false, onProgress })`. Full ignores `v4Ids`, so `--limit` does not shrink this catalog. Pilot and sample pass `v4Ids: ids` and the same `dryRun: false`.

`onProgress` calls `context.writeLine` with `rehearsal phase=catalog created=<n> queued=<n> settled=<n> failed_parse=<n> waiting=<n>` using those progress fields, then `emitProgress`. The numbers are the only text added.

For each `failedPodcastIds` entry, `appendError` phase `catalog`, group null, class `parse_failed`, message `parse failed`, `v4Id` that podcast id. Do not `noteAccount` for a podcast id. Do not mark an account failed.

Then `setAccountPhaseStatusMany({ v4UserIds: ids, phase: 'catalog', status: 'done' })`. A thrown catalog error, including a public-id refusal, is not caught. Those accounts stay pending.

### Library

`ensureAccountPhaseRows` for phase `library`, then `runnableIds('library')`. For each id, `v4CopyAccountLibrary({ 'v4-id': id })`. `classifyLibraryResult` chooses the status. `appendError` once per returned line, phase `library`, `v4Id` the account. `noteAccount` true only when the status is failed. A later phase still runs for this account. Do not set replay, membership, or verify to deferred here.

### Replay

Export `REPLAY_ELIGIBLE_COUNT_SQL`:

```sql
SELECT count(*)::int AS n
FROM legacy_pending_row
WHERE row_kind <> 'subscription'
  AND (status = 'unresolved' OR (status = 'resolved' AND reason = 'snapshot'))
```

That is the filter in `PENDING_SQL` inside `replayLegacyRows.ts`, without the account predicate and without `LIMIT`. Read it with `getDataSourceReadWrite().query`. One object with integer `n` of at least 0. Otherwise throw `replay_count`.

`ensureAccountPhaseRows` for phase `replay`. Let `ids` be `runnableIds('replay')`. When `ids` is empty, return.

Count. When the count is 0, mark the ids and return. Otherwise loop: `v4ReplayLegacyRows({})` with no flags, count again, `emitProgress`, and stop when `replayPassFinished(before, after)` is true. Set `before` to `after` when it is false. A throw from the replay command is not caught.

A stable count with rows still eligible is a finished pass. Mark every id in `ids` done with `setAccountPhaseStatusMany`. `noteAccount({ failed: false })` for each, then one `emitProgress`. Do not fail an account because a row is still unresolved. Verify reports a row that should have been written.

There is no progress callback inside `v4ReplayLegacyRows`. Emit when a pass returns.

### Membership

`ensureAccountPhaseRows` for phase `membership`. Let `runnable` be `runnableIds('membership')`. Let `identityDone` be a `Set` from `listAccountPhaseV4UserIdsByStatus('identity', 'done')`. `requestedIds` is `runnable` filtered to that set, in the same order.

When `requestedIds` is empty, return.

`outputPath` is `path.join(os.tmpdir(), 'v4-paid-expiry-' + context.runId + '.csv')`. Call `rebuildLegacyMembershipExpiryFile({ v4Ids: requestedIds, outputPath, now: context.runNow })`. Mark the four id lists from that result failed before the import, using the classes in `membershipOutcomes`, by calling the pure function with empty `futureIds` and zero counts so only those lists change, and writing the failed rows now. `appendError` for each, group `membership`, message the class. `noteAccount({ failed: true })`.

Then `billingImportLegacyMembershipExpiry({ file: outputPath }, { now: context.runNow })`. Delete `outputPath` in a `finally` (`rm` with `force: true`). Do not pass `--report` or `--dry-run`. A throw skips the success marks. The `finally` still deletes the file. Do not log the path.

When the return is `undefined`, throw `Membership import returned no counts.` When it returns counts, call `membershipOutcomes` with the rebuild id lists and those counts. Write the rows whose status is still unset: the pre-import failures are already written, so skip ids already set to failed in this call. Done rows use `setAccountPhaseStatusMany` in one call. Each failed class uses one `setAccountPhaseStatusMany` with that `errorClass`. `appendError` for a future-id failure that was not already written. `noteAccount` once per id that this second write changes. `emitProgress` once at the end.

`noGrant` ids are the requested ids in no returned list. They are done. `pastIds` are done. Do not compare `skippedExpired` to `pastIds.length` here.

### Verify

Read `webOriginForStage(context.stage, process.env.WEB_DOMAIN?.trim() ?? '')`. A blank `WEB_DOMAIN` is null. The throw for a full stage with a blank origin happens before any account, and it is not caught.

`password` is `rehearsalPasswordFromEnv(process.env.V4_REHEARSAL_PASSWORD)`. When it is non-null, `comparePassword` is `(plain, hash) => bcrypt.compare(plain, hash)`. When it is null, `comparePassword` is null. Add `bcrypt` `^6.0.0` to `apps/workers` dependencies and `@types/bcrypt` `^6.0.0` to devDependencies, the same ranges as `apps/api/package.json`. From the repo root run `./scripts/development/update-lockfile-linux.sh` and leave `package-lock.json` in the working tree. Do not log the password or the hash.

`ensureAccountPhaseRows` for phase `verify`, then `runnableIds('verify')`. For each id, `verifyAccount(id, { now: context.runNow, samplePublicPaths, webOrigin, rehearsalPassword: password, comparePassword })`. Do not pass `requestPath`.

- `{ ok: true }`: done, `noteAccount({ failed: false })`.
- `{ ok: false, class: 'needs_operator' }`: status `needs_operator`, error class `needs_operator`, one `appendError`, `noteAccount({ failed: false })`.
- any other class: status failed, that class, one `appendError` with the result `message` plus the example suffix, `noteAccount({ failed: true })`.

`emitProgress` after each account.

## Lockfile

The lockfile script is part of this change because the dependency is new. Do not run the test suite.

## Out of scope

Do not change a phase order, the 5% window, or the clean-image rule. Those are plan 82. Do not write `deferred.md` or `fixes.md`. The overnight prompt does that.
