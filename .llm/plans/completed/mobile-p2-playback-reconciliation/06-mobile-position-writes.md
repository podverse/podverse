# 06 — Mobile position writes

**Detail:** [743](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md)
**Model:** Opus 5 · **Reasoning:** high
**Workspace:** `apps/mobile`

Mobile has never posted playback position. This prompt closes that gap and routes every playback
event into the outbox from prompt 05.

## Handle with care

`apps/mobile/src/playback/PlaybackProvider.tsx` (907 lines) drives the native engine, the mini
player, CarPlay, and Android Auto. Keep the new logic in **pure, testable modules** and let the
provider call them. Do not grow the effects.

The transport is first-party **`podverse-media-engine`** via `nativePlaybackBridge` — **not**
`react-native-track-player`
([`mobile-carplay-android-auto`](/.cursor/rules/mobile-carplay-android-auto.mdc)). Do not reach for
track-player APIs such as `useProgress` or `Event.PlaybackProgressUpdated`; they do not exist here.

### Do not break the context split

The provider deliberately exposes **two** contexts, merged only by `usePlayback()`:

| Hook                   | Context                    | Holds                                    |
| ---------------------- | -------------------------- | ---------------------------------------- |
| `usePlaybackSession()` | `PlaybackSessionContext`   | Controls and the loaded target           |
| `usePlaybackProgress()` | `PlaybackProgressContext` | `{ durationSeconds, positionSeconds }`   |

The split exists so that a position tick does not re-render every consumer of the session surface.
**Do not put outbox state, pending counts, or a "last flushed at" value into either context.** Keep
all of it in refs and in SQLite, the way `lastAnonymousSnapshotWriteRef` already works. Adding
observable state here would repaint the whole player tree twice a second.

## What exists

| Piece                     | Where                                                                        |
| ------------------------- | ---------------------------------------------------------------------------- |
| Single engine subscription | `useNativePlaybackBridge({ ended, error, playbackState, progress })` — provider lines 757–794 |
| Native progress cadence   | **500 ms**, emitted by the native engine. There is no JS `setInterval`       |
| Anonymous snapshot        | `apps/mobile/src/lib/anonymous/anonymousPlaybackStorage.ts`, key `pv_mobile_anonymous_last_playback` |
| Its throttle              | `ANONYMOUS_SNAPSHOT_THROTTLE_MS = 5000` (line 75) + `lastAnonymousSnapshotWriteRef` |
| Sleep timer               | `pauseAtRef`, compared against position inside the `progress` handler        |
| History POST on track end | `advance()` (lines 633–674) → `moveNowPlayingToHistory` → `queueRepository.addResourceToHistory` |
| Position target builder   | `playbackTargetToHistoryTarget(target, positionRef.current)` in `apps/mobile/src/lib/playback/buildPlaybackTarget.ts` |
| Stats                     | `apps/mobile/src/data/repositories/statsRepository.ts` — fire-and-forget     |

The anonymous throttle is the pattern to copy: a `Date.now()` comparison against a ref, evaluated
inside the existing `progress` handler. Both new cadences follow it.

## Cadence

| Layer                | Interval | Also fires on                                     |
| -------------------- | -------- | -------------------------------------------------- |
| Local `playback_local_state` | 5s | Every meaningful event                       |
| Network POST         | 15s      | play, pause, seek, skip, completion, backgrounding |

Use `PLAYBACK_POSITION_LOCAL_INTERVAL_MS` and `PLAYBACK_POSITION_NETWORK_INTERVAL_MS` from
`@podverse/helpers`. No local literals.

The 15-second network cadence matches web deliberately, so there is one number to reason about
across surfaces.

## New module — event classification

`apps/mobile/src/playback/playbackEventSource.ts`, pure:

Map native and UI signals onto `PlaybackEventKind`:

| Signal                                       | Kind               |
| -------------------------------------------- | ------------------ |
| User presses play                            | `play`             |
| User presses pause                           | `pause`            |
| Seek, scrub, skip-back-15, skip-forward      | `seek`             |
| Progress tick **while playing**              | `progress_tick`    |
| `ended` event / auto-advance                 | `complete`         |
| User skips to next or previous               | `skip`             |
| Sleep timer stops playback                   | `sleep_timer_stop` |
| Queue add, remove, reorder                   | `queue_*`          |

Route everything through `isMeaningfulPlaybackEvent` from `@podverse/helpers`. Do not reimplement
the check.

**What must not produce an event at all:** app foregrounding, queue hydration from the server,
screen focus, a background sync pull, and a progress tick while paused. These must never construct
a `PlaybackEventKind` — constructing one and filtering it later invites someone to "fix" the filter.
This exclusion is what makes the operator's 08:00 case resolve correctly.

## Wiring

### Both cadences are throttles, not timers

There is no JS interval today, and **do not add one**. A `setInterval` keeps firing while paused,
while backgrounded, and after the track ends, so it would need its own lifecycle management and
would emit ticks that `isMeaningfulPlaybackEvent` then has to reject.

Instead, extend the **existing `progress` handler** (lines 771–793), which already runs at 500 ms
and already carries the authoritative position. Add two ref-compared throttles beside
`lastAnonymousSnapshotWriteRef`, one at 5 s for the SQLite write and one at 15 s for the network
POST. The handler only runs while the engine is producing progress, so "only while playing" is
free rather than something to enforce.

This also satisfies
[`mobile-progress-ux-and-notification-channels`](/.cursor/rules/mobile-progress-ux-and-notification-channels.mdc),
which forbids a SQLite write per high-frequency tick and requires exactly this shape — a slow
heartbeat plus the moments the value is actually read.

### Per-event wiring

1. **Meaningful event → enqueue.** Call `playbackOutboxRepository.enqueue(...)` with the position
   and an `occurredAt` captured **at that moment**, never at flush.
2. **Discrete events post immediately** — `play`, `pause`, `seek`, `skip`, `complete` — rather than
   waiting for the 15 s throttle. These are the moments the position is read.
3. **`sleep_timer_stop`** is emitted where `pauseAtRef` already triggers the pause, inside the
   `progress` handler. Its zone is `now_playing`, not history — the user wants to resume this.
4. **`complete`** is emitted from `advance()`, before the existing history POST.
5. **On backgrounding, flush once.** A user who backgrounds mid-episode and does not return for a
   week should still have that position. Use the existing `AppState` wiring if the provider has it;
   otherwise `SyncProvider` already listens for `app-foreground` and is the better home.

The enqueue is the durable write and happens first. The network POST is an optimization on top. Do
not make the outbox write conditional on the POST failing — that reintroduces the dropped-write bug
in a new shape.

### Do not project the native cache on ticks

`projectQueueSnapshotToNativeCache` rebuilds the CarPlay / Android Auto payload and must be called
only when the **set** it describes changes, never when a position moves. The projection carries
`nowPlayingIdText` and queue entries — it has no position field, so a tick has nothing to
contribute to it anyway.

That absence is a known gap: after the app is killed, car playback resumes a track from the start
rather than the saved position. It is **deliberately out of scope** here; do not add a playhead to
the projection in this prompt.

### Offline Mode

`requestWithMobileAuthRefresh` throws `OfflineModeEnabledError` (`code: 'ERR_OFFLINE_MODE'`) when
Offline Mode is on, so the network POST fails fast without a socket attempt. Catch that code
specifically and treat it as expected — the outbox row is already durable, and this must not reach
the sync event log as a failure
([`mobile-offline-mode`](/.cursor/rules/mobile-offline-mode.mdc)).

### `update-is-active`

Mobile has never claimed the active queue. Web claims it on every now-playing write. Mobile should
claim it on `play` only — not on every tick — so a phone that is merely open does not take the claim
from a laptop that is actively playing. Call `reqQueueUpdateIsActiveQueue` alongside the `play`
event.

### Existing history path

