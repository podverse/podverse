# 05 — Mobile playback outbox

**Detail:** [743](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md)
**Model:** Opus 5 · **Reasoning:** high
**Workspace:** `apps/mobile`

May run in parallel with prompt 04. Storage and repository only — no `PlaybackProvider` wiring,
which is prompt 06.

## This is new infrastructure

There is no outbox in the app to extend. `subscribed_channel` and `channel_seen` are local-first
domain tables reconciled on the next sync run; the `writeBehind` helper in
`apps/mobile/src/data/sync/` is unused by every repository. Build this as a first-class table with
its own repository, following the conventions in `apps/mobile/src/data/README.md`.

## Schema

Mobile migrations are append-only integer versions in `apps/mobile/src/data/db/migrations.ts`,
applied by `runMigrations.ts` against `PRAGMA user_version`. The current highest is **15**, so this
is **version 16**. The Drizzle mirror in `apps/mobile/src/data/db/schema.ts` must be updated by
hand in the same change.

### `playback_outbox`

| Column                 | Type    | Notes                                                        |
| ---------------------- | ------- | ------------------------------------------------------------ |
| `id`                   | INTEGER | PK autoincrement — insertion order, the replay order fallback |
| `event_id`             | TEXT    | Client-generated, unique. Only stats actually need it, but a uniform row shape is cheaper than two tables |
| `account_id_text`      | TEXT    | Which account produced it. Drop rows on sign-out (decision 12) |
| `queue_id_text`        | TEXT    |                                                               |
| `resource_kind`        | TEXT    | `item` / `clip` / `soundbite` / `add_by_rss`                 |
| `resource_id_text`     | TEXT    | Or the add-by-RSS hash id                                     |
| `event_kind`           | TEXT    | A `PlaybackEventKind` from `@podverse/helpers`                |
| `occurred_at`          | INTEGER | **Client epoch ms, captured when the event happened**         |
| `playback_position`    | REAL    | Nullable — queue edits have none                              |
| `media_file_duration`  | REAL    | Nullable                                                      |
| `completed`            | INTEGER | 0/1                                                           |
| `payload_json`         | TEXT    | Nullable — add-by-RSS resource data, reorder targets          |

Index on `(account_id_text, id)` for ordered drains.

`occurred_at` is the whole point of the table. Capture it at the event, never at flush time.

### `playback_local_state`

Signed-in position cache so the UI resumes correctly offline, separate from the pending-mutation
log. Keyed by `(queue_id_text, resource_kind, resource_id_text)`, holding position, duration,
`completed`, zone, and `last_meaningful_at`.

This is what the 5-second local write from prompt 06 updates, and what screens read while offline.
Do not overload the outbox for it — a drained outbox must be able to empty without the UI forgetting
where the user was.

### Leave `queue_cache` alone

`DTOQueueResource` gains two fields in prompt 01, and installed phones hold serialized copies in
`queue_cache`
([`dto-changes-are-device-data-migrations`](/.cursor/rules/dto-changes-are-device-data-migrations.mdc)).
Check that rule, then do **not** clear the table.

Both new fields are **optional**, and cache reads go through `safeJsonParse` in
`apps/mobile/src/data/db/serialization.ts`, which is permissive and performs no schema validation.
Previously-cached JSON stays structurally valid and simply reads the new fields as `undefined`
until the 5-minute TTL refreshes it.

Clearing it would be a real regression for the one scenario this app exists to serve: a user who
upgrades while offline would lose their cached history and queue views with no way to refetch. The
DTO-migration rule is about data the app cannot reconstruct — a TTL'd read-through cache is not
that.

### Store the measured clock offset

Keep the device-versus-server clock offset in `kv_meta`, the same place sync watermarks live.
Update it from the `Date` response header whenever an API call succeeds, using
`computeClockOffsetMs` from prompt 01, and apply it with `applyClockOffset` when building a drain
batch — **not** when enqueuing.

**Do not reuse `writeSyncWatermark` for it.** That helper takes a `timestampMs` and writes it to
*both* `value` and `updatedAt` (`apps/mobile/src/data/sync/syncMetadata.ts` line 30). An offset is
a **signed duration**, not a point in time, so a device running two seconds slow would stamp
`updatedAt` at `-2000` — an epoch in 1969 — and quietly poison anything that later reasons about
staleness. `readSyncWatermark` would round-trip the value correctly, which is what makes this easy
to miss.

Add a small dedicated pair beside the watermark helpers that writes `value` as the signed offset
and `updatedAt` as `Date.now()`. Storing *when* the offset was measured is useful on its own: an
offset from a week ago is weaker evidence than one from a minute ago.

