# 02 — SQL migration and ORM

**Detail:** [743](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md)
**Model:** Opus 5 · **Reasoning:** high
**Workspaces:** `infra/k8s/base/ops/source/database`, `packages/orm`

This prompt changes how history is ordered for **every existing account**. The backfill is the
entire safety story. Treat it as the deliverable, not as cleanup.

## Current state

`queue_resource` has **no timestamp columns at all**. All three zones are `list_position`
(`NUMERIC(22,21)`):

| Zone        | `list_position`       | Order                    |
| ----------- | --------------------- | ------------------------ |
| History     | `< 0`                 | DESC — most recent first |
| Now playing | `'0'` on write; read within `±1e-21` | Single row per queue |
| Upcoming    | `> 0`                 | ASC — play order         |

History positions start at `-1` and increment by `0.00000001` toward zero, so the **highest**
(least negative) position is the most recent listen. Constraints to respect:
`UNIQUE (queue_id, list_position)`, plus per-resource `UNIQUE (queue_id, item_id)` and the clip,
soundbite, and add-by-RSS equivalents. A trigger caps each queue at 10,000 rows.

**Read the history predicate carefully — it is not the same as the write predicate.** History
*paging* uses `list_position <= 0` (lines 333, 340, 342), which **includes the now-playing row**,
while the insert-position lookup uses `< 0` (lines 394, 662, 702). That asymmetry is deliberate:
the history list a user sees is headed by what they are playing now.

It also creates an invariant this migration must not break. See below.

## New migration

Create `infra/k8s/base/ops/source/database/linear-migrations/app/0010_playback_listen_timestamps.sql`.
`0009_list_sort_indexes.sql` is the current highest; follow its header and style.

### Columns

```sql
ALTER TABLE public.queue_resource
    ADD COLUMN last_played_at timestamptz,
    ADD COLUMN last_played_received_at timestamptz;
```

Both nullable. `last_played_at` is the clamped client time and is the ordering and merge key.
`last_played_received_at` is server receipt — audit, and the clamp source.

### Backfill

Preserve current ordering **exactly**. Derive synthetic timestamps from `list_position` so that
ordering by `last_played_at DESC` produces the identical sequence that `list_position DESC`
produces today.

| Rows                           | Backfill                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------- |
| History (`list_position < 0`)  | Synthetic times spaced backward from migration time, ordered by `list_position` |
| Now playing (`~0`)             | Migration time — it was most recently active                                    |
| Upcoming (`list_position > 0`) | Leave `NULL` — never played                                                     |

Use a window function over `list_position DESC` per queue and subtract a fixed interval per row.
Leaving upcoming rows `NULL` is correct and load-bearing: a later real event on such an item beats
`NULL`, which is what we want.

Set `last_played_received_at` to the same value wherever `last_played_at` is set, so no row has a
client time without a receipt.

### The invariant the backfill must establish

> **The now-playing row holds the maximum `last_played_at` of all non-upcoming rows in its queue.**

Today this is free: history paging spans `<= 0` and now-playing sits at exactly `0`, the largest
value in that range, so it always sorts first. Once ordering moves to `last_played_at`, "the thing
I am playing appears at the top of my history" stops being structural and becomes a consequence of
the merge rule always giving the now-playing row the newest timestamp.

That consequence is real — promoting an item to now playing *is* a meaningful event — but the
backfill has to establish it rather than inherit it. Give the now-playing row migration time and
every history row a time strictly before it. If a history row ties or exceeds it, the first history
page render after deploy shows the currently-playing episode somewhere in the middle of the list.

State this invariant in a comment on the history-ordering query and assert it in a test.

### Index

```sql
CREATE INDEX idx_queue_resource_queue_id_last_played_at
    ON public.queue_resource (queue_id, last_played_at DESC);
```

History paging reads this. Check `0009_list_sort_indexes.sql` for the naming convention already in
use and match it.

### Replace the row-limit trigger

**This is a correctness fix, not housekeeping.** `enforce_queue_resource_limit()` currently caps a
queue at 10,000 rows like this:

```sql
SELECT id INTO min_id
FROM queue_resource
WHERE queue_id = NEW.queue_id
ORDER BY list_position ASC
LIMIT 1;
```

