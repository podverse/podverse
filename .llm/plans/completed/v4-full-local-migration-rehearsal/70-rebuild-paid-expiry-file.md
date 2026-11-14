# Rebuild the paid-expiry file

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

One change. Build the paid-expiry CSV for the accounts the caller names, then let the existing import write `legacy_import` grants. Do not register a worker command. Do not edit doc 16, the worker registry, `apps/workers/src/commands/index.ts`, `categoriesForCommand.ts`, the workers `package.json`, or `apps/workers/ENV.md`. Do not write a trial grant, and do not set Premium or Trial. Identity already did that. Do not read `freeTrialExpiration`. Do not import PayPal, Google Play, BitPay, or App Store receipt rows.

The CSV shape stays `email,membership_expires_at`. The import parser in `importLegacyMembershipExpiryLib.ts` stays as it is. The only edit to `importLegacyMembershipExpiry.ts` is the shared clock below.

## Rows

R34

## Runs after

none

## Files

- `apps/workers/src/commands/billing/rebuildLegacyMembershipExpiryFileLib.ts`
- `apps/workers/src/commands/billing/rebuildLegacyMembershipExpiryFileLib.test.ts`
- `apps/workers/src/commands/billing/rebuildLegacyMembershipExpiryFile.ts`
- `apps/workers/src/commands/billing/importLegacyMembershipExpiry.ts`

## Tests

Unit tests in `rebuildLegacyMembershipExpiryFileLib.test.ts` only. Workers Vitest, no database. No API integration, no Playwright, no Maestro. Do not add a test that connects to `V4_DATABASE_URL`.

## Release scratchpad

none

## What the caller gets

Named export from `rebuildLegacyMembershipExpiryFile.ts`:

```ts
export async function rebuildLegacyMembershipExpiryFile(input: {
  v4Ids: readonly string[];
  outputPath: string;
  now: Date;
}): Promise<RebuildLegacyMembershipExpiryFileResult>
```

`now` is required. The function does not call `new Date()`. Area H passes the same `Date` on every membership attempt in one run, including a retry. A later clock moves the five-year end forward, and the import only raises `ends_at`, so the verify check in plan 30 would fail.

`billingImportLegacyMembershipExpiry` gains an optional second argument and a return value. Flags, help text, parser, skip rules, and the later-end rule stay.

```ts
export const billingImportLegacyMembershipExpiry = async (
  args: CommandLineArgs,
  options?: { now?: Date },
): Promise<LegacyMembershipImportCounts | undefined>
```

- `--help` returns `undefined` and writes the existing help.
- Otherwise `options.now` is the grant `starts_at` when it is a valid `Date`. Omitted means `new Date()`, which is today's CLI behavior.
- An invalid `options.now` throws `Membership import now is not a valid time.` before any read.
- The successful path returns `result.counts`. It does not return `reportRows`. Those rows contain emails.
- Pass that same `now` into `createLegacyImport` as `startsAt`. Today `legacyMembershipExpiryDeps` uses `new Date()` inside the command. Replace that with the clock chosen above. Do not pass a different clock into `BillingMembershipGrantService.createGrant`'s `now` field. Leave recompute on its own clock. `ends_at` is the file timestamp.

Area H calls this function in process. It does not shell out, and it does not pass `--report`. The report contains emails. The command still does not check `DB_HOST`. Area H's local-database refusal runs before the call.

Do not change the rule that `ends_at` moves later only, and do not revive a revoked `legacy_import` grant. A database that already has grants from an earlier sitting can fail plan 30's `ends_at` check. Sample and full restore a clean database first. This plan does not special-case that.

## File path

`outputPath` must be absolute. Resolve it. Walk up from `process.cwd()` until a directory contains both `.git` and `apps/workers`. When that root exists, refuse a path inside it whose relative path is not `.artifacts` and does not start with `.artifacts/`. Throw `Membership expiry file must stay outside the repo or under .artifacts.` Throw `Membership expiry file path must be absolute.` when it is not absolute.

The run folder's named files (`run.json`, `pick.json`, `errors.jsonl`, `summary.json`, `summary.md`, `deferred.md`, `fixes.md`, and `dumps/`) must not receive this CSV. It contains emails. Area H passes a path from `os.tmpdir()` and deletes that path after `billingImportLegacyMembershipExpiry` returns or throws. This function does not delete the file.

Write the file last, after the query and the in-memory CSV succeed. Header-only is a successful write. Use `utf8` and a trailing newline.

## v4 read

Copy the connection pattern in `readV4Identity` inside `seedAccountIdentity.ts`: `pg` `Client`, `process.env.V4_DATABASE_URL?.trim()`, throw `Missing V4_DATABASE_URL.` when that string is empty, `client.end()` in `finally`. On a query failure throw `Could not read v4 membership expiries.` with `cause` set to the driver error. The message must not contain the URL, an email, or a row.