Correcting at drain rather than at enqueue matters: during a long offline stretch there is no fresh
offset to apply, so events are recorded in raw device time and corrected in one place once the
device has talked to the server again. Correcting at enqueue would bake in a stale offset and make
the error unfixable.

## Repository

`apps/mobile/src/data/repositories/playbackOutboxRepository.ts`, matching the shape of
`channelSeenRepository.ts` (module of functions, takes `MobileAuthRequestContext` where it needs
the network, returns `@podverse/helpers` DTO shapes).

### `enqueue(event)`

1. Refuse anything where `isMeaningfulPlaybackEvent(kind, { isPlaying })` is false. The outbox is
   the enforcement point, not just the caller.
2. **Collapse positions.** If the tail row for the same resource is also a position-only kind
   (`progress_tick`, `seek`, `pause`), replace it rather than appending. A two-hour offline listen
   must not produce 480 rows.
3. **Collapse `queue_reorder` per queue.** Decision 9 resolves upcoming order by whole-list
   last-meaningful-edit, so only the final order matters — keeping intermediate drags would burn
   outbox slots to describe states nobody will ever see.
4. Never collapse `complete`, `skip`, `queue_add`, or `queue_remove` — those are discrete facts
   about distinct items.
5. **Enforce the cap** of `PLAYBACK_OUTBOX_MAX_EVENTS` (500) from `@podverse/helpers`, evicting
   oldest first. Prefer evicting position-only rows over discrete events when both are candidates,
   the way `selectSyncEventEvictions` in `syncEventLog.ts` protects failures.
6. Update `playback_local_state` in the same transaction so the UI and the outbox cannot disagree.

### `drain(context)`

- Reads rows for the current account in `id` order, batched to `PLAYBACK_REPLAY_BATCH_LIMIT`.
- Sorts each batch by `occurred_at` ascending before sending — the server applies in timestamp
  order and this makes the request self-consistent.
- Posts to the replay route from prompt 03.
- Deletes sent rows **only** after a successful response. A failure leaves them for the next run;
  re-sending is safe because the merge is idempotent.
- Survives process death: nothing is held in memory between batches.

### `clearForSignOut(accountIdText)`

Deletes outbox rows and local state for that account. Used by prompt 07's sign-out path.

## Zone move vs removal

The distinction that decision 10 turns on:

| User action                          | Event kind      | Emits a tombstone? |
| ------------------------------------ | --------------- | ------------------ |
| Plays a queued item                  | `play`          | **No** — zone move |
| Queued item finishes                 | `complete`      | **No** — zone move |
| Skips past a queued item             | `skip`          | **No** — zone move |
| Swipes to delete from the queue      | `queue_remove`  | **Yes**            |

Because `UNIQUE (queue_id, item_id)` puts an item in exactly one zone, all four look locally like
"no longer in upcoming". Only `queue_remove` may reach the DELETE route. Encode this in
`resolveZoneForEvent` consumption, and add a unit test for each row of that table — this is the
single easiest thing in the plan to get wrong, and the failure mode is silently deleting things the
user played.

## Offline Mode interaction

`drain` must not run while Offline Mode is on. `requestWithMobileAuthRefresh` already throws
`OfflineModeEnabledError` (`apps/mobile/src/auth/authRequestWithRefresh.ts`), which
`syncErrorClassification.ts` treats as offline, so the guard mostly exists. Check the flag before
starting a batch anyway rather than relying on a thrown error per request.

`enqueue` runs **always** — that is the entire feature.

## Tests

`apps/mobile` unit tests, run with `npm --prefix apps/mobile run test`:

1. An unmeaningful event is refused at enqueue.
2. Consecutive `progress_tick` rows for one resource collapse to one; a `complete` between them is
   preserved.
3. The cap holds at 500 and evicts position rows before discrete events.
4. `play` on a queued item produces no tombstone; `queue_remove` does.
5. A failed drain leaves rows intact; a successful one deletes exactly what it sent.
6. Batches are sorted by `occurred_at`, not insertion order.
7. Migration 16 preserves existing `queue_cache` rows, and a cached payload written before the
   upgrade still parses.
8. Successive `queue_reorder` events for one queue collapse to the last.
9. A drain applies the stored clock offset; enqueue does not.

## Acceptance

- Migration 16 exists, `schema.ts` mirrors it, and no shipped migration was edited.
- `queue_cache` is **not** cleared.
- The outbox is bounded, collapsing, and durable across restart.
- `occurred_at` is captured at the event, never at flush.
- The clock offset is applied at drain, never at enqueue.
- Zone moves never emit tombstones.
- Nothing in `PlaybackProvider` is touched — that is prompt 06.
