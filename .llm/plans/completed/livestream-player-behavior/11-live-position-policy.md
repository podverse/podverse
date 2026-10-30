**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 11 — Shared live position policy and the web/mobile livestream contract

## Rows

R20, R21, R29

## Runs after

10

## Goal

Pure helpers that web (area E) and mobile (area G) both call for a playing livestream:

- what the player shows instead of a duration, and what the left-hand time shows;
- whether the stream offers rewind, and where a seek inside it may land;
- what pressing play after a pause does;
- what pressing the Live control does.

Plus one written contract in `packages/playback-core/PACKAGES-PLAYBACK-CORE.md` that records the
rewind answers (R20, R21) and what web and mobile do the same or differently (R29).

The helpers take numbers the surface reads from its player. They never read a DOM element, a
native player, or a DTO.

## Files

packages/playback-core/src/livePlayback.ts
packages/playback-core/src/__tests__/livePlayback.test.ts
packages/playback-core/src/index.ts
packages/playback-core/package.json
packages/playback-core/PACKAGES-PLAYBACK-CORE.md

## Change 1 — `packages/playback-core/src/livePlayback.ts`

Write this module. Names, inputs, and return shapes are the contract areas C, E, and G build on;
do not rename them.

### Constants

```typescript
/** Behind the live edge by this many seconds or fewer still counts as live. */
export const LIVE_EDGE_TOLERANCE_SECONDS = 10;

/** A window shorter than this offers no rewind: less than two 15-second skip-backs. */
export const LIVE_MIN_REWIND_WINDOW_SECONDS = 30;

/**
 * Seeks and resumes stay this far inside the window start, because the start moves forward
 * while the player is paused or seeking. One recommended HLS segment.
 */
export const LIVE_WINDOW_START_MARGIN_SECONDS = 6;
```

### Window type

```typescript
/**
 * The part of a live stream the player still holds, in seconds on the player's own media
 * timeline. Sample it at the same moment as the position it is compared with.
 *
 * - `startSeconds`: the earliest position the stream still holds (start of the last seekable
 *   range).
 * - `liveEdgeSeconds`: the position the platform's own go-to-live seek lands on.
 *
 * `null` when the stream holds no history (progressive delivery) or has not reported a window.
 */
export type LiveSeekWindow = {
  startSeconds: number;
  liveEdgeSeconds: number;
};

/** What the player does next. `seek` targets are on the same timeline as the window. */
export type LivePositionAction =
  | { action: 'resume-in-place' }
  | { action: 'seek'; seconds: number }
  | { action: 'reconnect' };
```

### Functions

Write each with a one-line doc comment that states its rule.

```typescript
export function isRewindableLiveWindow(window: LiveSeekWindow | null): window is LiveSeekWindow;
```

True when `window !== null` and `window.liveEdgeSeconds - window.startSeconds >=
LIVE_MIN_REWIND_WINDOW_SECONDS`.

```typescript
export function getBehindLiveSeconds(params: {
  positionSeconds: number | null;
  window: LiveSeekWindow | null;
}): number;
```

`0` when `window` or `positionSeconds` is null, or either value is not finite. Otherwise
`Math.max(0, Math.floor(window.liveEdgeSeconds - positionSeconds))`. This is the raw distance;
the tolerance is applied in the display.

```typescript
/** Left-hand time while behind live: a minus sign (U+2212) and the playback clock, `−0:42`. */
export function formatBehindLiveLabel(behindSeconds: number): string;
```

Returns `` `\u2212${formatHHMMSS(behindSeconds)}` `` using `formatHHMMSS` from
`@podverse/helpers` (**playback-timestamp-format**). Write the code point as the `\u2212` escape
in source, not a literal character, so it cannot be mistaken for a hyphen.

```typescript
export type LivePlaybackDisplay = {
  /** Within LIVE_EDGE_TOLERANCE_SECONDS of the live edge, or no window to measure against. */
  isAtLiveEdge: boolean;
  /** 0 at the live edge; otherwise whole seconds behind it. */
  behindLiveSeconds: number;
  /** Left-hand text: null at the live edge, `formatBehindLiveLabel(...)` when behind. */
  behindLiveLabel: string | null;
  /** The window is rewindable: show the scrubber and skip buttons. */
  canRewind: boolean;
  /** Scrubber position 0..1 across [startSeconds, liveEdgeSeconds]; null unless canRewind. */
  windowFraction: number | null;
};

export function resolveLivePlaybackDisplay(params: {
  positionSeconds: number | null;
  window: LiveSeekWindow | null;
}): LivePlaybackDisplay;
```

Rules, in order:

1. `raw = getBehindLiveSeconds(params)`.
1. `isAtLiveEdge = raw <= LIVE_EDGE_TOLERANCE_SECONDS`.
1. `behindLiveSeconds = isAtLiveEdge ? 0 : raw`.
1. `behindLiveLabel = isAtLiveEdge ? null : formatBehindLiveLabel(raw)`.
1. `canRewind = isRewindableLiveWindow(params.window)`.
1. `windowFraction`: null unless `canRewind` and `positionSeconds` is a finite number. When
   `isAtLiveEdge`, exactly `1`. Otherwise
   `(positionSeconds - startSeconds) / (liveEdgeSeconds - startSeconds)` clamped to `[0, 1]`.

