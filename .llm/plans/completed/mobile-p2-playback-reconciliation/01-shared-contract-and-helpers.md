# 01 — Shared contract and helpers

**Detail:** [743](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md)
**Model:** Codex 5.3 · **Reasoning:** medium
**Workspace:** `packages/helpers`

Pure types and functions only. No consumers are wired in this prompt — that is deliberate, so
prompts 04 and 06 cannot invent two different definitions of "meaningful".

## Precedent to mirror

`packages/helpers/src/lib/channelSeen.ts` is the closest existing shape: a client-supplied ISO
timestamp, a `mergeLastSeenAt` later-wins helper, a batch limit constant, and request types shared
by every surface. Follow its structure and export style rather than inventing a new one.

## Files to add

### `packages/helpers/src/lib/playbackEvents.ts`

**Meaningful-event vocabulary.** The single source of truth for decision 2.

```typescript
export type PlaybackEventKind =
  | 'play'
  | 'pause'
  | 'seek'
  | 'progress_tick'
  | 'complete'
  | 'skip'
  | 'sleep_timer_stop'
  | 'queue_add'
  | 'queue_remove'
  | 'queue_reorder';
```

Export `isMeaningfulPlaybackEvent(kind, context)` where `context` carries at minimum
`{ isPlaying: boolean }`. The one nuance the type alone cannot express:

- `progress_tick` is meaningful **only** when `isPlaying` is true. A tick while paused changed
  nothing.
- Every other kind in the union is meaningful unconditionally.

Also export the non-events as documentation, not as code paths: app open, hydration from server,
render, background refresh. State in a doc comment that these must never construct a
`PlaybackEventKind` at all, rather than constructing one and filtering it later.

**Zone resolution.** Export `resolveZoneForEvent(kind)` returning `'history' | 'now_playing' |
'upcoming' | 'removed'`:

| Kind                                                         | Zone          |
| ------------------------------------------------------------ | ------------- |
| `play`, `seek`, `progress_tick`, `pause`, `sleep_timer_stop`  | `now_playing` |
| `complete`, `skip`                                            | `history`     |
| `queue_add`, `queue_reorder`                                  | `upcoming`    |
| `queue_remove`                                                | `removed`     |

`sleep_timer_stop` stays `now_playing`. Falling asleep to an episode is the strongest signal that
the user wants to resume **that** episode; sending it to history would mean waking up to something
else loaded.

### `packages/helpers/src/lib/playbackTimestamps.ts`

**Clamp.** `clampClientPlaybackTimestamp(clientIso, receivedAtIso, allowanceMs)`:

- Returns `receivedAtIso` when `clientIso` is later than `receivedAtIso + allowanceMs`.
- Returns `clientIso` otherwise, including when it is far in the past — a genuinely old offline
  listen is valid data and must not be clamped forward.
- Returns `receivedAtIso` when `clientIso` is absent or unparseable.

Export `PLAYBACK_CLOCK_SKEW_ALLOWANCE_MS` as a named constant (5 minutes). Do not inline it.

**Clock offset correction.** Clamping is one-sided — it catches a device running fast and does
nothing for one running slow, where a real 10:00 listen stamped 07:00 silently loses to another
device's genuine 08:00. Add two pure functions so the client can measure instead of trusting:

- `computeClockOffsetMs(serverDateHeader, deviceNowMs)` — the signed difference between server time
  and device time.
- `applyClockOffset(deviceTimestampMs, offsetMs)` — corrects a recorded timestamp before it is sent.

Every HTTP response already carries a `Date` header, so the offset costs nothing to obtain. Prompt
05 stores it and applies it at drain. Keep both functions pure and side-effect free here.

**Merge.** `mergePlaybackState(left, right)` taking two
`{ lastPlayedAt, playbackPosition, completed, zone }` shapes and returning the winner:

- Newer `lastPlayedAt` wins outright and its `zone` is the result zone.
- Position moves **forward only** — the result takes the greater position regardless of which side
  won, so a stale write cannot rewind someone.
