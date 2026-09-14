# mobile-p2-playback-reconciliation — summary

**Master steps:** P2.4.11 (prompts 01–07) and P2.4.12 (prompt 08) — both built by this set
**Detail docs:** [743](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md),
[744](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md)
**Area:** Cross-cutting foundation — not a legacy screen area

## Why this and not another screen

Offline Mode shipped. It parks the network on purpose, and playback bookkeeping cannot survive it:
mobile never posts position during playback, history writes that fail offline are dropped rather
than queued, and there is no outbox anywhere in the app. A user who listens to four episodes on a
plane loses all four. Building Player or Episode chrome on top of a listen pipeline that cannot
remember offline listening is building on sand.

## Corrections to the original detail

All verified in code, all change the design. They are now reflected in 743.

1. **There is no outbox to extend.** Subscriptions and channel seen state use local-first domain
   tables reconciled by later-wins on the next sync run. The `writeBehind` helper in
   `apps/mobile/src/data/sync/` is exported but called by no repository. A playback outbox is new
   infrastructure.
2. **History is a deduped set, not a timeline.** History, now playing, and upcoming are zones of
   `list_position` on one `queue_resource` table, and `UNIQUE (queue_id, item_id)` means an item is
   in **exactly one zone at a time**. Re-listening moves the row; it never appends.

3. **Listen stats are already idempotent.** `stats_track_event_*` carries
   `UNIQUE (account_guid, <entity>_id)` and inserts with `.orIgnore()`, so they record unique
   listeners in a rolling window rather than play counts. Replaying a buffered stat is a no-op in
   Postgres, and the event-id plus dedupe layer originally planned for them was removed.
4. **The row-limit trigger needed rewriting.** `enforce_queue_resource_limit()` evicts the lowest
   `list_position`, which stops meaning "oldest listen" once ordering moves to timestamps.

Consequence of 1 and 2: reconciliation is **one rule over items**, not three rules over zones.

## Locked decisions

| #   | Question                              | Decision                                                                                                          | Rationale                                                                                     |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Deduped set or append-only event log? | **Deduped set** plus a meaningful-event timestamp; order history by it                                            | Every behavior the operator described works on a set; a log only buys repeat-listen analytics |
| 2   | What counts as a meaningful event?    | **The audio advanced, or the user acted on it**                                                                   | An enumerated list kept mis-stamping long sessions; one sentence generalizes correctly        |
| 3   | Per-zone or per-item merge?           | **Per item.** The newest meaningful event decides both zone and position                                          | Falls out of one-row-per-item; makes the queue-vs-history guard structural                    |
| 4   | Clock skew                            | Store **client time and server receipt**; clamp implausibly-future client times to receipt                        | Honest about skew without needing device identity or vector clocks                            |
| 5   | Existing rows with no timestamp       | **Backfill** from `list_position` order at migration time                                                         | Current history ordering is preserved exactly; everything is comparable afterward             |
| 6   | Write cadence                         | **15s network** (matches web) plus play, pause, seek, skip, completion; **5s local**                              | Matching web avoids a second cadence to reason about                                          |
| 7   | Outbox bound                          | **500 events**, evict oldest; positions collapse to latest per item                                               | Same cap the sync event log already uses                                                      |
| 8   | Listen stats offline                  | **Buffer and replay.** No dedupe work — already idempotent server-side                                            | `UNIQUE (account_guid, entity_id)` plus `.orIgnore()`; they count unique listeners, not plays |
| 9   | Queue membership conflicts            | **Union additions, with removal tombstones**; upcoming order by whole-list last-meaningful-edit                   | Without tombstones an offline removal is undone by the still-present server row               |
| 10  | Zone move vs removal                  | A zone move is **not** a removal and emits no tombstone                                                           | Playing a queued item must not look like deleting it                                          |
| 11  | Signed-out users                      | **Out of scope.** Anonymous keeps today's single-item snapshot                                                    | Queue and history are signed-in-only; "signed in" and "online" are different conditions       |
| 12  | Sign-out with a pending outbox        | **Warn then drop** on manual sign-out; drop silently plus a sync-log entry on forced logout                       | No cross-account leakage; the user gets a chance to reconnect first                           |
| 13  | Now-playing conflict prompt           | **Resolved as data** by 07; the user-facing choice is prompt 08, in this same set                                 | A silent swap of the loaded item is more surprising than either asking or doing nothing       |
| 14  | Web scope                             | **Same plan set**                                                                                                 | Undated web writes would re-break ordering the moment they land                               |
| 15  | Device clock offset                   | **Measure it** from the `Date` response header; correct timestamps at drain                                       | Clamping only catches fast clocks; a slow clock silently loses merges it should win           |
| 16  | When the handoff prompt appears       | **Different item only.** Same item adopts the newer position with no prompt                                       | Being asked because another device is 40s further into the same episode is a nag, not a choice |
| 17  | Dismissing the handoff prompt         | Remembered against the **declined remote state**; returns only when the other device plays something new          | A time window either nags or hides a real change; the state is the thing that matters         |
| 18  | Tapping Switch                        | **Starts playing** at the remote position                                                                         | Tapping Switch is an intent to listen, not to load                                            |

