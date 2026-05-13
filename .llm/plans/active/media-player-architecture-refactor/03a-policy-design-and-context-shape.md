# Phase 3a — Load policy + new MediaPlayer context shape

## Goal

Land the centralized load decision (`resolvePlaybackLoadDecision`),
the new `MediaPlayer` context shape, and the new return contract for
`useQueueResourcesLoadActive` — **without flipping any existing
consumers**. Phase 3b is the consumer migration commit.

This file freezes the API surface so 3b is mechanical.

## Scope

- `apps/web/src/lib/playback/resolvePlaybackLoadDecision.ts` (new)
- `apps/web/src/lib/playback/index.ts` (export the policy)
- `apps/web/src/contexts/MediaPlayer.tsx` (add new fields, do not remove
  legacy fields yet — 3b removes them)
- `apps/web/src/hooks/useQueueResourcesLoadActive.tsx` (additive: gain
  a return type that includes the loaded resources; existing side
  effects remain in place so existing callers still work)
- Unit tests for the policy

No call sites outside the above are touched in 3a.

## 1. Decision policy: `resolvePlaybackLoadDecision`

### Signature

```typescript
import type {
  PlaybackLoadRequest,
  PlaybackTarget,
} from './playbackLoadRequest';
import type { QueueResourcesAbridgedIndex } from '../../contexts/QueueResourcesAbridgedIndex';

export type PlaybackLoadDecision = {
  /** Final position the bridge should seek to once `loadedmetadata`
   *  fires. Always >= 0 and finite; clamped near end when applicable. */
  initialSeekSeconds: number;
  /** Whether the bridge should call `play()` after the seek lands. */
  shouldAutoPlay: boolean;
  /** When the bridge should pause itself. Used for clip end-time and
   *  soundbite end-time enforcement. `undefined` = no pause. */
  pauseAtSeconds?: number;
  /** Whether the bridge should clear AutoQueue after the load lands.
   *  True for explicit play, false for autoQueue transitions and
   *  session restore. */
  shouldClearAutoQueue: boolean;
  /** Whether the bridge should record a stat-track event after play
   *  begins. False for session_restore (already counted previously). */
  shouldRecordPlaybackStat: boolean;
  /** Diagnostic / observability label; never used for control flow. */
  reason: PlaybackLoadDecisionReason;
};

export type PlaybackLoadDecisionReason =
  | 'clip-start'
  | 'soundbite-start'
  | 'chapter-start'
  | 'item-podcast-resume'
  | 'item-podcast-fresh'
  | 'item-video-resume'
  | 'item-video-fresh'
  | 'item-music-session-restore'
  | 'item-music-explicit'
  | 'item-music-fresh-transition'
  | 'add-by-rss-resume'
  | 'add-by-rss-fresh'
  | 'livestream';

export function resolvePlaybackLoadDecision(
  request: PlaybackLoadRequest,
  indices: { abridged: QueueResourcesAbridgedIndex },
): PlaybackLoadDecision;
```

### Per-target rules

The function body is a `switch (request.target.kind)`. Each branch is a
small composition of the Phase 2 helpers. Reference the Phase 1 matrix
for every cell.

