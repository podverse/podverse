# Execution order — v4 migration resilience

Spec: [05 § Migration resilience](/docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md#migration-resilience).

The library copy runs once per account and then sets `v4_library_copied_at`.
Anything it cannot finish in that pass is lost today. A migration feed that
fails to parse is tried again only when Podcast Index reports an update.
`legacy_id_map` exists (`0005_v4_rehearsal_schema.sql`) but nothing writes it.

This set adds three changes:

| # | File | Change |
| - | ---- | ------ |
| 01 | [01-migration-feed-retry.md](./01-migration-feed-retry.md) | Slow, migration-only retry of a failed seeded feed through `scheduled_job` |
| 02 | [02-copy-records-unresolved.md](./02-copy-records-unresolved.md) | The copy writes `legacy_id_map` rows, and holds playback rows on an unsettled feed instead of dropping them |
| 03 | [03-legacy-replay-pass.md](./03-legacy-replay-pass.md) | A replay command that resolves `unresolved` rows once the missing piece appears |

## Order

- 01 and 02 edit different files and may run at the same time.
- 03 runs after both. It reads the settled rule from 01 and the rows from 02.

## Rules for the executing agent

1. Local database only. Never write to alpha. Every write command refuses
   unless `DB_HOST` is local, the same check `v4CopyAccountLibrary` uses.
2. Do not print `V4_DATABASE_URL`, emails, raw rows, or feed URLs. Counts only.
3. No `any`. No `as` except `as const`. `===` / `!==` only. `import type` on its
   own line. Named exports. Comments describe the code as it stands.
4. Do not run tests. End with the operator's commands.
5. Do not change parse cadence for feeds the migration did not create.
6. Clips and playlist members are never dropped. History, queue, and now
   playing may drop only after their feed is settled.

## Open decisions (settle before 02 ships)

- The 21 not-seeded subscriptions on the rehearsal account (14 non-public
  podcasts, including the Podcast Index inactive-feed list; 6 missing podcast
  rows; 1 show with no authority URL). 02 records them as `dropped` with
  reason `not_seeded` either way, so a later decision can replay them.
