**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 03 — Require the Add by RSS key only for commands that use it

## Rows

R4

## Runs after

none

## Problem

`apps/workers/src/lib/startup/validation.ts` calls
`validateRequired('ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY', 'Add-by-RSS')` inside the ORM category
validator, so every ORM command fails at startup without it. On alpha,
`worker-account-content-log-purge`, `worker-account-session-purge`, and
`worker-notifications-purge` have failed every night with
`ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY (required): Missing or empty`. This breaks the **workers**
skill rule: each command validates only the env vars it uses.

## Decisions

1. Do **not** fix this by mounting `podverse-workers-add-by-rss-opaque` on the purge CronJobs.
   Jobs that never touch credentials should not hold the key.
2. Add an `AddByRSS` category in `categoriesForCommand.ts` with its own validator
   (`ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` required, `_OLD` optional). Remove the line from the
   ORM validator.
3. Assign the category to exactly the commands whose code path seals or opens Add by RSS
   credentials. Find them by tracing `getAddByRSSConfig`, `sealAddByRssCredentialsForParse`, and
   the envelope-open helper from each command in `apps/workers/src/commands/index.ts`. Expect at
   least `mqAddByRSSRunParser` and the RSS parser commands that re-seal artist credentials; list
   the result in `ENV.md`.
4. `apps/workers/src/index.ts` passes `addByRssCredentialsEncryptionKey` into the ORM config with
   `?? undefined`. Keep that, so commands without the category get `undefined` and the ORM does not
   require it. Confirm the ORM only uses the key when sealing or opening.
5. Follow **add-by-rss-client-held-credentials**: no logging of key values, no new storage.

## Files

- `apps/workers/src/lib/startup/validation.ts`
- `apps/workers/src/lib/startup/categoriesForCommand.ts`
- `apps/workers/src/index.ts` (only if context building keys off categories)
- `apps/workers/ENV.md`

## Tests

- Unit test (beside existing startup validation tests, or new) that a purge command validates
  without the key, and an Add by RSS parser command fails validation without it.

## Release scratchpad

Surfaces: workers. Worker commands that do not handle Add by RSS credentials no longer require
`ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY`. This fixes the nightly account content log purge, account
session purge, and notifications purge CronJobs, which failed at startup.
