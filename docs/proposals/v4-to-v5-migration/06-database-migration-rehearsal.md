# 06 — Database Migration Rehearsal

## Goal

Near-term work: practice against the prod-copy v4 database, measure sizes and
timings, and prove mapping and account import ideas **before** beta or store
cutover. No production writes.

## Status

Draft. Needs operator review. This is the first implementation-facing track.

## What we know

- A production database copy already exists on a test server. Reference it only
  as **`V4_DATABASE_URL`** from operator home config. Never commit the URL,
  credentials, dumps, or query results that contain PII.
- Real v4 user table is `users` with `email`, `password`,
  `membershipExpiration`, `freeTrialExpiration`, array subscription fields, and
  related queue/history tables. See `podverse-api@develop`
  `src/entities/user.ts`.
- [BILLING-OPERATIONS.md](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover)
  currently shows export SQL against `account_credentials` and
  `account_membership_status`. Those names match **split-era / v5** schemas, not
  classic v4. Rehearsal must use corrected SQL against `users`.

## Proposed approach

### Access rules

- Read-only role on the copy whenever possible.
- All reports: counts, timings, sample **ids only** (no emails, no tokens).
- Artifacts and CSVs stay outside the git tree.

### Rehearsal phases

1. **Inventory counts** — row counts for every table in
   [04](04-v4-data-inventory-and-scope.md); null rates for `podcastIndexId`,
   email, membership expiry.
2. **Crosswalk dry run** — resolve podcasts → PI id / URL; report mapped vs
   unresolved percentages (no v5 writes required for the first pass).
3. **Account import dry run** — create accounts in an isolated v5 DB from a
   subset; verify bcrypt login; measure per-thousand-user time.
4. **Graph import dry run** — subscriptions, playlists, clips, queue/history for
   the subset; measure failures.
5. **Membership export dry run** — corrected CSV from `users`; feed the existing
   `billingImportLegacyMembershipExpiry` dry-run against the isolated v5 DB
   **after** accounts exist.
6. **Scale-up** — larger batches until timing supports lazy-login SLOs and
   end-of-grace batch windows ([07](07-account-and-data-migration-model.md)).

### Tooling shape (later plan sets)

Prefer `apps/workers` commands: idempotent, `--dry-run`, count-only reports,
explicit `--limit` / id ranges. Do not put one-off SQL in chat history as the
source of truth; check commands into the monorepo when ready.

## Honest limits and risks

- The copy may be stale relative to live prod. Treat timings as lower bounds
  with headroom.
- Accidental writes to the copy are still bad (destroys a clean rehearsal
  baseline). Prefer a role that cannot write.
- Large history tables may dominate runtime; plan pagination early.
- Fixing the billing export SQL is required before trusting membership dry
  runs.

## Open questions

- Where is `V4_DATABASE_URL` documented for operators today?
- How often is the copy refreshed from prod?
- Target max seconds for a single-user lazy migration under load?
- Who may run rehearsal commands (operator only vs shared jump host)?

## Future plan sets

- Worker command stubs + corrected membership export snippet in billing docs.
- Runbook for refresh of the prod copy (outside this repo).
- Acceptance thresholds before starting beta migrator builds.