Dedupe `v4Ids` with a `Set`, drop empty strings, and keep first-seen order. When the list is empty, write a header-only file and return zero counts and empty id arrays. Do not connect.

`SELECT` only. Export the SQL text as `PAID_EXPIRY_SOURCE_SQL` from the lib so the test can lock it.

```sql
SELECT ids.id AS id_text,
       u.email,
       CASE
         WHEN u."membershipExpiration" IS NULL THEN NULL
         ELSE to_char(u."membershipExpiration", 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
       END AS membership_expires_at,
       (u.id IS NOT NULL) AS found,
       COALESCE(
         u."membershipExpiration" > ($2::timestamptz AT TIME ZONE 'UTC'),
         false
       ) AS beyond_five_years,
       EXISTS (
         SELECT 1
         FROM "appStorePurchase" p
         WHERE p."ownerId" = u.id
           AND p.purchase_date_ms ~ '^[0-9]+$'
           AND p.purchase_date_ms::numeric >= 1703635200000
           AND p.purchase_date_ms::numeric < 1706745600000
       ) AS app_store_window
FROM unnest($1::varchar[]) AS ids(id)
LEFT JOIN users u ON u.id = ids.id
```

- `$1` is the deduped id list.
- `$2` is `addUtcYears(now, 5).toISOString()`.
- `1703635200000` is `2023-12-27T00:00:00.000Z` inclusive.
- `1706745600000` is `2024-02-01T00:00:00.000Z` exclusive, so `2024-01-31` is included.
- `"ownerId"` is the TypeORM column for `AppStorePurchase.owner`. One window row is enough. Do not filter `cancellation_date` or `is_trial_period`.
- `^[0-9]+$` matches plan 30. A decimal string is not a window row. Compare with `numeric`, not `bigint`, so a long digit string does not abort the query.
- The column is `timestamp without time zone` and stores UTC. `to_char` and `AT TIME ZONE 'UTC'` keep that clock. Do not return the column as a driver `Date`.

Query row type, no assertion:

```ts
type PaidExpiryQueryRow = {
  id_text: string;
  email: string | null;
  membership_expires_at: string | null;
  found: boolean;
  beyond_five_years: boolean;
  app_store_window: boolean;
};
```

## Pure build

`rebuildLegacyMembershipExpiryFileLib.ts` has no `pg` and no `fs`. Reuse `normalizeLegacyMembershipEmail` and `parseLegacyMembershipExpiresAt` from `importLegacyMembershipExpiryLib.ts`. Do not copy them.

```ts
export function addUtcYears(date: Date, years: number): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear() + years,
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ));
}
```

That is the same UTC add plan 30 uses. `2024-02-29` plus 5 years rolls to `2029-03-01` because `Date.UTC` does. Every capped row in one call shares one end: `addUtcYears(now, 5).toISOString()`. The importer accepts fractional seconds. That string is the grant `ends_at`, and plan 30 expects `starts_at` plus five UTC years. Using the same `now` for `starts_at` makes those equal.

```ts
export type RebuildLegacyMembershipExpiryFileResult = {
  rowsWritten: number;
  capped: number;
  futureUncapped: number;
  past: number;
  noGrant: number;
  skippedInvalidEmail: number;
  invalidExpiry: number;
  missingIds: string[];
  ambiguousIds: string[];
  invalidEmailIds: string[];
  invalidExpiryIds: string[];
  futureIds: string[];
  pastIds: string[];
  cappedIds: string[];
};
```

`buildPaidExpiryCsv` takes the requested ids, the query rows, and `now`, and returns that result plus `csv: string`.

Each requested id lands in exactly one of `missingIds`, `noGrant` (count only), `invalidEmailIds`, `invalidExpiryIds`, `ambiguousIds`, `futureIds`, or `pastIds`. `cappedIds` is a subset of `futureIds`. `rowsWritten` is `futureIds.length + pastIds.length`.

Order:

1. No query row, or `found` is false: `missingIds`. Not a failure of a real user with a null expiry.
2. `membership_expires_at` null or blank: `noGrant`. A null or blank email with a null expiry is still `noGrant`. Most accounts are this. Do not list their ids.
3. `normalizeLegacyMembershipEmail` returns null: `invalidEmailIds`.
4. `parseLegacyMembershipExpiresAt` returns `'invalid'` or `null`: `invalidExpiryIds`. Do not cap that row.
5. Two or more remaining ids share one normalized email and each has an expiry: `ambiguousIds` for every one of them. Write none. Do not keep the later expiry. That would attach the left-out twin's date to the kept account. A null-expiry twin already left at step 2 and does not make the other id ambiguous.
6. Otherwise write one CSV row. Email is the normalized value. Quote a field that contains `"`, a comma, or a newline, and double embedded quotes. Same rule as `formatLegacyMembershipImportReport`.