| `target.kind`       | initialSeekSeconds                                                                                                                                                                                                                                                       | shouldAutoPlay | pauseAtSeconds                | shouldClearAutoQueue | shouldRecordPlaybackStat |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ----------------------------- | -------------------- | ------------------------ |
| `clip`              | `clip.start_time ?? 0`                                                                                                                                                                                                                                                   | `true`         | `(clip.end_time ?? 0) + 1`    | `true`               | `true`                   |
| `soundbite`         | `soundbite.start_time ?? 0`                                                                                                                                                                                                                                              | `true`         | `start + duration + 1`        | `true`               | `true`                   |
| `chapter`           | `chapter.start_time ?? 0`                                                                                                                                                                                                                                                | `true`         | optional `chapter.end_time+1` | `true`               | `true`                   |
| `item-podcast`      | `resumeSeekFromAbridged(item, explicitPlaybackSeconds, hint)`                                                                                                                                                                                                            | `true`         | `undefined`                   | `true`               | `true`                   |
| `item-video`        | `resumeSeekFromAbridged(...)`                                                                                                                                                                                                                                            | `true`         | `undefined`                   | `true`               | `true`                   |
| `item-music`        | branch on `intent`: `session_restore` → `resumeSeekFromAbridged(...)` with near-end clamp; `explicit_play` or `fresh_transition` → `0`. **Safe default:** an unrecognized future intent falls through to `fresh_transition` (i.e. `0`) — never silently restores a saved position. | `true`         | `undefined`                   | `intent === 'explicit_play'` | `intent !== 'session_restore'` |
| `add-by-rss`        | `parsePlaybackSeconds(resourceData.playback_position) ?? 0`                                                                                                                                                                                                              | `true`         | `undefined`                   | `true`               | `false` (no server-side stat track for add-by-RSS) |
| `livestream`        | `0` (live streams are not seekable)                                                                                                                                                                                                                                      | `true`         | `undefined`                   | `true`               | `true`                   |

Notes:

- `resumeSeekFromAbridged` already applies the 5-second near-end clamp
  via `clampNearEndSeconds`.
- `shouldRecordPlaybackStat = false` for `session_restore` matches the
  legacy behavior: the snapshot resume is not a "fresh play" event.
- `shouldClearAutoQueue = false` for music `session_restore` and
  `fresh_transition` matches the legacy behavior: the autoQueue
  represents the user's queue intention and survives auto-transitions.
- The `pauseAtSeconds` field absorbs the responsibility of the legacy
  `EVENTS.MEDIA_PLAYER.PAUSE_AT` event — the policy decides whether a
  pause is needed; the bridge enforces it.

### Unit tests

`apps/web/src/lib/playback/__tests__/resolvePlaybackLoadDecision.test.ts`

- One test per matrix row above (~13 cases).
- Music intent: explicit `session_restore` with abridged `p` near `d`
  → seek 0 (clamp).
- Music intent: explicit `session_restore` with abridged `p` mid-track
  → seek `p`, `shouldRecordPlaybackStat: false`.
- Music intent: an unrecognized intent string in a typed escape hatch
  (`as never`) → behaves as `fresh_transition` (safe-default check).
- Add-by-RSS with `playback_position: '120.5'` (string) → seek `120.5`.
- Add-by-RSS with `playback_position: 'NaN'` → seek `0`.
- Clip with no `start_time` → seek 0; with `end_time: 30` → pause at 31.
- Soundbite with `start: 10`, `duration: 20` → seek 10, pause at 31.
- Livestream → seek 0 regardless of explicit override.

## 2. New `MediaPlayer` context shape

### Add (3a, no removals)

```typescript
type MediaPlayerContextValueAdditions = {
  /** The current load request being applied. The bridge consumes this
   *  to drive `<MediaElement>` re-keying and seek/play behavior. */
  activePlaybackTarget: PlaybackTarget | null;
  setActivePlaybackTarget: (target: PlaybackTarget | null) => void;

  /** The decision the bridge enacts after `loadedmetadata`. Set by
   *  callers via `applyPlaybackLoadDecision` (below). */
  pendingPlaybackDecision: PlaybackLoadDecision | null;

  /** Single-call helper: resolves the decision and atomically sets
   *  `activePlaybackTarget` + `pendingPlaybackDecision`. The bridge
   *  reads both in the same render. */
  applyPlaybackLoad: (
    request: PlaybackLoadRequest,
  ) => PlaybackLoadDecision;
};
```

There is **no** `pendingPlaybackLoadRef`. The `pendingPlaybackDecision`
is React state, set synchronously together with `activePlaybackTarget`,
consumed by the bridge in the same render cycle. The bridge clears
`pendingPlaybackDecision` (sets it to `null`) once it has applied the
seek + play and (where relevant) the `pauseAtSeconds` arming.

