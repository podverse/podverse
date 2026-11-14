# 01 — v4 timestamps are UTC regardless of the host timezone

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R1

## Runs after

none

## Why

On a Mac in US Central time, the pilot wrote every carried trial grant 6 hours late and every
paid account's `account_membership_status.membership_expires_at` 5–6 hours early (00-FINDINGS F1).
v4 columns are `timestamp without time zone` holding UTC. node-postgres parses that type in the
process timezone, and writes a `Date` into a v5 `timestamp without time zone` column
(`server_time`, `membership_expires_at`) in the process timezone too.

## Files

- `apps/workers/src/commands/orm/v4Identity/seedAccountIdentity.ts`
- `apps/workers/src/commands/orm/v4Identity/seedAccountIdentityLib.ts`
- `apps/workers/src/commands/orm/v4Identity/seedAccountIdentityLib.test.ts`
- `apps/workers/src/commands/billing/rebuildLegacyMembershipExpiryFile.ts`
- `apps/workers/src/commands/billing/rebuildLegacyMembershipExpiryFileLib.test.ts`
- `apps/workers/src/lib/v4/requireUtcProcess.ts` (new)
- `apps/workers/src/lib/v4/requireUtcProcess.test.ts` (new)
- `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsal.ts`
- `apps/workers/package.json`
- `release-notes/scratchpad.md` (only through the final message; see § Release scratchpad)

## 1. Read v4 timestamps as UTC text

In the v4 SQL of `seedAccountIdentity.ts` (the select with `"membershipExpiration" AS
membership_expires_at` and `"freeTrialExpiration" AS free_trial_expires_at`) and in
`rebuildLegacyMembershipExpiryFile.ts`, select each v4 timestamp the same way `verifyAccount.ts`
`V4_USER_SQL` does:

```sql
to_char("membershipExpiration", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS membership_expires_at
```

`readV4Timestamp` keeps accepting `Date | string | null`, so the row type does not change. Add a
test that `readV4Timestamp('2026-11-14T21:28:39.000Z')` returns that instant.

Find every other v4 read in `apps/workers/src/commands/orm/v4*` and `apps/workers/src/commands/billing`
that selects a v4 timestamp column without `to_char` and convert it the same way:
`rg -n '"[a-zA-Z]*(Date|Expiration|At|Time)"' apps/workers/src/commands/orm/v4* apps/workers/src/commands/billing`.
`verifyAccount.ts` already does this; leave it.

## 2. Refuse to run outside UTC

`requireUtcProcess(commandName: string): void` throws
`Error('<commandName> must run with TZ=UTC.')` when `new Date(0).getTimezoneOffset() !== 0` or
`new Date(Date.UTC(2026, 6, 1)).getTimezoneOffset() !== 0` (the second date catches zones that
are UTC only in winter). Test both with a stubbed `Date.prototype.getTimezoneOffset`.

Call it first in `runFullRehearsal.ts`'s command entry, before any database read. The rehearsal
runs identity, membership, and the entitlement recompute in that one process, so this covers
every write in F1.

## 3. Set TZ in the scripts

In `apps/workers/package.json`, prefix each `v4_*` script (`v4_copy_account_library`,
`v4_replay_legacy_rows`, `v4_seed_account_identity`, `v4_import_flagged_feeds`,
`v4_write_legacy_podcast_map`, `v4_seed_account_catalog`, `v4_run_full_rehearsal`) and
`billing_import_legacy_membership_expiry` with `TZ=UTC `, for example `"v4_run_full_rehearsal": "TZ=UTC node ./dist/index.js v4RunFullRehearsal"`.
npm runs scripts through `sh`, so this works from the operator's fish shell.

## Not in scope

API, workers, and management-api processes in production run in UTC already. Making every v5
`timestamp without time zone` write independent of the host timezone is a larger change and is
not part of this set.

## Tests

- `seedAccountIdentityLib.test.ts`: the UTC string case above.
- `rebuildLegacyMembershipExpiryFileLib.test.ts`: an expiry row read as UTC text keeps its instant.
- `requireUtcProcess.test.ts`: passes at offset 0, throws in winter-only UTC and in a non-zero zone.

## Release scratchpad

Phase 1 runs prompts together, so put this entry in the final message under
"Release notes entry" instead of writing the file:

```markdown
## v4 migration commands require UTC

- Surfaces: workers
- Change: v4 migration commands read v4 dates as UTC and refuse to start unless the process runs in UTC. The `v4_*` npm scripts set `TZ=UTC`.
- Who notices: operators running a v4 rehearsal or migration from a laptop; trial and paid end dates no longer shift by the host timezone
- Operator steps: none when using the npm scripts
```