Today the lowest `list_position` is also the oldest listen, so the two coincide. After this
migration they diverge: a replayed offline listen carries an **old** timestamp but is assigned a
**fresh** `list_position` near the top of the history stack. The trigger would then evict by write
order while the user reads time order, and could delete a recent listen.

Rewrite the selection to take the oldest listen **within the history zone**:

```sql
SELECT id INTO min_id
FROM queue_resource
WHERE queue_id = NEW.queue_id
  AND list_position < 0
ORDER BY last_played_at ASC NULLS FIRST, list_position ASC
LIMIT 1;
```

The `list_position < 0` predicate is load-bearing. Upcoming rows carry a `NULL` timestamp, so
without it `NULLS FIRST` would evict the user's **queue** before any history. Keep a fallback to
the original behavior when no history row exists, so the trigger can always free a slot.

`< 0` is the correct history boundary, and it is the same one the service uses
(`listPositionLessThan(0)` at `queueResource.ts` lines 394, 662, 702). Verified zone layout:

| Zone        | `list_position`                                                    |
| ----------- | ------------------------------------------------------------------ |
| History     | Starts at `-1`, each newer row `+0.00000001` toward `0`            |
| Now playing | Exactly `'0'` on write; read through an `epsilon` (`1e-21`) band   |
| Upcoming    | `> 0`                                                              |

The column is `numeric`, so there is no float drift in the database — the epsilon exists only for
the JS `parseFloat` round-trip. History occupies roughly `[-1, -0.9999]` at the 10,000-row cap, so
it cannot reach the now-playing band and `< 0` cannot catch a now-playing row.

Ship this in the same `0010_` file as the columns — a queue that hits the cap between the column
migration and a trigger fix would evict wrong rows in the gap.

### Regenerate baselines

After the SQL lands, the generated init snapshots must be regenerated — this is an **operator**
step, not an agent step. Note it in the response:

```bash
make db_regen_linear_baseline
make db_verify_linear_baseline
```

Do not hand-edit `0004_app_linear_baseline.sql.gz` or `0005_management_linear_baseline.sql.gz`. See
[LINEAR-MIGRATIONS.md](/docs/operations/database/LINEAR-MIGRATIONS.md) and
[`linear-baseline-0004`](/.cursor/rules/linear-baseline-0004.mdc).

## ORM entity

`packages/orm/src/entities/queue/queueResource.ts` — add both columns as
`@Column({ type: 'timestamptz', nullable: true })`, mirroring how `last_seen_at` is declared on
`packages/orm/src/entities/account/accountFollowingChannel.ts`.

## ORM service

`packages/orm/src/services/queue/queueResource.ts`.

### History ordering

`getHistoryResourcesByQueueIdText` currently orders by `list_position DESC` (and
`queueResourceListGuardrails.ts` merges options around it). Change the order key to
`last_played_at DESC`, with `list_position DESC` as a **tiebreaker** so rows sharing a timestamp
stay deterministic and paging cannot skip or repeat.

Keep `list_position <= 0` as the zone predicate. The zone is still positional; only the *ordering*
moves to time.

### Accepting the client timestamp

The now-playing and history write paths (`addResourceToHistory`-style transactional helpers around
lines 610–680) take a params object today. Extend it with the clamped timestamp and event kind:

- Clamp with `clampClientPlaybackTimestamp` from `@podverse/helpers` against `now()` as receipt.
  Clamping belongs at the boundary and must not be duplicated per call site.
- Write `last_played_at` (clamped) and `last_played_received_at` (receipt) on every write.
- Apply `mergePlaybackState` semantics rather than blind assignment: **position forward-only**,
  **`completed` sticky**, and **reject a write whose clamped timestamp is older than the row's
  current `last_played_at`** — that is a late-arriving replay and must be a no-op, not a rewind.

That last rule is what makes replay idempotent without a dedupe key. Add a comment stating the
invariant, not the history of how it was decided
([`comments-future-forward`](/.cursor/rules/comments-future-forward.mdc)).

### Zone moves

