# 07 — Mobile reconnect merge

**Detail:** [743](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md)
**Model:** Opus 5 · **Reasoning:** extra high
**Workspace:** `apps/mobile`

The hardest prompt in the set. Write the merge as a **pure function with table-driven tests
first**, then wire it. Do not start from the provider.

## The rule

One rule, not three. Because `UNIQUE (queue_id, item_id)` puts an item in exactly one zone:

> For each item, the side with the newer clamped meaningful-event timestamp wins, and its event
> kind decides the destination zone and position.

Everything else falls out of that. The "an offline queue-add loses to a newer history event on the
same item" guard the operator asked for is not separate logic — it is the same row.

## Pure module

`apps/mobile/src/data/repositories/playbackReconcile.ts`, modelled on
`channelSeenSync.ts`'s `reconcileSeenState` — a pure planner returning
`{ adopt, push, resolveConflicts }`, with no I/O.

Inputs: local outbox events, local `playback_local_state`, and the server's queue resources.
Output: what to adopt locally, what to push, and which items need now-playing resolution.

Reuse `mergePlaybackState` and `resolveZoneForEvent` from `@podverse/helpers` (prompt 01). Do not
write a second merge.

### Invariants

| Invariant                | Meaning                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| Newer timestamp wins     | Determines both zone and position                                  |
| Position forward-only    | The greater position survives regardless of which side won         |
| Completion sticky        | A finished episode never becomes unfinished                        |
| Null loses               | A never-played item yields to any real event                       |
| Idempotent               | Running the plan twice produces the same state                     |
| Tombstones are explicit  | Absence from the local upcoming list is **not** a removal signal   |

That last one is the trap. An item missing locally may have been played, may have been removed, or
may simply never have synced. Only a `queue_remove` event means removal.

## The scenario that defines correctness

The operator's case, which must be a test:

1. 06:00 — phone offline, plays Episode A.
2. 07:00 — laptop, online, plays Episode B.
3. 08:00 — phone reopens, hydrates the UI, **does not press play**.
4. Phone leaves Offline Mode and syncs.

Expected: the 06:00 offline listen does **not** overwrite the 07:00 laptop listen. B is now
playing; A is in history with its 06:00 position preserved. The 08:00 app-open contributed nothing,
because hydration is not a meaningful event.

Add the three-way interleave too: offline A at 09:20, laptop C at 09:30, offline B at 09:55 →
history newest-first is **B, C, A**.

## Now-playing conflict

**This prompt resolves the data and changes nothing the user is looking at.** The user-facing
choice is prompt 08.

When local and server name the **same item**, there is no conflict — the ordinary merge adopts the
position from the newer meaningful event and the work is done here.

When they name **different items**:

- Resolve the underlying rows by timestamp. The newer meaningful event wins the now-playing zone;
  the loser **moves to history** carrying its own position and timestamp, never discarded.
- **Do not touch the loaded player.** Return the disagreement from the planner as data. Prompt 08
  decides whether to ask, and only a user choice changes what is loaded.

### Never interrupt active playback

Hard rule, enforced here rather than assumed: **while `isPlaying` is true, reconciliation must not
load a different item into the engine.**

By construction this should never be needed. Active playback emits `progress_tick` continuously, so
the playing device holds the newest meaningful-event timestamp and wins its own merge. But that
guarantee depends on the 15-second throttle, the outbox drain order, and the clock offset all being
correct, and the failure mode — audio cutting out mid-sentence and a different episode starting —
is bad enough to warrant a guard that does not depend on any of them.

Return the conflict as data; never act on it mid-playback.

## Wiring

The `playback-replay` sync job from prompt 06 becomes drain-then-reconcile:

1. Drain the outbox to the replay route, applying the stored clock offset to each event.
2. Fetch server queue resources.
3. Run the pure planner.
4. Apply adoptions to `playback_local_state`; push what the server is missing.
5. Refresh `queue_cache` and re-project the native cache for CarPlay and Android Auto.
6. Publish any different-item now-playing disagreement for prompt 08 to consume.

Step 5 matters: the car surfaces read the projection via `projectQueueSnapshotToNativeCache` in
`apps/mobile/src/data/nativeCache/projection.ts`, and a merge that updates SQLite without
re-projecting leaves the car showing pre-sync state. This is a **set** change, so projecting here
is correct — unlike on a position tick, which prompt 06 forbids.

### The now-playing invariant

After applying, the now-playing row must hold the **maximum `last_played_at` of all non-upcoming
rows**. History paging spans `list_position <= 0` and therefore includes the now-playing row, so a
violation puts the currently-loaded episode partway down the history list. Assert it after apply,
not only in the pure planner's tests.

## Sign-out

Decision 12.

- **Manual sign-out with a non-empty outbox** — warn first: unsynced listening will be lost. Offer
  the chance to reconnect. On confirm, `clearForSignOut`.
- **Forced logout** ([716](/docs/proposals/mobile/_master-plan_/phase-2/details/716-forced-logout-notice.md))
  — drop silently and write a sync event log entry so it is diagnosable.
- **Never** replay one account's outbox into another. The `account_id_text` column exists for this;
  filter every drain by the current account rather than trusting the table to be empty.

New user-facing strings go through i18n
([`i18n-user-facing-strings`](/.cursor/rules/i18n-user-facing-strings.mdc)), and the warning dialog
must be screen-reader accessible
([`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc)).

## Queue membership

Per decision 9, apply through the same planner:

- Additions replay and union with the server list.
- Removals replay as tombstones so a still-present server row does not resurrect them.
- A tombstone loses to a **newer** event on the same item — played after being removed offline
  means it belongs in history, not gone.
- Order within upcoming: whole-list last-meaningful-edit wins. A lost reorder is acceptable; a lost
  addition is not.

## Tests

Table-driven, `npm --prefix apps/mobile run test`. The planner is pure, so this needs no
simulator.

1. The 06:00 / 07:00 / 08:00 scenario above.
2. The three-way interleave producing B, C, A.
3. Position forward-only when the losing side had the greater position.
4. Completion sticky against a later incomplete write.
5. Running the plan twice changes nothing the second time.
6. An item absent locally without a tombstone is **not** removed.
7. A tombstone loses to a newer play event on the same item.
8. A **same-item** disagreement resolves to a position adoption and reports no conflict.
9. A **different-item** disagreement reports a conflict with the loser bound for history.
10. Reconciling while `isPlaying` is true never changes the loaded item.
11. After apply, the now-playing row holds the maximum `last_played_at` of non-upcoming rows.
12. Sign-out with pending events clears only the current account's rows.

## Acceptance

- One merge rule, implemented once, in a pure module.
- The operator's scenario passes as a written test.
- A same-item disagreement never surfaces as a conflict.
- A different-item conflict is returned as **data**; this prompt never changes the loaded item.
- Active playback is guarded, not merely expected to win.
- The now-playing invariant is asserted after apply.
- The native cache is re-projected after a merge.
- Sign-out never leaks an outbox across accounts.
