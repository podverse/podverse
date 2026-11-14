# 06 — Per-account queue size tier so large v4 histories are kept

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R6

## Runs after

05 (shares `copyAccountLibraryApply.ts`, `verifyAccount.ts`). Plan 04 owns migration `0014`;
this plan's migration is `0015`.

## Why

`enforce_queue_resource_limit` (`0001_app_schema.sql`) caps each queue (one per account and
medium) at 10000 rows and evicts the oldest history row on every insert past that. v4 has no cap.
25 v4 accounts have more than 10000 history rows, about 174,000 rows over the cap in total, and
the largest has 54,176 (00-FINDINGS F5; its profile there is a bulk "mark as played", not abuse).
The pilot evicted 40,078 rows from that account and verify failed it. We grandfather these
accounts in.

The same trigger counts the whole queue on every insert. The pilot's library copy of that account
took 1,370 seconds while the queue sat at 10000. At 54,000 the count per insert grows with the
queue, so the copy must not pay it per row.

## Decision

- `account_membership_status.max_queue_resources integer`, null = the default 10000.
  Listed tiers: 20000, 30000, 40000, 50000, 60000, 100000. No unlimited value.
- The trigger caps at the account's tier.
- The v4 copy writes the smallest tier that covers the account's largest per-medium queue after
  its own one-row-per-item collapse. Past 100000 is `needs_operator`: the copy writes nothing for
  the tier, keeps 100000 rows by the trigger rule, and reports it. No v4 account is past 100000
  today.
- The copy trims to the tier itself and inserts with the per-row count turned off for that
  transaction.

## Files

- `infra/k8s/base/ops/source/database/linear-migrations/app/0015_account_max_queue_resources.sql` (new)
- `infra/k8s/base/db/source/bootstrap/0004_app_linear_baseline.sql.gz` (generated)
- `infra/k8s/base/db/source/bootstrap/0005_management_linear_baseline.sql.gz` (generated)
- `infra/k8s/base/api/source/api.env`, `infra/k8s/base/ops/kustomization.yaml` (readiness marker)
- `packages/helpers/src/lib/queue/queueResourceLimitTier.ts` (new) and its test
- `packages/helpers/src/index.ts` (export)
- `packages/orm/src/entities/account/accountMembershipStatus.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts` (counts, log line)
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.ts` and its test
- `docs/proposals/v4-to-v5-migration/` (the library-copy doc that describes the queue cap; find it with `rg -n "10000|10,000" docs/proposals/v4-to-v5-migration`)
- `release-notes/scratchpad.md`

## 1. Migration

Follow `0012_account_max_follows.sql`:

```sql
-- max_queue_resources is the account's per-queue row tier (upcoming, now playing, and history).
-- Null uses the default of 10000. A listed tier is the cap. There is no unlimited value.

ALTER TABLE public.account_membership_status
  ADD COLUMN max_queue_resources integer;

ALTER TABLE public.account_membership_status
  ADD CONSTRAINT account_membership_status_max_queue_resources_check
  CHECK (
    max_queue_resources IS NULL
    OR max_queue_resources IN (20000, 30000, 40000, 50000, 60000, 100000)
  );
```

Then `CREATE OR REPLACE FUNCTION public.enforce_queue_resource_limit()` with the same eviction
order as today, and:

- return `NEW` at once when `current_setting('podverse.queue_limit_bulk', true) = 'on'`;
- read the cap as `COALESCE(ams.max_queue_resources, 10000)` from `queue q LEFT JOIN
  account_membership_status ams ON ams.account_id = q.account_id WHERE q.id = NEW.queue_id`.

No backfill: v5 has no queue past 10000 today. Set the readiness marker to `0015_…` in both
files, run `make db_regen_linear_baseline`, then `make db_verify_linear_baseline`.

## 2. Helpers

`queueResourceLimitTier.ts`, shaped like `follow/followLimitTier.ts`:

- `QUEUE_RESOURCE_DEFAULT_LIMIT = 10000`, `QUEUE_RESOURCE_LIMIT_TIERS = [20000, 30000, 40000, 50000, 60000, 100000] as const`
- `queueResourceLimitFor(stored: number | null | undefined): number`
- `queueResourceMigrationTier(largestQueue: number)` →
  `{ outcome: 'default' } | { outcome: 'tier'; tier } | { outcome: 'needs_operator' }`

Unit-test the edges (10000, 10001, 60000, 60001, 100000, 100001).

## 3. ORM entity

Add `max_queue_resources: number | null` to `AccountMembershipStatus`, mirroring `max_follows`.

## 4. Copy

In `writePlayback`, after `byMedium` is built (rows already collapsed to one per item):

1. `largest = max(byMedium sizes)`; `decision = queueResourceMigrationTier(largest)`.
2. For `tier`, upsert `account_membership_status.max_queue_resources = tier` for the account
   (keep a higher stored value), inside the same transaction, before the inserts.
3. Trim each medium's list to `queueResourceLimitFor(stored or tier)` using the trigger's rule:
   keep upcoming and now playing, drop the oldest history by played time first.
4. `SET LOCAL podverse.queue_limit_bulk = 'on'` for the inserts, then
   `SET LOCAL podverse.queue_limit_bulk = 'off'` after them.
5. Add counts `queueTier` (the tier written or null), `queueNeedsOperator` (0/1), and
   `historyTrimmed` to the copy result and its log line.

Bulk mode is only for this copy, which has already trimmed. Replay inserts a few rows and keeps
the per-row trigger.

## 5. Verify

In `verifyAccount.ts`, playback coverage is unchanged. When `queueNeedsOperator` would be set
(largest per-medium v4 queue after collapse is past 100000), report `needs_operator` instead of
`unaccounted`, following how Add by RSS uses `needsOperator`. Test: a 54,000-row history with
tier 60000 written passes; 120,000 reports `needs_operator`.

## 6. Check the readers

Confirm, and note the result in the final message, that nothing loads a whole queue without
paging:

- `rg -n "queue_resource|QueueResource" apps/api/src packages/orm/src/services/queue` — every
  list path goes through `queueResourceListGuardrails.ts` paging.
- `rg -n "history" apps/mobile/src/data apps/mobile/src/sync` (or the mobile sync folder; see
  **mobile-data-layer**) — mobile history sync pages or caps what it stores.

If a reader loads the whole queue, stop and report it under "Blocker"; do not change it here.

## Not in scope

Management web and management API editing of this tier. Add later if operators need it.

## Tests

- helpers: `queueResourceLimitTier.test.ts`.
- workers: `verifyAccount.test.ts` cases in § 5; a pure trim helper test if § 4.3 is extracted
  into `copyAccountLibraryLib.ts` (preferred).

## Release scratchpad

```markdown
## Large v4 listening histories are kept

- Surfaces: database, workers (v4 migration)
- Change: migration `0015` adds a per-account queue size tier (20k to 100k rows; default stays 10k). The v4 copy gives accounts with larger histories the smallest tier that fits instead of evicting history, and inserts their rows without a per-row count.
- Who notices: about 25 v4 accounts with more than 10,000 history rows
- Operator steps: apply linear migrations
```