The display never carries a duration. There is no duration field to fill.

```typescript
/** Clamp a live seek target into [startSeconds + margin, liveEdgeSeconds]. */
export function clampLiveSeekSeconds(window: LiveSeekWindow, targetSeconds: number): number;
```

`low = window.startSeconds + LIVE_WINDOW_START_MARGIN_SECONDS`. When `low >=
window.liveEdgeSeconds`, return `window.liveEdgeSeconds`. Otherwise return `targetSeconds`
clamped to `[low, window.liveEdgeSeconds]`. Callers use it for skip back, skip forward, and the
scrubber.

```typescript
/** The seek target for a scrubber fraction 0..1 across the window, clamped. */
export function liveSeekSecondsAtFraction(window: LiveSeekWindow, fraction: number): number;
```

`f` = `fraction` clamped to `[0, 1]`. Return
`clampLiveSeekSeconds(window, window.startSeconds + f * (window.liveEdgeSeconds - window.startSeconds))`.

```typescript
/** Pressing play on a paused livestream. */
export function resolveLiveResume(params: {
  positionSeconds: number | null;
  window: LiveSeekWindow | null;
}): LivePositionAction;
```

Both values are sampled at the moment play is pressed (the player still reports the paused
position). Rules, in order:

1. `window` null → `{ action: 'reconnect' }`. A progressive stream holds nothing from before the
   pause.
1. `positionSeconds` null or not finite → `{ action: 'seek', seconds: window.liveEdgeSeconds }`.
1. `positionSeconds >= window.startSeconds + LIVE_WINDOW_START_MARGIN_SECONDS` →
   `{ action: 'resume-in-place' }`. The stream still holds the paused moment.
1. Otherwise → `{ action: 'seek', seconds: window.liveEdgeSeconds }`.

This applies to every window, including one too short to be rewindable: a short pause on a short
window still resumes in place.

```typescript
/** Pressing the Live control. */
export function resolveGoToLive(
  window: LiveSeekWindow | null
): Extract<LivePositionAction, { action: 'seek' } | { action: 'reconnect' }>;
```

`window` null → `{ action: 'reconnect' }`; otherwise
`{ action: 'seek', seconds: window.liveEdgeSeconds }`. It never returns `resume-in-place`, so
pressing Live always reaches the live moment, including when the player already shows it.

### Imports and style

- `import { formatHHMMSS } from '@podverse/helpers';` (value import). No other dependency.
- No `as` assertions; use the type guard above for narrowing.
- Strict equality only.

## Change 2 — exports

- `packages/playback-core/src/index.ts`: add one `export { … } from './livePlayback.js';` block
  in the file's existing multi-line style, after the `restoredLivestream.js` block from plan 10.
  Export every constant, function, and type above: `LIVE_EDGE_TOLERANCE_SECONDS`,
  `LIVE_MIN_REWIND_WINDOW_SECONDS`, `LIVE_WINDOW_START_MARGIN_SECONDS`, `clampLiveSeekSeconds`,
  `formatBehindLiveLabel`, `getBehindLiveSeconds`, `isRewindableLiveWindow`,
  `liveSeekSecondsAtFraction`, `resolveGoToLive`, `resolveLivePlaybackDisplay`,
  `resolveLiveResume`, `type LivePlaybackDisplay`, `type LivePositionAction`,
  `type LiveSeekWindow`.
- `packages/playback-core/package.json` `exports`: add `"./livePlayback"` with `types`
  `./dist/livePlayback.d.ts` and `default` `./dist/livePlayback.js`, after the
  `"./restoredLivestream"` entry plan 10 adds.

## Change 3 — `PACKAGES-PLAYBACK-CORE.md` § Livestreams

In `packages/playback-core/PACKAGES-PLAYBACK-CORE.md`, add `restoredLivestream` and
`livePlayback` to "What lives here" (one bullet each), then add a `## Livestreams` section before
`## What does not live here`. Write it as present-tense contract prose (no plan numbers, no row
numbers, no "new"; **comments-future-forward** applies to docs that describe code). Use these
subsections and content.

### Restoring a now-playing livestream

- On app or page load, and when adopting now-playing from another device, a livestream's fate
  comes from `resolveRestoredLivestream` with a status read fresh from the server on that load.
  The stored copy on the device, and any placeholder built from player metadata, is never the
  status.
- Ended, or the item no longer exists: treat it like a finished item. Move it to history, then
  load the next queue item paused, or leave the player empty when the queue is empty.
- Live, scheduled, no longer a live item, or no answer from the server: keep it. A stream that
  is really live is never hidden, so no start-time or end-time guess is made. With no answer,
  the device loads the copy it stored (the snapshot or the queue row).
- A 404 retires the item whether or not the device knew it was a livestream.
- Only the device whose session is active writes History for an ended queue head. Another device
  loads nothing for it and shows no handoff prompt for it; the owning device retires it.
- Signed-in queue reads already omit items whose feed dropped them.