### Removals deferred to 3b

The legacy fields stay alive in 3a so the existing controller still
works:

- `musicItemPlaybackIntentRef`
- `pendingMusicQueueLoadIntentRef`
- `musicSessionRestoreSeekSecondsRef`
- `mpAddByRSSPlaybackSeconds` (resume-seek state)

All four are removed in 3b once their last consumer migrates.

## 3. New `useQueueResourcesLoadActive` return shape

### Current shape (legacy, side-effect-only)

```typescript
function useQueueResourcesLoadActive(): {
  loadActive: (queueId: string, currentItemKey: string) =>
    Promise<{ historyMoved: number; upcomingCount: number }>;
};
```

The hook calls `setActiveQueueUpcomingResources(...)` internally and
returns counts. The controller subscribes to context state and reacts
asynchronously — that gap is what motivated the legacy
`pendingPlaybackLoadRef` workaround.

### New shape

```typescript
type LoadActiveResult = {
  historyMoved: number;
  upcomingResources: DTOQueueResource[];
  /** The item that should be loaded into the player as the active
   *  resource, or `null` if the queue is empty. */
  activeResource: DTOQueueResource | null;
};

function useQueueResourcesLoadActive(): {
  loadActive: (queueId: string, currentItemKey: string) =>
    Promise<LoadActiveResult>;
};
```

The hook still calls `setActiveQueueUpcomingResources(...)` so the
queue UI still updates, **and** returns the same data so the caller
can synchronously construct a `PlaybackLoadRequest` and call
`applyPlaybackLoad(...)` in the same async tick. No shared mutable ref
needed.

### Audit before shipping 3a

Before 3a is committed, run:

```bash
rg "setActiveQueueUpcomingResources|activeQueueUpcomingResources" apps/web/src
```

Confirm the only writer remains `useQueueResourcesLoadActive` and the
only reader remains `MediaPlayerController`. If a new reader has
appeared since the audit captured in this plan, append a row to
[`00-SUMMARY.md`](./00-SUMMARY.md) "Primary risks" and use the
contingency below.

### Contingency: scoped-token fallback

If discovery surfaces a reader we can't migrate inline (e.g. a parallel
queue UI subscribes to upcoming-resources state and races the load),
the fallback is a **scoped token** rather than restoring the global
ref:

```typescript
const token = Symbol('queue-load');
queueLoadResolver.set(token, request);
await loadActive(...);
const decision = queueLoadResolver.consume(token); // throws if missing
applyPlaybackLoad(decision);
```

`queueLoadResolver` is a small map keyed by token, owned by the hook.
Tokens scope the pending intent to a single async chain instead of a
global ref. This contingency is only adopted if discovery during 3a
demonstrates it is needed.

## 4. Exports

`apps/web/src/lib/playback/index.ts` exports:

- `PlaybackTarget`, `MusicItemPlaybackIntent`, `PlaybackLoadRequest`
  (already from Phase 2)
- `PlaybackLoadDecision`, `PlaybackLoadDecisionReason`
- `resolvePlaybackLoadDecision`
- The composing helpers from Phase 2

## Out of scope

- Migrating any caller to the new context fields (3b).
- Deleting the legacy `*Ref` fields (3b).
- Deleting `musicItemPlaybackIntent.ts` or
  `musicSessionRestoreCurrentTime.ts` (3b).
- Touching the bridge or any controller (Phase 4).

## Exit criteria

- `resolvePlaybackLoadDecision.test.ts` covers every matrix row from
  Phase 1.
- `MediaPlayer` context exports both legacy and new fields and
  compiles with strict TypeScript.
- `useQueueResourcesLoadActive` returns the new shape; existing
  callers continue to work because the side-effect path is unchanged.
- No production code path calls `applyPlaybackLoad` yet (verified by
  ripgrep).
- `npm run lint -w apps/web` passes.
- `npm run test:unit -w apps/web` passes.

## Verification commands

```bash
npm run lint -w apps/web
npm run test:unit -w apps/web
```
