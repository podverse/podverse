**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

Account phase status for the full local migration rehearsal. One row per v4 user
and phase in the local app database. The rehearsal runner resumes from it. The
later end-of-grace batch and the daily review of copied, remaining, and failed
accounts read the same rows. This plan does not build those later jobs.

Pattern to copy: `infra/k8s/base/ops/source/database/linear-migrations/app/0008_legacy_pending_row.sql`
(identity primary key, timestamptz, `set_updated_at_field`, grants) and the
`@Entity` / `@Check` / `@Index` style on `packages/orm/src/entities/account/accountSession.ts`.
Writes go through `AppDataSourceReadWrite.transaction` and `.manager.query`.
That proxy has no `.query` method (`packages/orm/src/db/index.ts`).

## Rows

R52, R53

## Runs after

none

## Files

infra/k8s/base/ops/source/database/linear-migrations/app/0010_account_phase_status.sql
infra/k8s/base/api/source/api.env
infra/k8s/base/ops/kustomization.yaml
infra/k8s/base/db/source/bootstrap/0004_app_linear_baseline.sql.gz
infra/k8s/base/db/source/bootstrap/0005_management_linear_baseline.sql.gz
packages/orm/src/entities/account/accountPhaseStatus.ts
packages/orm/src/db/entities.ts
packages/orm/src/index.ts
packages/orm/src/services/account/accountPhaseStatusLib.ts
packages/orm/src/services/account/accountPhaseStatus.ts
packages/orm/src/services/account/accountPhaseStatusLib.test.ts
apps/workers/src/commands/orm/v4Rehearsal/accountPhaseStatus.ts

Do not edit `release-notes/scratchpad.md` in this plan. The entry under
Release scratchpad is repeated in the implementation final message. The set's
last prompt appends it.

## Tests

`packages/orm/src/services/account/accountPhaseStatusLib.test.ts` (Vitest, no database).

No API integration test, no Playwright spec, and no Maestro flow. This change
does not add a route or a screen. No operator command block.

## Release scratchpad

## Account phase status

- Surfaces: k8s, workers
- Change: App migration `0010_account_phase_status.sql` adds `account_phase_status`. One row per v4 user and phase (`identity`, `catalog`, `library`, `replay`, `membership`, `verify`) stores `pending`, `done`, `failed`, `deferred`, or `needs_operator`. `API_EXPECTED_MIGRATION_FILENAME` advances to that file. The management marker stays. The rehearsal runner resumes from these rows and the same rows are what a later copied / remaining / failed review counts.
- Who notices: a deploy waits until this migration is applied. No screen change.
- Operator steps: none beyond the usual migration apply

## Do not touch

- `MANAGEMENT_API_EXPECTED_MIGRATION_FILENAME` and `infra/k8s/base/management-api/source/management-api.env`
- `infra/k8s/base/api/deployment.yaml` and `infra/k8s/base/management-api/deployment.yaml` (they already read the marker env)
- `packages/orm/src/entities/account/account.ts` and `v4_library_copied_at`
- `apps/workers/src/commands/orm/v4Library/**`, `v4Identity/**`, `v4Catalog/**`
- `apps/workers/src/commands/billing/importLegacyMembershipExpiry.ts`
- `packages/worker-commands/src/registry.ts`, `apps/workers/src/commands/index.ts`, `categoriesForCommand.ts`, workers `package.json`, `apps/workers/ENV.md`
- `apps/workers/src/commands/orm/v4Rehearsal/index.ts` (do not create it)
- `docs/proposals/v4-to-v5-migration/16-full-local-migration-rehearsal.md`
- Any other area's new files under `v4Rehearsal/`

The library copy, catalog phase, membership phase, pick, and log do not write
this table. The only writer is the service below. The runner calls the worker
module. It does not issue its own SQL.

## Schema

New file `0010_account_phase_status.sql`. Greenfield SQL: plain `CREATE`, no
`IF NOT EXISTS`, no `ON CONFLICT` in the migration file. Header comment, and
no mention of a plan or a proposal doc:

```sql
-- One row per v4 user and migration phase. status is pending, done, failed,
-- deferred, or needs_operator. error_class is a short token. The row stores
-- the v4 user id and that token, never an email, a name, a password hash,
-- or a raw row.
```