Write rules for step 6:

- Parsed time `<= now`: write the `to_char` value, count `past`. Ignore `beyond_five_years` and `app_store_window`. Never replace a past date with a future cap.
- `beyond_five_years` and `app_store_window`: write `addUtcYears(now, 5).toISOString()`, count `capped`. This is only the 2023-12-27 through 2024-01-31 App Store window. A year-9000 expiry with no window row stays as stored. Unpaid long expiries stay as stored.
- Otherwise: write the `to_char` value, count `futureUncapped`. An expiry equal to the five-year instant is not beyond it, so it stays stored.

Sort written rows by email, then append. First line is `email,membership_expires_at`. A header-only file is `email,membership_expires_at\n`.

An invalid `now` throws `Membership expiry rebuild needs a valid time.` before a write.

## Log

`getLogger().info` with counts only: `rowsWritten`, `capped`, `futureUncapped`, `past`, `noGrant`, `skippedInvalidEmail`, `invalidExpiry`, and the lengths of `missingIds` and `ambiguousIds`. Do not log ids, emails, the CSV, the path's being optional, or `V4_DATABASE_URL`. The return value holds the id arrays. Area H writes those into the gitignored error log.

## Area H, after this plan

Call `rebuildLegacyMembershipExpiryFile`, then `billingImportLegacyMembershipExpiry({ file: outputPath }, { now })`, with one `now` for both, on every retry in that run. Delete the CSV in a `finally`. Do not pass `--report`. Do not pass `--dry-run` on the apply.

Pass v4 ids whose identity phase is done. Do not pass a left-out email-case twin.

Phase name for the log is `membership`. Group is `membership`. Classes, all of which match plan 50's class pattern:

- `missingIds` → `missing_v4_account`
- `ambiguousIds` → `ambiguous_email`
- `invalidEmailIds` → `invalid_email`
- `invalidExpiryIds` → `invalid_expiry`

Those ids are failed before the import. They are not in the file.

`noGrant` and `pastIds` are a successful membership phase: nothing to grant, or the import skips a past row (`skippedExpired`). `futureIds` should gain one active `legacy_import` grant. `created + updated + unchanged` equals `futureIds.length` when every future email matched. `skippedExpired` equals `pastIds.length`.

When `unmatched`, `ambiguous`, or `invalid` in the returned counts is not zero, do not treat every `futureIds` entry as that class. Those counts are emails the command could not map, and this plan does not return emails. Leave the id lookup to the verify phase (`membership_mismatch` in plan 30) unless the count equals `futureIds.length`, in which case every future id failed the same way.

`cappedIds` is informational. The verify reads the grant, not this array.

Plan 30 compares an uncapped `ends_at` to `users."membershipExpiration"` within one second, and a capped `ends_at` to `starts_at` plus five UTC years within one second. This file's `to_char` is second resolution, so the uncapped grant is within that second only when the loader reads `timestamp without time zone` as UTC. A driver `Date` in a non-UTC session shifts it. Plan 30's loader has to parse that column as UTC text.

## Tests

Cover `buildPaidExpiryCsv` and `addUtcYears`. Freeze `now` at `2026-11-12T05:08:14.500Z`. The shared cap string is that instant plus five UTC years, `toISOString()`.

- Future expiry, `app_store_window` false, `to_char` year 9000: stored value, not capped.
- Future expiry, window true, `beyond_five_years` true: the cap `toISOString()`, one shared string for two such rows.
- Future expiry, window true, `beyond_five_years` false (the five-year instant itself, and a date inside five years): stored value.
- Past `to_char`, window true, `beyond_five_years` true: still the stored value. The flag must not invent a future grant.
- Null `membership_expires_at` on a found row: `noGrant`, absent from the CSV.
- Requested id with `found` false: `missingIds`.
- `not-an-email` with an expiry: `invalidEmailIds`, absent from the CSV.
- Two ids, emails `User@Example.com` and `user@example.com`, both with expiries: both `ambiguousIds`, neither written.
- One of those emails with a null expiry and the other with an expiry: only the expiry row is written.
- Empty request: header only, every count 0, no id arrays.
- Email `a,b@example.com` is quoted in the CSV.
- `addUtcYears` of `2024-02-29T00:00:00.000Z` by 5 is `2029-03-01T00:00:00.000Z`.
- `PAID_EXPIRY_SOURCE_SQL` contains `"membershipExpiration"`, `"appStorePurchase"`, `"ownerId"`, `purchase_date_ms`, `1703635200000`, `1706745600000`, and `AT TIME ZONE 'UTC'`. It does not contain `INSERT`, `UPDATE`, or `DELETE`.

Do not assert a live capped count. The snapshot's 297 is an example from an older copy.