`resolveZoneForEvent` from `@podverse/helpers` decides the destination. The existing
move-to-history logic (new position = most recent history position + increment, starting at `-1`)
stays as-is — `list_position` still assigns slots, it just no longer defines order. The now-playing
promotion path that clears `is_active_queue` on other queues is unchanged.

**A zone move is not a removal.** The transactional helper that moves a row from upcoming into now
playing or history must not delete and reinsert; it updates `list_position` on the existing row.
This is what prompt 05's tombstone logic relies on.

## Batch replay

Add a service method that applies an array of playback events in one transaction, ordered by
clamped timestamp ascending, so a reconnect replay is a single round trip. Cap the batch with
`PLAYBACK_REPLAY_BATCH_LIMIT` from `@podverse/helpers`. Follow the batching shape in
`packages/orm/src/services/account/accountFollowingChannel.ts`, which already does chunked
later-wins upserts with `GREATEST`.

### Serialize per queue

History positions are assigned as `most_recent_history_position + QUEUE_LIST_POSITION_INCREMENT`
under `UNIQUE (queue_id, list_position)`. Writing one event at a time rarely collides. A batch
replay landing while another device is writing to the same queue makes it plausible, and the
failure is a lost replay batch rather than anything visible.

Take `pg_advisory_xact_lock` keyed on the queue id at the start of the replay transaction. Prefer
that over a retry-on-conflict loop: the loop has to re-read the max position on every attempt and
can still livelock under sustained concurrent writes, while the advisory lock releases with the
transaction and needs no retry logic at all.

**The existing in-process `Mutex` is not a substitute.** `getQueueLock(queue_id_text)`
(`queueResource.ts` line 199) serializes callers within **one Node process**, which is why
single-event writes rarely collide today. It does nothing across API pods. The advisory lock
complements it; keep the `Mutex` for consistency with the surrounding methods and add the database
lock for the cross-process case that replay makes likely.

## Tests

`packages/orm` unit tests where the service is already covered. Priority cases:

1. History returns in `last_played_at DESC` order, with `list_position DESC` breaking ties.
2. A write with a timestamp older than the row's current value is a no-op.
3. Position moves forward only; a stale lower position does not rewind.
4. `completed` stays true when a later write says false.
5. A zone move preserves the row identity (same `id`), not delete-plus-insert.
6. Batch replay applies events in timestamp order regardless of array order.
7. At the row cap, the trigger evicts the oldest **listen**, not the oldest write.

### The backfill test must build its own fixture

**The E2E seed cannot prove this.** `tools/web/seed-e2e.mjs` inserts `queue_resource` rows only at
`list_position` 1, 2, 3, and 4 — all **upcoming**. It seeds no history row and no now-playing row,
so a backfill test run against it would compare two empty lists and pass without exercising a
single line of the migration.

Build the fixture inside the test instead:

1. Insert a queue with a realistic history spread — at least a dozen rows starting at `-1` and
   stepping `+0.00000001`, one now-playing row at `'0'`, and a few upcoming rows at `> 0`.
2. Record the ordered list of resource ids under the **old** ordering (`list_position DESC` over
   `<= 0`).
3. Run the migration.
4. Assert the ordered list under `last_played_at DESC` is **identical**, including the now-playing
   row still appearing first.

A dozen rows matters: with one or two, an off-by-one in the window function still produces the
right order by luck.

Also cover the boundaries the seed happens to make likely — a queue whose only rows are
**upcoming** (all `NULL` after backfill, nothing to order) and a queue with history but no
now-playing row.
8. At the row cap, the trigger never evicts an upcoming row while history rows remain.

## Acceptance

- `0010_playback_listen_timestamps.sql` exists and follows the `0009` header style.
- History ordering is **identical** before and after the migration, proven against a fixture the
  test builds itself — not against the E2E seed, which has no history rows.
- The now-playing row holds the maximum `last_played_at` among non-upcoming rows.
- Upcoming rows keep `NULL` timestamps; now-playing and history rows do not.
- No row has `last_played_at` without `last_played_received_at`.
- The row-limit trigger is updated in the same migration file as the columns.
- Batch replay holds a per-queue advisory lock.
- Clamping happens once, at the service boundary.
- The operator regeneration commands are stated in the response.