```sql
CREATE TABLE public.account_phase_status (
    id bigint GENERATED ALWAYS AS IDENTITY,
    v4_user_id text NOT NULL,
    phase text NOT NULL,
    status text NOT NULL,
    account_id integer,
    error_class text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_phase_status_pkey PRIMARY KEY (id),
    CONSTRAINT account_phase_status_v4_user_phase_unique UNIQUE (v4_user_id, phase),
    CONSTRAINT account_phase_status_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE,
    CONSTRAINT account_phase_status_phase_check
      CHECK (phase IN (
        'identity', 'catalog', 'library', 'replay', 'membership', 'verify'
      )),
    CONSTRAINT account_phase_status_status_check
      CHECK (status IN (
        'pending', 'done', 'failed', 'deferred', 'needs_operator'
      )),
    CONSTRAINT account_phase_status_v4_user_id_check
      CHECK (
        char_length(v4_user_id) BETWEEN 1 AND 32
        AND v4_user_id !~ '[[:space:]@]'
      ),
    CONSTRAINT account_phase_status_error_class_check
      CHECK (
        error_class IS NULL
        OR (
          char_length(error_class) BETWEEN 1 AND 80
          AND error_class ~ '^[A-Za-z0-9_:]+$'
        )
      ),
    CONSTRAINT account_phase_status_error_class_status_check
      CHECK (
        (
          status IN ('pending', 'done')
          AND error_class IS NULL
        )
        OR (
          status IN ('failed', 'deferred', 'needs_operator')
          AND error_class IS NOT NULL
        )
      )
);

CREATE INDEX account_phase_status_phase_status_idx
  ON public.account_phase_status USING btree (phase, status);

CREATE INDEX account_phase_status_account_id_idx
  ON public.account_phase_status USING btree (account_id)
  WHERE account_id IS NOT NULL;

CREATE TRIGGER set_updated_at_account_phase_status
  BEFORE UPDATE ON public.account_phase_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_phase_status TO podverse_app_read_write;
GRANT SELECT ON TABLE public.account_phase_status TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_phase_status_id_seq TO podverse_app_read_write;
GRANT SELECT ON SEQUENCE public.account_phase_status_id_seq TO podverse_app_read;
```

No `preflight` phase. Preflight is a database dump, not a per-account row.
No `skipped` status. No `stage` column and no run id. Sample and full stages
restore a clean database, which clears the table. Production keeps one row
per v4 user per phase.

`v4_user_id` is the v4 `users.id` that identity stores as `account.id_text`.
`account_id` stays null until that account row exists. Deleting the account
cascades rows that already point at it. Unlinked rows stay.

There is no trigger that raises when a `done` row would change status. The
upsert below refuses that write and returns no row, so the transaction stays
open and the caller gets `done_is_terminal` instead of a database error.

## Markers and baselines

- `infra/k8s/base/api/source/api.env` line `API_EXPECTED_MIGRATION_FILENAME`: set
  `0010_account_phase_status.sql`. Leave the value unquoted.
- `infra/k8s/base/ops/kustomization.yaml`: same filename on the
  `podverse-ops-migration-scripts` literal `API_EXPECTED_MIGRATION_FILENAME`.
  Leave `MANAGEMENT_API_EXPECTED_MIGRATION_FILENAME` as
  `0002_nano_id_v2_min_7.sql`.
- In that file's `podverse-ops-app-linear-migrations` `files` list, add
  `source/database/linear-migrations/app/0010_account_phase_status.sql`
  immediately after the `0009_product_membership_shared_add_by_rss_limit.sql`
  line.
- From the repo root, after the SQL file and the marker edits, run
  `make db_regen_linear_baseline` and then `make db_verify_linear_baseline`.
  Leave both gz archives as the script wrote them. Do not hand-edit either
  archive. If regen cannot run, stop and report that blocker. Do not invent
  archive bytes.

`0010` is the only new app migration in this set.

## Entity

`packages/orm/src/entities/account/accountPhaseStatus.ts`. Class
`AccountPhaseStatus`. `@Entity('account_phase_status')`.

