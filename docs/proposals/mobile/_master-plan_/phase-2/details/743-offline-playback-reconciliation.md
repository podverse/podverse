# 743-offline-playback-reconciliation

**Master step:** P2.4.11
**Model (author + implement):** TBD
**Status:** planned — **important**, not yet built

## Scope

Listening that happens while the device cannot reach the server must survive and land in the right
**chronological** place in history once the device is online again — including when the same account
listened on another device in the meantime.

This is a **correctness gap**, not a polish item. A user who listens to four episodes on a plane and
lands to find none of them in history, their positions reset, and a phone that resumes the wrong
episode has lost real data the app already had.

## Current behavior (the gap)

| Concern | Today |
| ------- | ----- |
| History list | Server-authoritative; mobile keeps read-only cached DTO pages in `queue_cache` |
| History ordering | Server `queue_resource.list_position`, **not** wall-clock time |
| Position during playback (signed in) | **Not written anywhere on mobile** — only web posts now-playing updates mid-play |
| Position during playback (anonymous) | Throttled AsyncStorage snapshot with a client `updated_at` |
| End of track / skip | Immediate `.../history` POST; **fails and is dropped** when offline |
| Listen stats | Fire-and-forget POST; failures swallowed, event lost |
| Offline mutations | **No outbox, no replay** |

So today: offline listening is **lost**. Not delayed — lost. Offline Mode
([742-offline-mode](/docs/proposals/mobile/_master-plan_/phase-2/details/742-offline-mode.md))
makes this reachable on purpose, which raises the stakes: we now ship a switch that puts the app in
the exact state where playback bookkeeping silently disappears.

The offline-first data layer already queues and replays mutations for **subscriptions** and
**channel seen state**. Playback simply was never given the same treatment.

## The hard part: chronology across devices

History is not a set, it is a **timeline**, and the device that was offline holds timeline entries
that belong *between* entries the server already accepted from another device.

Example:

1. 09:00 — phone goes offline, plays Episode A to completion (09:20), then Episode B (09:55).
2. 09:30 — laptop, online, plays Episode C.
3. 10:00 — phone reconnects.

Correct merged history, newest first: **B (09:55) → C (09:30) → A (09:20)**.

A naive replay appends A then B on top of C and produces **B → A → C**, which is wrong. The
server's `list_position` ordering cannot fix this, because position is assigned at write time and
encodes *arrival* order, not *listen* order.

This is why the work needs a real design pass rather than "retry the POST later".

## Design direction (not final)

### 1. Client-stamped listen events

Every playback event gets a **client timestamp captured when it happened**, carried through replay:

- `listened_at` on history writes and position updates.
- The server stores it and orders history by it, rather than by arrival.
- Keep `list_position` for manual reordering, but stop treating it as the timeline.

Clock skew is real: devices can be wrong by minutes. Options to evaluate — record both client time
and server receipt time, or carry a monotonic per-device sequence plus a device-clock offset
measured at sync time. **Decide explicitly; do not leave it implicit.**

### 2. A playback outbox on device

A durable local table of pending playback mutations (history append, position update, completion),
drained by the existing sync queue
([717-fast-startup-and-sync-queue](/docs/proposals/mobile/_master-plan_/phase-2/details/717-fast-startup-and-sync-queue.md))
when the network returns and Offline Mode is off.

- Must be **idempotent** — a replayed event that already landed must not duplicate a history row.
  An event id generated on device is the natural key.
- Must be **bounded** — a phone offline for a month cannot grow without limit. Collapse repeated
  position updates for the same item to the latest one; cap retained history events and say so.
- Must survive app restart and process death.

### 3. Position sync during playback for signed-in users

Mobile does not currently post now-playing progress at all, so even **online** the second device
resumes from a stale point. Web already does this. Closing that gap is a prerequisite: an outbox
that replays events mobile never recorded solves nothing.

### 4. Merge rule

Positions move **forward** per item, resolved by `listened_at`, matching the later-wins rule already
proven for channel seen state
([703-channel-seen-state](/docs/proposals/mobile/_master-plan_/phase-2/details/703-channel-seen-state.md)).
A completion is sticky: a finished episode does not become unfinished because a stale position
arrives late.

### 5. Stats

Listen stats are currently dropped offline. Decide whether they are worth buffering at all — they
may be acceptable to lose, but that should be a **recorded decision**, not a side effect.

## Cross-surface impact

Not a mobile-only change
([`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc)):

- **ORM / SQL** — new timestamp column(s) on queue resources; history ordering index.
- **API** — accept and honor a client listen timestamp; idempotency key on history writes.
- **Web** — must send the same timestamp, or web writes land undated and re-break ordering.
- **Mobile** — outbox table, replay job, mid-playback position writes.
- **DTO change** — this rewrites JSON already stored on installed phones
  ([`dto-changes-are-device-data-migrations`](/.cursor/rules/dto-changes-are-device-data-migrations.mdc)).

## Acceptance criteria (draft)

- Listening fully offline (airplane mode **and** Offline Mode) records history and positions
  locally, with the time each listen happened.
- Reconnecting replays them; nothing is lost and nothing is duplicated, including across an app
  restart mid-replay.
- Merged history is ordered by **when the user listened**, not when the server received it —
  verified by the interleaved two-device scenario above.
- A resumed episode resumes from the furthest-forward position across devices; a completed episode
  stays completed.
- The outbox is bounded and its retention limit is documented.
- Mobile posts now-playing position during playback for signed-in users, matching web.

## Prior deferral

[585-defer-offline-sync-advanced](/docs/proposals/mobile/_master-plan_/phase-1/details/585-defer-offline-sync-advanced.md)
deferred **advanced multi-device merge** (three-way merges, vector clocks) and that deferral still
stands for exotic conflicts. It does **not** cover this: the basic case of "replay what happened
offline, in the order it happened" was assumed to work and does not exist.

## Related

- [744-multi-device-playback-handoff](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md)
  — what the user sees when two signed-in devices are both playing
- [742-offline-mode](/docs/proposals/mobile/_master-plan_/phase-2/details/742-offline-mode.md) —
  the toggle that makes this reachable deliberately
- [702-offline-content-sync](/docs/proposals/mobile/_master-plan_/phase-2/details/702-offline-content-sync.md)
  — offline **content**; this is offline **playback state**