### Time and controls

- A livestream has no duration. The right-hand slot is the Live control, labeled with the
  `media.livestream.live` catalog key on both surfaces. A duration from an earlier item never
  carries into a livestream, and no item carries a duration from the item before it.
- The left-hand time is empty at the live edge, and `−0:42` style (`formatBehindLiveLabel`)
  when behind it. Within `LIVE_EDGE_TOLERANCE_SECONDS` counts as live.
- Pressing Live goes to the live moment (`resolveGoToLive`) and plays: a seek to the live edge
  when the stream holds a window, a reconnect of the stream when it does not.
- Pressing play after a pause (`resolveLiveResume`) resumes where it paused when the stream still
  holds that moment, and goes to live otherwise. A progressive stream always reconnects.
- The scrubber and skip buttons appear only when the window is rewindable
  (`isRewindableLiveWindow`, at least `LIVE_MIN_REWIND_WINDOW_SECONDS`). Every seek goes through
  `clampLiveSeekSeconds` or `liveSeekSecondsAtFraction`.

### Where the window comes from

State the rule, then the per-surface sources as guidance:

- The window is the player's seekable range for HLS and DASH delivery only. Progressive delivery
  (Icecast, Shoutcast, any plain audio or video URL) always passes `null`, whatever the element
  or native player reports, because a browser can report a buffered range as seekable for a
  progressive stream.
- `liveEdgeSeconds` is where the platform's own go-to-live seek lands, not the raw end of the
  seekable range, so that being at live reads as live. Web with `hls.js`: `hls.liveSyncPosition`.
  Web with native HLS: the end of the last `seekable` range minus the distance from that end
  measured when playback last joined live. Mobile: the values the native media engine reports.
- Position and window are sampled together, on one timeline.

### Rewinding a livestream

Record the accepted answer:

- Rewind is a property of the stream, not the feed. HLS (an `EVENT` playlist, or a sliding
  window of segments) and DASH (a time-shift buffer) keep past segments addressable, and the
  browser and native players report that as the seekable range. The common interface is a
  scrubber over that range plus a Live control that jumps to the live edge.
- HLS is not the only way; DASH does the same. Progressive Icecast and Shoutcast streams hold no
  history, so they are live-only, and Podverse keeps no buffer of its own for them.
- The podcast namespace has no tag for a rewind window and none is needed: the window is read
  from the player at runtime. A platform plays DASH only where its player supports it.

### Web and mobile

Same on both: everything above. Differences, each intended:

- Window source: web reads the media element and `hls.js`; mobile reads the native media engine.
- Where the resume rule runs: web calls `resolveLiveResume`; mobile applies the same rule inside
  the native engine's `play()`, with the same `LIVE_WINDOW_START_MARGIN_SECONDS` margin.
- Cross-device: a device showing a livestream playing on another device shows the Live label
  only. Remote commands for a live item stay `PLAYBACK_COMMANDS_ALLOWED_FOR_LIVE` (play, pause,
  next, previous, play item, take over); there is no remote rewind or remote go-to-live. This is
  the same on web and mobile.

Leave `## References` unchanged; it already links the web decision matrix.

## Tests

New `packages/playback-core/src/__tests__/livePlayback.test.ts` (vitest, same style as
`resolvePlaybackLoadDecision.test.ts`). Use `const window = { startSeconds: 100, liveEdgeSeconds:
400 }` (300-second window) unless a case says otherwise.

- `isRewindableLiveWindow`: null → false; window of 29 s → false; exactly 30 s → true.
- `getBehindLiveSeconds`: null window → 0; null position → 0; `NaN` position → 0; position 358.4
  → 41 (floor); position past the edge (410) → 0.
- `formatBehindLiveLabel(42)` → `'\u22120:42'`; `formatBehindLiveLabel(3725)` →
  `'\u22121:02:05'`.
- `resolveLivePlaybackDisplay`:
  - position 395 → at edge, behind 0, label null, canRewind true, fraction 1.
  - position 390 (exactly 10 behind) → at edge.
  - position 358 (42 behind) → not at edge, behind 42, label `'\u22120:42'`, fraction
    `(358 - 100) / 300`.
  - null window (progressive) → at edge, behind 0, label null, canRewind false, fraction null.
  - short window `{ startSeconds: 0, liveEdgeSeconds: 20 }`, position 5 → not at edge, behind
    15, label `'\u22120:15'`, canRewind false, fraction null.
- `clampLiveSeekSeconds`: 50 → 106; 250 → 250; 500 → 400; window `{ 0, 4 }` with any target → 4.
- `liveSeekSecondsAtFraction`: 0 → 106; 0.5 → 250; 1 → 400; -1 → 106; 2 → 400.
- `resolveLiveResume`:
  - null window → reconnect.
  - position 200 → resume-in-place.
  - position 106 (exactly start + margin) → resume-in-place.
  - position 105 → seek 400.
  - null position → seek 400.
  - short window `{ 0, 20 }`, position 10 → resume-in-place.
- `resolveGoToLive`: null → reconnect; window → seek 400.

## Release scratchpad

none
