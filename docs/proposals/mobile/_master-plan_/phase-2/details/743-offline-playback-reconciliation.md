# 743-offline-playback-reconciliation

**Master step:** P2.4.11
**Model (author + implement):** Opus 5
**Status:** done

## Scope

Listening that happens while the device cannot reach the server must survive and land in the right
place once the device is online again — including when the same account listened on another device
in the meantime.

This is a **correctness gap**, not a polish item. A user who listens to four episodes on a plane and
lands to find none of them in history, their positions reset, and a phone that resumes the wrong
episode has lost real data the app already had.

## Current behavior (the gap)

| Concern                              | Today                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------ |
| History list                         | Server-authoritative; mobile keeps read-only cached DTO pages            |
| History ordering                     | Server `queue_resource.list_position`, **not** wall-clock time           |
| Position during playback (signed in) | **Not written anywhere on mobile** — only web posts now-playing mid-play |
| Position during playback (anonymous) | Throttled AsyncStorage snapshot with a client `updated_at`               |
| End of track / skip                  | Immediate `.../history` POST; **fails and is dropped** when offline      |
| Listen stats                         | Fire-and-forget POST; failures swallowed, event lost                     |
| Offline mutations                    | **No outbox, no replay** — for playback or for anything else             |
| Active queue claim                   | Mobile never calls `update-is-active`; web claims it during playback     |

So today: offline listening is **lost**. Not delayed — lost. Offline Mode
([742-offline-mode](/docs/proposals/mobile/_master-plan_/phase-2/details/742-offline-mode.md))
makes this reachable on purpose, which raises the stakes: we ship a switch that puts the app in the
exact state where playback bookkeeping silently disappears.

## Two facts that shape the design

Both were verified against the code and both contradict earlier assumptions.

### There is no outbox to extend

The offline-first data layer does **not** queue and replay mutations. Subscriptions
(`subscribed_channel`) and channel seen state (`channel_seen`) are local-first **domain tables**
reconciled on the next sync run by a later-wins merge. A generic `writeBehind` helper exists in
`apps/mobile/src/data/sync/` and **no repository uses it**. There is no pending-mutation table
anywhere in the app.

A playback outbox is therefore **new infrastructure**, not playback being given treatment the other
domains already have. Size the work accordingly.

### An item lives in exactly one zone

History, now playing, and upcoming are not three tables. They are three **zones of `list_position`**
on `queue_resource`, and the schema enforces one row per item per queue:

| Zone        | `list_position`       | Order                    |
| ----------- | --------------------- | ------------------------ |
| History     | `<= 0`                | DESC — most recent first |
| Now playing | `~0` (within `1e-21`) | Single row per queue     |
| Upcoming    | `> 0`                 | ASC — play order         |

`UNIQUE (queue_id, item_id)` (and the clip, soundbite, and add-by-RSS equivalents) means an episode
**cannot appear twice**. Re-listening moves the single row; it does not append. Playing something
from the queue moves that row from the upcoming zone into the now-playing zone.

This is why reconciliation is **one rule over items**, not three rules over zones. It is also why
the "queue add loses to a newer history event on the same item" guard is structural rather than
something that has to be enforced separately: they are the same row.

## Locked decisions

Captured from operator Q&A. Each is a decision, not a default.

| #   | Decision                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **History stays a deduped set.** Add a meaningful-event timestamp and order history by it instead of `list_position`. No append-only listen-event table.                                                                |
| 2   | **Meaningful event = the audio advanced, or the user acted on it.** See the vocabulary section below. This is the timestamp that decides which device wins.                                                             |
| 3   | **Unified per-item merge.** The most recent meaningful event on an item decides both its **zone** and its **position**. Not three per-zone rules.                                                                       |
| 4   | **Clock skew: store both.** Persist the client timestamp and the server receipt time. Clamp implausibly-future client times to receipt. Order by the clamped value.                                                     |
| 5   | **Backfill existing rows** from `list_position` order at migration time so current history ordering is preserved exactly.                                                                                               |
| 6   | **Cadence: 15s network, 5s local.** Network POST every 15s of playback (matching web) plus on play, pause, seek, skip, and completion. Local SQLite write every 5s.                                                     |
| 7   | **Outbox bound: 500 pending events**, evict oldest — the same cap the sync event log already uses. Position updates collapse to the latest per item.                                                                    |
| 8   | **Queue membership: union additions, with removal tombstones** so an offline removal is not undone by the still-present server row. Order within upcoming: whole-list last-meaningful-edit wins.                        |
| 9   | **A zone move is not a removal.** Playing a queued item moves it to now playing or history; that must not emit a removal tombstone. Only a deliberate delete does.                                                      |
| 10  | **Listen stats are buffered and replayed**, not dropped. No dedupe work is required — they are already idempotent server-side.                                                                                          |
| 11  | **Signed-out is out of scope.** Queue and history are signed-in-only; anonymous keeps today's single-item AsyncStorage snapshot. "Signed in" and "online" are different conditions — see below.                         |
| 12  | **On sign-out, warn then drop.** Manual sign-out warns that unsynced listening will be lost; forced logout drops silently and writes a sync-log entry. Never replay an outbox into a different account.                 |
| 13  | **Now playing resolves as data here**, changing nothing the user sees. [744](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md) adds the choice and ships in the same plan set. |
| 14  | **Web ships in the same plan set.** If web keeps writing undated, the timeline is half-dated and ordering stays broken.                                                                                                 |
| 15  | **Device clock offset is measured, not assumed.** The `Date` response header gives server time on every request; store the offset and correct outbox timestamps at drain.                                               |