- `id`: `@PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })`, type `string` (same as `AccountSession`).
- `v4_user_id` text, not null.
- `phase` text, not null.
- `status` text, not null.
- `account_id` integer, nullable, plus `@ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE', nullable: true })` and `@JoinColumn({ name: 'account_id' })`. Do not add a relation field on `Account`.
- `error_class` text, nullable.
- `created_at` / `updated_at`: `@CreateDateColumn` / `@UpdateDateColumn` with `type: 'timestamptz'`.
- `@Unique('account_phase_status_v4_user_phase_unique', ['v4_user_id', 'phase'])`.
- `@Index('account_phase_status_phase_status_idx', ['phase', 'status'])`.
- `@Index('account_phase_status_account_id_idx', ['account_id'], { where: '"account_id" IS NOT NULL' })`.
- `@Check` names and expressions match the SQL constraints above, including the two error-class checks and the v4 user id check.

Register it in `packages/orm/src/db/entities.ts`: import it immediately after
the `AccountNotificationPreference` import, and add it to the `entities` array
immediately after `AccountNotificationPreference`.

Export it from `packages/orm/src/index.ts` immediately before
`export * from './entities/account/accountPendingFollowingChannel.js'`.

## Rules module

`packages/orm/src/services/account/accountPhaseStatusLib.ts`. No database
import. Named exports only.

```typescript
export const ACCOUNT_PHASES = [
  'identity',
  'catalog',
  'library',
  'replay',
  'membership',
  'verify',
] as const;

export const ACCOUNT_PHASE_STATUSES = [
  'pending',
  'done',
  'failed',
  'deferred',
  'needs_operator',
] as const;

export const ACCOUNT_PHASE_STATUS_CHUNK = 500;

export const STATUS_UPSERT_GUARD =
  "account_phase_status.status <> 'done' OR EXCLUDED.status = 'done'";
```

Types: `AccountPhase`, `AccountPhaseStatusValue` from those arrays.

```typescript
export type SetAccountPhaseStatusResult =
  | { applied: true }
  | { applied: false; reason: 'done_is_terminal' };
```

`AccountPhaseStatusInputError` extends `Error`. `name` is
`AccountPhaseStatusInputError`. `code` is one of `invalid_v4_user_id`,
`invalid_phase`, `invalid_status`, `invalid_error_class`, `invalid_account_id`,
`invalid_include_failed`, `account_mismatch`. The message is the code only.
Never put a v4 user id, an email, or a row into the message.

Functions:

- `assertV4UserId(value: unknown): string`. Accept a string of length 1–32 with no whitespace and no `@`. Anything else throws `invalid_v4_user_id`. Do not trim.
- `assertPhase(value: unknown): AccountPhase`. Must be one of `ACCOUNT_PHASES`. Else `invalid_phase`.
- `assertStatus(value: unknown): AccountPhaseStatusValue`. Must be one of `ACCOUNT_PHASE_STATUSES`. Else `invalid_status`.
- `assertErrorClass(status: AccountPhaseStatusValue, value: unknown): string | null`. `pending` and `done` accept only `null` or `undefined` and return `null`. Any string for those two throws `invalid_error_class`. `failed`, `deferred`, and `needs_operator` require a string of length 1–80 matching `^[A-Za-z0-9_:]+$`. Empty, null, whitespace, `@`, or any other character throws `invalid_error_class`.
- `assertAccountId(value: unknown): number`. Integer `>= 1` and `Number.isSafeInteger`. Else `invalid_account_id`.
- `assertIncludeFailed(value: unknown): boolean`. A boolean passes through. Anything else throws `invalid_include_failed`.
- `isRunnableStatus(status: AccountPhaseStatusValue, includeFailed: boolean): boolean`. `pending` is always true. `failed` is true only when `includeFailed` is true. `done`, `deferred`, and `needs_operator` are false.
- `uniqueInOrder(ids: readonly string[]): string[]`. First occurrence wins.
- `chunkIds(ids: readonly string[]): string[][]`. Slices of `ACCOUNT_PHASE_STATUS_CHUNK`.
- `emptyStatusCounts(): Record<AccountPhaseStatusValue, number>`. All five keys, each `0`.

Transition rule, enforced by `STATUS_UPSERT_GUARD` in the upserts, not by a second read:

- A missing row can be inserted at any status.
- `done` may be written again as `done` (same row, `error_class` null).
- `done` is not replaced by `pending`, `failed`, `deferred`, or `needs_operator`.
- Any non-`done` status may move to any status, including back to `pending`.
- Linking `account_id` is not a status change. It is allowed on a `done` row.

A stage starts over by restoring a database, not by reopening `done` rows.
`--retry-failed` retries `failed` only. `deferred` and `needs_operator` stay
until a later call sets a new status on purpose. Those calls still cannot
leave `done`.

## Service

`packages/orm/src/services/account/accountPhaseStatus.ts`. Class
`AccountPhaseStatusService`. Constructor does not touch the database.
Methods call `AppDataSourceReadWrite` from `@orm/db/index.js` at call time.
Use `.transaction((manager) => manager.query(...))` for writes.
Use `.manager.query` for reads. Do not use the read-only source.
Do not log. Start the file with `export * from './accountPhaseStatusLib.js'`
and export the class beside it. `packages/orm/src/index.ts` then re-exports
this module. The upsert SQL is a template string that interpolates
`${STATUS_UPSERT_GUARD}`. Do not paste a second copy of that guard text.

Parse every `query` result with a type guard. Do not use a type assertion.
A result that is not the shape below throws `new Error('account_phase_status_result')`
with that message only.

`count(*)::int` comes back as a number. A string count is
`account_phase_status_result`, not a coerced number.

Export the class and the lib symbols from `packages/orm/src/index.ts`
immediately before
`export * from './services/account/accountPendingFollowingChannel.js'`.

### ensureAccountPhaseRows(v4UserIds, phase) → `{ inserted: number }`

Validate `phase`. `uniqueInOrder`, then `assertV4UserId` on each id. Empty
list returns `{ inserted: 0 }` and does not query.

One transaction for the whole call. Chunk with `chunkIds`. For each chunk:

1. Mismatch probe. If it returns a row, throw `AccountPhaseStatusInputError`
   with `account_mismatch` (the transaction rolls back).

```sql
SELECT 1 AS mismatch
FROM account_phase_status
WHERE v4_user_id = ANY($1::text[])
  AND account_id IS NOT NULL
GROUP BY v4_user_id
HAVING count(DISTINCT account_id) > 1
LIMIT 1
```

2. Insert missing rows. `ON CONFLICT DO NOTHING` so an existing `done`,
   `failed`, `deferred`, `needs_operator`, or `pending` row is unchanged.
   Copy `account_id` from any sibling row for that v4 user.

```sql
WITH incoming AS (
  SELECT DISTINCT id
  FROM unnest($1::text[]) AS t(id)
),
inserted AS (
  INSERT INTO account_phase_status (v4_user_id, phase, status, account_id)
  SELECT i.id, $2, 'pending', src.account_id
  FROM incoming i
  LEFT JOIN LATERAL (
    SELECT s.account_id
    FROM account_phase_status s
    WHERE s.v4_user_id = i.id
      AND s.account_id IS NOT NULL
    ORDER BY s.account_id
    LIMIT 1
  ) src ON true
  ON CONFLICT (v4_user_id, phase) DO NOTHING
  RETURNING v4_user_id
)
SELECT count(*)::int AS inserted FROM inserted
```

3. Backfill null `account_id` values from a sibling in the same chunk:

```sql
UPDATE account_phase_status AS target
SET account_id = src.account_id
FROM (
  SELECT v4_user_id, min(account_id) AS account_id
  FROM account_phase_status
  WHERE v4_user_id = ANY($1::text[])
    AND account_id IS NOT NULL
  GROUP BY v4_user_id
) AS src
WHERE target.v4_user_id = src.v4_user_id
  AND target.account_id IS NULL
```

Sum `inserted` across chunks. The backfill does not add to `inserted`.

### setAccountPhaseStatus(input) → `SetAccountPhaseStatusResult`

Input: `{ v4UserId, phase, status, accountId?, errorClass? }`.
Validate phase, status, v4 user id, and error class. When `accountId` is
present, `assertAccountId`. When it is absent, pass SQL `null` and do not
run the single-id mismatch probe.

One transaction:

1. If `accountId` is present:

```sql
SELECT 1 AS mismatch
FROM account_phase_status
WHERE v4_user_id = $1
  AND account_id IS NOT NULL
  AND account_id <> $2
LIMIT 1
```

A row means throw `account_mismatch`.

2. Upsert. `$4` is the account id or null. `$5` is the error class or null.
   The `WHERE` clause is `STATUS_UPSERT_GUARD` interpolated into the SQL,
   not a second copy of that string.

```sql
WITH upserted AS (
  INSERT INTO account_phase_status (
    v4_user_id, phase, status, account_id, error_class
  )
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (v4_user_id, phase) DO UPDATE
  SET status = EXCLUDED.status,
      error_class = EXCLUDED.error_class,
      account_id = COALESCE(EXCLUDED.account_id, account_phase_status.account_id)
  WHERE account_phase_status.status <> 'done' OR EXCLUDED.status = 'done'
  RETURNING v4_user_id
)
SELECT count(*)::int AS applied FROM upserted
```

`applied === 0` returns `{ applied: false, reason: 'done_is_terminal' }` and
does not run step 3. `applied === 1` continues. Any other count throws
`account_phase_status_result`.

3. When `accountId` is present and the upsert applied:

```sql
UPDATE account_phase_status
SET account_id = $2
WHERE v4_user_id = $1
  AND account_id IS NULL
```

Return `{ applied: true }`.

### setAccountPhaseStatusMany(input) → `{ applied: number; refusedDone: number }`

Input: `{ v4UserIds, phase, status, errorClass? }`. No `accountId`.
Validate phase, status, and error class once. `uniqueInOrder`, then validate
each id. Empty list returns `{ applied: 0, refusedDone: 0 }` and does not query.

One transaction. Mismatch probe (the batch probe above) on each chunk, then:

```sql
WITH incoming AS (
  SELECT DISTINCT id
  FROM unnest($1::text[]) AS t(id)
),
upserted AS (
  INSERT INTO account_phase_status (v4_user_id, phase, status, error_class, account_id)
  SELECT i.id, $2, $3, $4, src.account_id
  FROM incoming i
  LEFT JOIN LATERAL (
    SELECT s.account_id
    FROM account_phase_status s
    WHERE s.v4_user_id = i.id
      AND s.account_id IS NOT NULL
    ORDER BY s.account_id
    LIMIT 1
  ) src ON true
  ON CONFLICT (v4_user_id, phase) DO UPDATE
  SET status = EXCLUDED.status,
      error_class = EXCLUDED.error_class
  WHERE account_phase_status.status <> 'done' OR EXCLUDED.status = 'done'
  RETURNING v4_user_id
)
SELECT count(*)::int AS applied FROM upserted
```

Do not set `account_id` in that `UPDATE`. The `WHERE` is `STATUS_UPSERT_GUARD`.
After the upserts, run the same null-`account_id` backfill as ensure, for
that chunk's ids.

`refusedDone` is the unique input count minus the sum of `applied`. A missing
row that inserts counts as applied. A `done` row written as `done` counts as
applied. A `done` row that the guard skips counts as refused.

### linkAccountPhaseStatus(v4UserId, accountId) → `void`

Validate both. One transaction. Run the single-id mismatch probe. Then:

```sql
UPDATE account_phase_status
SET account_id = $2
WHERE v4_user_id = $1
  AND account_id IS NULL
```

Does not change `status` or `error_class`. Does not insert a row. Zero rows
updated is success (nothing to link, or already linked to this account).

### listAccountPhaseV4UserIds(phase, { includeFailed }) → `string[]`

Validate `phase` with `assertPhase` and the flag with `assertIncludeFailed`.

```sql
SELECT v4_user_id
FROM account_phase_status
WHERE phase = $1
  AND (
    status = 'pending'
    OR ($2::boolean IS TRUE AND status = 'failed')
  )
ORDER BY v4_user_id ASC
```

This list is the full set. It does not take a limit. The predicate matches
`isRunnableStatus`.

### listAccountPhaseV4UserIdsByStatus(phase, status) → `string[]`

Validate both. Full set, `ORDER BY v4_user_id ASC`.

```sql
SELECT v4_user_id
FROM account_phase_status
WHERE phase = $1
  AND status = $2
ORDER BY v4_user_id ASC
```