## What ships

- Two timestamp columns on `queue_resource`, a history ordering index, and a backfill.
- History ordering moves off `list_position` and onto the meaningful-event timestamp.
- A rewritten row-limit trigger, so eviction follows the new ordering.
- Client timestamps accepted and clamped by the API, plus a batch replay route.
- Web sends the timestamp on every playback write.
- Mobile gains a durable playback outbox, mid-playback position writes, and reconnect merge.
- Measured device-clock offset correction, so a slow clock cannot lose a merge it should win.
- The **multi-device handoff prompt** on web and mobile, for the different-item case only.
- A cross-surface abcmemory rule for the meaningful-event vocabulary.

## What does not ship

- Anonymous queue or history. Those are signed-in-only features; anonymous keeps a single-item
  resume snapshot.
- A prompt for the **same-item** case. That adopts the newer position silently, by design.
- A playhead in the CarPlay / Android Auto native cache projection, so car resume after app death
  still starts a track from the beginning. Known gap, recorded in 743.
- Device identity, a device registry, or any realtime channel.
- An append-only listen-event table.

## Idempotency note

Because the merge is a max-over-timestamp per item, replaying a playback event twice produces the
same row — **no dedupe key is needed for position or history replay**.

Listen stats are idempotent too, and already are. `stats_track_event_*` carries
`UNIQUE (account_guid, <entity>_id)` and `BaseStatsTrackEventService._create` inserts with
`.orIgnore()`, so a row exists at most once per account per entity within the retention window.
These measure unique listeners, not play counts. **No event id exists anywhere in this work**, and
none should be added.

## Model mix

| Model     | Prompts            |
| --------- | ------------------ |
| Opus 5    | 02, 05, 06, 07, 08 |
| Codex 5.3 | 01, 03, 04, 09     |

## Risk notes

- Prompt 02 changes how history is ordered for every existing account. The backfill is the whole
  safety story, and **the E2E seed cannot verify it** — `tools/web/seed-e2e.mjs` inserts only
  upcoming rows (`list_position` 1–4) and no history at all, so a test run against it passes
  vacuously. The prompt requires the test to build its own history fixture.
- Prompt 06 edits `PlaybackProvider` (907 lines), which drives the native engine, CarPlay, and
  Android Auto. Two specific traps: its **split contexts** exist so a position tick does not
  re-render session consumers, so nothing observable may be added to either; and there is **no JS
  interval** today, so both cadences must be ref throttles inside the existing 500 ms `progress`
  handler rather than a new `setInterval`.
- Prompt 08 is the only user-visible change in the set and spans both clients. The riskiest way to
  get it wrong is to "improve" the same-item case into a prompt.
- Prompt 07 is the hardest. The merge must be a pure function with the two-device interleave as a
  table-driven test before it is wired to anything.
- **The headline scenario has no end-to-end proof.** Maestro cannot readily drive two devices or
  skew a clock, so the 06:00 / 07:00 / 08:00 interleave is covered at the unit level (prompt 07)
  and the server level (prompt 03 integration tests), and nowhere else. Treat the pure merge
  function's test table as the real specification and keep it exhaustive.
- Clock offset correction reduces but does not eliminate skew risk. A device that is offline for
  the entire session never refreshes its offset, so a clock that drifts *during* the offline
  stretch is still uncorrected. Accepted: the residual error is drift over one session rather
  than absolute clock error, which is orders of magnitude smaller.