## Meaningful-event vocabulary

The rule is one sentence: **the audio advanced, or the user acted on it.**

| Meaningful                            | Not meaningful                                |
| ------------------------------------- | --------------------------------------------- |
| Play pressed                          | App opened                                    |
| Pause pressed                         | Item hydrated from the server                 |
| Seek, scrub, skip-back-15             | Screen rendered or navigated to               |
| Timer tick **while actively playing** | Background refresh or sync pull               |
| Track completed or auto-advanced      | Position write while paused (nothing changed) |
| Skip to next or previous              | Queue list merely displayed                   |
| Sleep timer stopping playback         |                                               |
| Queue item added, removed, reordered  |                                               |

The exclusions are what make the merge correct. A device that opens the app at 08:00 and hydrates an
item it last genuinely played at 06:00 still carries **06:00**, so it correctly loses to another
device's 07:00 listen. The inclusions matter just as much in the other direction: without
timer-tick-while-playing, a three-hour session started at 06:00 would stay stamped 06:00 and lose to
any device that touched anything at 07:00 — while it was still playing.

This vocabulary is cross-surface and becomes an abcmemory rule, not plan text.

## Design

### 1. Two timestamps on the resource

- `last_played_at` — the clamped client time of the last meaningful event. Ordering and merge key.
- `last_played_received_at` — server receipt time. Audit, and the clamp source.

Clamp rule: a client time later than receipt by more than a small skew allowance is clamped down to
receipt. A client time far in the **past** is kept — a genuinely old offline listen is valid data.

**Clamping alone is one-sided.** It defends against a device whose clock runs fast and does nothing
for one that runs slow: a phone three hours behind stamps a real 10:00 listen as 07:00 and loses to
another device's genuine 08:00, and nothing distinguishes that from a legitimately old offline
event. The defense is to **measure** the offset rather than trust the clock. Every HTTP response
already carries a `Date` header, so the device can record the difference between its own clock and
server time whenever it talks to the API, and correct queued timestamps when it drains. That closes
the slow-clock hole without device identity, sequences, or vector clocks.

### 2. Idempotency comes free everywhere

Because the merge is a max-over-timestamp function per item, replaying the same playback event twice
produces the same row. **No dedupe key is needed for position or history replay.** This is a direct
benefit of decision 1.

Listen stats are idempotent too, and already are today. `stats_track_event_*` tables carry
`UNIQUE (account_guid, <entity>_id)` and `BaseStatsTrackEventService._create` inserts with
`.orIgnore()`, so a row exists at most once per account per entity within the retention window.
These record **unique listeners**, not play counts. Replaying a buffered stat is a no-op in
Postgres. Do not add an event id or a dedupe layer for them.

### 3. The row-limit trigger has to follow the new ordering

`enforce_queue_resource_limit()` caps each queue at 10,000 rows by deleting the row with the
**lowest `list_position`**. Today that is also the oldest listen, so the two coincide. Once ordering
moves to `last_played_at` they diverge: a replayed offline listen carries an old timestamp but is
assigned a fresh `list_position` near the top of the history stack, so the trigger would start
evicting by write order while the user sees time order — and could delete a recent listen.

The eviction must select the oldest **listen** within the history zone
(`list_position < 0`, ordered by `last_played_at` ascending). It must not widen to the whole queue:
upcoming rows carry a `NULL` timestamp and would otherwise sort first and be evicted, silently
deleting the user's queue.

### 4. Concurrent replay and the position uniqueness constraint

History positions are assigned as `most_recent_history_position + 0.00000001` under
`UNIQUE (queue_id, list_position)`. One write at a time rarely collides; a batch replay landing
while another device is writing makes it plausible. Serialize the replay transaction per queue
rather than retrying on conflict in a loop.

### 5. The outbox

A durable SQLite table of pending playback mutations, drained by the existing serial sync queue
([717](/docs/proposals/mobile/_master-plan_/phase-2/details/717-fast-startup-and-sync-queue.md)) when
the network returns and Offline Mode is off.

- Bounded at 500 events, oldest evicted.
- Position updates collapse to the latest per item before send.
- Zone moves and removal tombstones are distinct event kinds (decision 9).
- Survives app restart and process death.

### 6. Signed in and offline is the whole point

The one distinction everything here rests on: **"signed in" and "has a network connection" are
different conditions.** Queue and history are signed-in-only features, and a signed-in user with no
connection is still a signed-in user. They keep a working queue and history on the device, and that
state syncs to the account when the network returns. Offline Mode is the same situation entered on
purpose.