### countAccountPhaseStatus(phase) → `Record<AccountPhaseStatusValue, number>`

Validate `phase`. Start from `emptyStatusCounts()`. Fill from:

```sql
SELECT status, count(*)::int AS n
FROM account_phase_status
WHERE phase = $1
GROUP BY status
```

A `status` string outside `ACCOUNT_PHASE_STATUSES` throws
`account_phase_status_result`. Do not drop it.

Each row guard: object with `status` string and `n` number.
List guards: array of objects with `v4_user_id` string. A bad element throws
`account_phase_status_result`.

## Worker module

`apps/workers/src/commands/orm/v4Rehearsal/accountPhaseStatus.ts`.

Import `AccountPhaseStatusService`, `ACCOUNT_PHASES`, `ACCOUNT_PHASE_STATUSES`,
and `AccountPhaseStatusInputError` from `@podverse/orm`. Import the types
`AccountPhase`, `AccountPhaseStatusValue`, and `SetAccountPhaseStatusResult`
on a separate `import type` line.

Export those constants, the error class, and those types. Export async
functions with the same names and arguments as the seven service methods.
One module-level `new AccountPhaseStatusService()`. Each function returns
that method's result. Do not copy SQL or validation into this file. Do not
register a worker command.

Comment, present tense, no plan path: these functions are how a caller
records account phase status.

## What the counts mean

Phase `library` is the copy record the later review uses.

- Copied: `done`.
- Failed copies: `failed`.
- Left (not copied): `pending` + `failed` + `deferred` + `needs_operator`.
  Failed is also left. The failed count is the subset a daily review watches.
- End-of-grace "not yet migrated": `listAccountPhaseV4UserIds('library', { includeFailed: false })`, which is `pending` only.
- End-of-grace failure report: `listAccountPhaseV4UserIdsByStatus('library', 'failed')`. Ids and counts only. The class is on the row. The message is not.
- `deferred` and `needs_operator` are in the five counts. They are not in the automatic batch and not in the failed list.

Accounts with no `library` row are in none of those numbers. The caller that
owns the population inserts them with `ensureAccountPhaseRows` first.

`countAccountPhaseStatus` is per phase, for the whole table. There is no
stage filter.

## Unit tests

Table-driven cases in `accountPhaseStatusLib.test.ts`:

- `eFv5NFx` passes `assertV4UserId`. `''`, a 33-character string, a string with a space, and `a@b.example` throw `invalid_v4_user_id`.
- Each of the six phases passes. `preflight` and `''` throw `invalid_phase`.
- Each of the five statuses passes. `skipped` throws `invalid_status`.
- `pending` and `done` accept `null` and `undefined` and reject `unaccounted`.
- `failed`, `deferred`, and `needs_operator` accept `unaccounted`, `needs_operator`, `db_constraint:playlist_cap`, and `unexpected:TypeError`. They reject `null`, `undefined`, `''`, `has space`, `a@b`, and a string of length 81.
- `assertAccountId(1)` passes. `0`, `-1`, `1.5`, and `Number.NaN` throw `invalid_account_id`.
- `assertIncludeFailed` returns `true` and `false` unchanged. `undefined` throws `invalid_include_failed`.
- `isRunnableStatus`: `pending` is true for both flag values. `failed` is true only when the flag is true. `done`, `deferred`, and `needs_operator` are false for both.
- `uniqueInOrder` keeps the first of a repeated id and the original order.
- `chunkIds([])` is `[]`. 500 ids is one chunk. 501 ids is a chunk of 500 and a chunk of 1.
- `emptyStatusCounts` has all five keys at 0.
- `STATUS_UPSERT_GUARD` equals `account_phase_status.status <> 'done' OR EXCLUDED.status = 'done'`.
- `AccountPhaseStatusInputError` message equals its `code`.

Do not add a database test. The baseline regen is the schema check.

## Implementation order

1. SQL file, then the two marker edits and the kustomization file list.
2. `make db_regen_linear_baseline` and `make db_verify_linear_baseline` from the repo root.
3. Entity, `entities.ts`, entity export.
4. Lib, lib test, service, service export.
5. Worker module.
6. Do not edit the scratchpad. Put the Release scratchpad entry in the final message under `Release notes entry`.