`advance()` already posts to history on track end. Keep it, but have it enqueue a `complete` event
first so an offline completion survives. When the POST succeeds the drain finds nothing new to do;
when it fails the event is already durable.

### Anonymous unchanged

Queue and history are **signed-in-only features**, so there is no anonymous outbox to build.
Signed-out users keep the existing single-item AsyncStorage snapshot as their resume mechanism —
do not route anonymous playback through the outbox, and do not remove the snapshot.

Note the distinction this work depends on: "signed in" and "has a network connection" are
different conditions. A signed-in user with no network is still a signed-in user and gets the full
local queue, history, and outbox. Anonymous gets none of it. See
[`mobile-anonymous-vs-account-features`](/.cursor/rules/mobile-anonymous-vs-account-features.mdc)
§ Queue and history are signed-in only.

## Listen stats buffering

`statsRepository.trackPlaybackStats` is fire-and-forget and loses events offline. Enqueue the event
when the immediate POST fails or the device is offline, so the drain replays it.

**No event id, and no API change.** The stats endpoints are already idempotent:
`stats_track_event_*` carries `UNIQUE (account_guid, <entity>_id)` and the insert uses
`.orIgnore()`. They count unique listeners, not plays, so a replay is a no-op in Postgres.

Consent still gates these server-side, and a replayed event respects **current** consent. Do not
snapshot consent at enqueue time.

## Sync job

Registering a job touches three files, in this order:

1. **`apps/mobile/src/sync/syncJobKinds.ts`** — add `'playback-replay'` to the `SYNC_JOB_KINDS`
   array and its label key to `SYNC_JOB_LABEL_KEYS`. That record is typed
   `Record<SyncJobKind, string>`, so TypeScript fails until the label exists — the indicator and
   event log then pick it up for free.
2. **`apps/mobile/src/sync/syncJobs.ts`** — add the body in `buildSyncJobs`. Follow the
   `channel-seen` job as the template; it is the closest existing shape (local rows reconciled
   against the server by timestamp).
3. **`apps/mobile/src/sync/syncJobPlan.ts`** — root it in `planSyncRun` for **authenticated** users
   on `app-start`, `sign-in`, `app-foreground`, and `connectivity-restored`.

Add the i18n string for the label key
([`i18n-user-facing-strings`](/.cursor/rules/i18n-user-facing-strings.mdc)).

### Priority and ordering

Use **`user`** priority. `createSyncQueue` inserts `user` jobs ahead of the first `background` job,
and that is the behavior we want: history the user is about to look at should not sit behind a full
subscriptions pass.

Order it **before** `queue-hydrate`. Replaying local events first means the hydrate pulls a server
state that already includes them, instead of pulling stale state and fighting the merge.

The queue runs **one job at a time**, so ordering here is real sequencing rather than a hint.

## Tests

`npm --prefix apps/mobile run test`:

1. A progress tick while paused enqueues nothing.
2. A progress tick while playing enqueues `progress_tick`.
3. Foregrounding the app enqueues nothing.
4. Play, pause, seek, skip, and completion each enqueue immediately rather than waiting 15s.
5. A failed network POST still leaves a durable outbox row.
6. `update-is-active` fires on `play` and not on `progress_tick`.
7. Anonymous playback writes the AsyncStorage snapshot and no outbox row.
8. The replay job is planned before `queue-hydrate`, at `user` priority.
9. An `OfflineModeEnabledError` during a POST leaves the outbox row and logs no failure.
10. `sleep_timer_stop` enqueues with zone `now_playing`.

## Acceptance

- Mobile posts now-playing position during playback for signed-in users.
- Every meaningful event produces a durable outbox row before any network attempt.
- Non-events never construct a `PlaybackEventKind`.
- Cadence constants come from `@podverse/helpers`.
- Classification lives in a pure module, not inside provider effects.
- **No `setInterval` is added.** Both cadences are ref throttles inside the existing `progress`
  handler.
- **Nothing is added to either playback context.** Outbox state lives in refs and SQLite.
- The native cache is not projected on a position tick.
- Anonymous behavior is unchanged.