So the local queue and history are not an anonymous capability being extended upward — they are the
offline half of a signed-in feature. Anonymous playback keeps only a single-item resume snapshot and
has no queue or history at all. The tier table in
[`mobile-anonymous-vs-account-features`](/.cursor/rules/mobile-anonymous-vs-account-features.mdc)
carries this.

### 7. Merge on reconnect

For each item present locally, remotely, or both: the side with the newer clamped meaningful-event
timestamp wins, and its event kind determines the destination zone. Positions move **forward** per
item. A completion is sticky — a finished episode does not become unfinished because a stale
position arrives late. This mirrors the later-wins rule already proven for channel seen state
([703](/docs/proposals/mobile/_master-plan_/phase-2/details/703-channel-seen-state.md)).

## Acceptance criteria

- Listening fully offline (airplane mode **and** Offline Mode) records history and positions
  locally, with the time each listen happened.
- Reconnecting replays them; nothing is lost and nothing is duplicated, including across an app
  restart mid-replay.
- Merged history is ordered by **when the user listened**, not when the server received it.
- The interleaved two-device case resolves correctly: a 06:00 offline listen does **not** overwrite a
  07:00 listen from another device, and reopening the app at 08:00 without pressing play does not
  change that outcome.
- A resumed episode resumes from the furthest-forward position across devices; a completed episode
  stays completed.
- An item queued offline arrives in the queue on sync, unless a newer meaningful event moved it
  elsewhere. An item removed offline stays removed.
- Playing a queued item moves it between zones without being mistaken for a removal.
- Mobile posts now-playing position during playback for signed-in users, matching web.
- Buffered listen stats reach the server after an offline session, and a replay adds nothing.
- A device whose clock is materially wrong in **either** direction still merges correctly, because
  the offset is measured against server time rather than trusted.
- At the 10,000-row cap, eviction removes the oldest **listen** and never an upcoming queue item.
- A batch replay arriving while another device writes does not fail on the position uniqueness
  constraint.
- Existing history ordering is unchanged immediately after the migration.
- The outbox is bounded at 500 events and its retention is documented.
- Signing out warns about unsynced listening and never replays one account's outbox into another.

## Cross-surface impact

Not a mobile-only change
([`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc)):

- **SQL / ORM** — two timestamp columns on `queue_resource`, a history ordering index, a backfill,
  and a change to the row-limit trigger. History ordering moves off `list_position`.
- **API** — accept and honor the client timestamp.
- **Web** — must send the same timestamp, or web writes land undated and re-break ordering.
- **Mobile** — outbox table, replay job, mid-playback position writes, merge on reconnect.
- **DTO change** — this widens JSON already stored on installed phones
  ([`dto-changes-are-device-data-migrations`](/.cursor/rules/dto-changes-are-device-data-migrations.mdc)).
  Both new fields are optional and `safeJsonParse` is permissive, so cached rows stay valid and
  heal on the next 5-minute refresh. **Do not clear `queue_cache`** — that would strand a user who
  upgrades while offline.

## Known gap left open

The native cache that CarPlay and Android Auto read
(`QueueSnapshotProjection`) carries `nowPlayingIdText` and queue entries but **no playback
position**. So once positions are tracked properly, car playback after the app is killed still
resumes a track from the start rather than where the user stopped. Closing that means adding a
playhead to the projection and is deliberately out of scope here.

## Known gap after implementation

Mobile records nothing for **add-by-RSS** playback, so those listens never reach the outbox or the
reconciliation merge even though the outbox schema, the reconcile merge, the API route, and web all
support the kind. Tracked in
[745-defer-mobile-add-by-rss-playback-recording](/docs/proposals/mobile/_master-plan_/phase-2/details/745-defer-mobile-add-by-rss-playback-recording.md).
Everything below about linked resources — item, clip, soundbite — holds as written.

## Prior deferral

[585-defer-offline-sync-advanced](/docs/proposals/mobile/_master-plan_/phase-1/details/585-defer-offline-sync-advanced.md)
deferred **advanced multi-device merge** (three-way merges, vector clocks) and that deferral still
stands for exotic conflicts. It does **not** cover this: the basic case of "replay what happened
offline, in the order it happened" was assumed to work and does not exist.

## Verification

Operator runs after implementation; agents do not run tests during the work.

```bash
npm run build:packages
npm run lint
npm run test:unit
npm run test:e2e:api
npm run mobile:e2e:test -- playback-offline-reconciliation
```

## Related

- [744-multi-device-playback-handoff](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md)
- [745-defer-mobile-add-by-rss-playback-recording](/docs/proposals/mobile/_master-plan_/phase-2/details/745-defer-mobile-add-by-rss-playback-recording.md)
- [742-offline-mode](/docs/proposals/mobile/_master-plan_/phase-2/details/742-offline-mode.md)
- [702-offline-content-sync](/docs/proposals/mobile/_master-plan_/phase-2/details/702-offline-content-sync.md)
  — offline **content**; this is offline **playback state**