- `completed` is **sticky** — once true it stays true. A late-arriving position does not un-finish
  an episode.
- A `null` timestamp always loses to a non-null one.

Mirror `mergeLastSeenAt`'s null handling in `channelSeen.ts` exactly.

### `packages/helpers/src/lib/playbackOutboxLimits.ts`

Named constants, imported everywhere rather than re-declared:

- `PLAYBACK_OUTBOX_MAX_EVENTS = 500`
- `PLAYBACK_POSITION_NETWORK_INTERVAL_MS = 15_000`
- `PLAYBACK_POSITION_LOCAL_INTERVAL_MS = 5_000`
- `PLAYBACK_REPLAY_BATCH_LIMIT` — match the shape of `CHANNEL_SEEN_MARK_BATCH_LIMIT`

## DTO changes

`packages/helpers/src/dtos/queue/queueResource.ts` — add to `DTOQueueResource`:

- `last_played_at?: string | null` (ISO)
- `last_played_received_at?: string | null` (ISO)

`packages/helpers/src/dtos/queueExtraParams.ts` — add to `QueueExtraParams`:

- `last_played_at?: string`
- `playback_event_kind?: PlaybackEventKind`

Both optional so existing callers keep compiling. Prompt 04 makes web send them; prompt 06 makes
mobile send them.

> **This is a device data migration.** `DTOQueueResource` is stored as JSON in mobile's
> `queue_cache` table on installed phones
> ([`dto-changes-are-device-data-migrations`](/.cursor/rules/dto-changes-are-device-data-migrations.mdc)).
> Prompt 05 handles it by dropping the cache on schema upgrade — it is a cache, not a source of
> truth. Note the dependency here; do not try to solve it in this prompt.

## No event ids anywhere

Nothing in this work needs a dedupe key, and adding one would be waste:

- **Positions and history** — the merge is a max-over-timestamp per item, so replaying an event
  yields the same row.
- **Listen stats** — already idempotent in Postgres today. `stats_track_event_*` carries
  `UNIQUE (account_guid, <entity>_id)` and `BaseStatsTrackEventService._create` inserts with
  `.orIgnore()`. They record unique listeners within a retention window, not play counts.

Put this in a doc comment on `mergePlaybackState` so nobody adds an event id later "for symmetry",
and make no change to the stats request types in `packages/helpers-requests`.

## Exports

Export everything new from `packages/helpers/src/index.ts` alongside the existing `channelSeen`
exports. Keep type-only imports on their own `import type` lines
([`type-imports-separate-line`](/.cursor/rules/type-imports-separate-line.mdc)).

## Tests

`packages/helpers/src/lib/*.test.ts`, matching the existing `channelSeen` test file placement.

Cover the cases that decide correctness, not every branch
([`unit-test-design-no-overgranularity`](/.cursor/skills/unit-test-design-no-overgranularity/SKILL.md)):

1. `progress_tick` while playing is meaningful; while paused it is not.
2. A client timestamp 10 minutes in the future clamps to receipt; 10 minutes in the past does not.
3. Missing or unparseable client timestamp falls back to receipt.
4. Merge: newer timestamp wins the zone.
5. Merge: position moves forward even when the older side had the greater position.
6. Merge: `completed` stays true when a stale incomplete state arrives later.
7. Merge: non-null beats null in both argument orders.
8. A device clock running three hours slow yields a negative offset, and applying it moves a
   recorded timestamp forward to real time.
9. `sleep_timer_stop` resolves to `now_playing`, not `history`.

## Acceptance

- No file outside `packages/helpers` is modified.
- `isMeaningfulPlaybackEvent`, `mergePlaybackState`, and both clock-offset functions are pure.
- The skew allowance, outbox cap, and both intervals are exported constants, not literals.
- No event id is introduced anywhere.
- Existing callers of `DTOQueueResource` and `QueueExtraParams` still typecheck unchanged.
