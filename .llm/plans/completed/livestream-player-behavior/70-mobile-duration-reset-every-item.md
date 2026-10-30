**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 70 — Mobile: no item shows the previous item's duration, and a livestream never has one

## Rows

R13

## Runs after

none

## Files

apps/mobile/src/lib/playback/mediaFileDurationHint.ts
apps/mobile/src/lib/playback/mediaFileDurationHint.test.ts
apps/mobile/src/playback/PlaybackProvider.tsx

## What is wrong today

The mobile player keeps one duration in `durationRef` (`PlaybackProvider.tsx`) and in
`playbackProgressStore.ts`. Every path that loads an item must replace it. Three paths do not:

1. **A load that fails.** `playTarget` (the `const playTarget = useCallback(` block) sets the new
   target and summary in its `catch` branch (`activeTargetRef.current = target; setActiveTarget(target);
   setNowPlaying(params.summary);`) but never touches the duration or position. The full player then
   shows the new item's title with the previous item's duration and position, and
   `retryPlayback` reloads the new URL at the previous item's `positionRef`.
2. **A native sample for a livestream.** The `progress` handler inside
   `useNativePlaybackBridge({` writes `event.durationSeconds` whenever it is above 0, and never
   writes 0. Android reports the seekable window's length as a live HLS duration, so a livestream
   picks up a growing "duration". Plan 30 normalizes live progress to 0 at the bridge, but the
   provider must not depend on that alone: a live target never takes a duration.
3. **`reconcileFromNative`** (heal after `ready` / `playing`) writes `getDuration()` when above 0,
   with the same live gap as (2).

The success path of `playTarget` already replaces the duration with the load hint or 0, and
`adoptEngineSource` replaces it with the engine's value. Keep both; route them through the same
helper so a live target always lands on 0.

The old duration stays on screen while `await applyLoad(...)` runs. That is intended: the old
title is also still on screen until the load resolves, and both change together in one render.

## Change 1 — two pure helpers (`mediaFileDurationHint.ts`)

Append to `apps/mobile/src/lib/playback/mediaFileDurationHint.ts`, after
`resolveMediaFileDurationHintSeconds`:

```typescript
/**
 * Duration the player shows when an item loads: the item's hint, or 0 when there is none. A
 * livestream has no duration, so it is always 0. Every load replaces the previous item's value.
 */
export const resolveLoadDurationSeconds = (params: {
  isLive: boolean;
  hintSeconds: number | undefined;
}): number => {
  if (params.isLive) {
    return 0;
  }
  const hint = params.hintSeconds;
  return hint !== undefined && Number.isFinite(hint) && hint > 0 ? hint : 0;
};

/**
 * Duration a native sample sets. `null` keeps the stored value (the engine does not know the
 * length yet). A livestream is always 0, whatever the engine reports.
 */
export const resolveSampleDurationSeconds = (params: {
  isLive: boolean;
  sampleSeconds: number;
}): number | null => {
  if (params.isLive) {
    return 0;
  }
  return Number.isFinite(params.sampleSeconds) && params.sampleSeconds > 0
    ? params.sampleSeconds
    : null;
};
```

Edit the doc comment of `resolveMediaFileDurationHintSeconds`: replace its last sentence
("Native progress with `durationSeconds > 0` still overwrites the store.") with "A native sample
with a known length still overwrites the store; a livestream never takes one."

## Change 2 — `PlaybackProvider.tsx`

`isLivePlaybackTarget` is already imported (from `./crossDevice/crossDevicePlaybackPolicy`).
Replace the single-name import
`import { resolveMediaFileDurationHintSeconds } from '../lib/playback/mediaFileDurationHint';`
with a multi-line import of `resolveLoadDurationSeconds`, `resolveMediaFileDurationHintSeconds`,
and `resolveSampleDurationSeconds` (alphabetical, the file's multi-line import style).

Edit only these anchors. Plan 61 edits `restoreFromSnapshot`, `adoptQueueHeadWhenPlayerEmpty`, and
the handoff-prompt `useEffect`; do not touch them.

### 2a — `playTarget` success path

Replace

```typescript
      durationRef.current =
        params.mediaFileDurationHintSeconds !== undefined ? params.mediaFileDurationHintSeconds : 0;
```

with

```typescript
      durationRef.current = resolveLoadDurationSeconds({
        isLive: isLivePlaybackTarget(target),
        hintSeconds: params.mediaFileDurationHintSeconds,
      });
```

The `setPlaybackProgress({ durationSeconds: durationRef.current, … })` call below it stays.

### 2b — `playTarget` catch branch

In the `catch (error) {` branch after `await applyLoad(`, immediately before
`activeTargetRef.current = target;`, add:

```typescript
        const failedStartSeconds =
          params.explicitPlaybackSeconds !== undefined && !isLivePlaybackTarget(target)
            ? params.explicitPlaybackSeconds
            : 0;
        positionRef.current = failedStartSeconds;
        durationRef.current = resolveLoadDurationSeconds({
          isLive: isLivePlaybackTarget(target),
          hintSeconds: params.mediaFileDurationHintSeconds,
        });
        clearSeekHold();
        setPlaybackProgress({
          durationSeconds: durationRef.current,
          positionSeconds: failedStartSeconds,
        });
```

`clearSeekHold` is already in this callback's dependency list; `setPlaybackProgress` is a module
import. No new dependencies.

### 2c — `adoptEngineSource`

After `const { builtFromMeta, channel, item, summary, target } = adopted;`, add:

```typescript
      const adoptedDurationSeconds = resolveLoadDurationSeconds({
        isLive: isLivePlaybackTarget(target),
        hintSeconds: durationSeconds,
      });
```

Then use `adoptedDurationSeconds` in place of `durationSeconds` in exactly three places below it:
the `mediaDurationSeconds:` argument of `getListenSession().load({`, `durationRef.current = …`,
and `setPlaybackProgress({ durationSeconds, positionSeconds })` (write it as
`setPlaybackProgress({ durationSeconds: adoptedDurationSeconds, positionSeconds })`). Leave the
earlier `buildItemFromEngineMeta(meta, source.url, durationSeconds)` call unchanged.

### 2d — `progress` handler

In `progress: (event) => {`, replace

```typescript
      if (event.durationSeconds > 0) {
        durationRef.current = event.durationSeconds;
        setPlaybackDurationSeconds(event.durationSeconds);
      }
```

with

```typescript
      const loadedTarget = activeTargetRef.current;
      const sampleDurationSeconds = resolveSampleDurationSeconds({
        isLive: loadedTarget !== null && isLivePlaybackTarget(loadedTarget),
        sampleSeconds: event.durationSeconds,
      });
      if (sampleDurationSeconds !== null) {
        durationRef.current = sampleDurationSeconds;
        setPlaybackDurationSeconds(sampleDurationSeconds);
      }
```

Further down the same handler, `const activeTarget = activeTargetRef.current;` stays as it is (it
reads the same ref). Replace the later

```typescript
      if (event.durationSeconds > 0) {
        getListenSession().setMediaDuration(event.durationSeconds);
      }
```

with

```typescript
      if (sampleDurationSeconds !== null && sampleDurationSeconds > 0) {
        getListenSession().setMediaDuration(sampleDurationSeconds);
      }
```

### 2e — `reconcileFromNative`

Replace

```typescript
        if (Number.isFinite(duration) && duration > 0) {
          durationRef.current = duration;
          setPlaybackDurationSeconds(duration);
        }
```

with

```typescript
        const target = activeTargetRef.current;
        const healedDurationSeconds = resolveSampleDurationSeconds({
          isLive: target !== null && isLivePlaybackTarget(target),
          sampleSeconds: duration,
        });
        if (healedDurationSeconds !== null) {
          durationRef.current = healedDurationSeconds;
          setPlaybackDurationSeconds(healedDurationSeconds);
        }
```

`clearNowPlaying` already zeroes both refs and calls `resetPlaybackProgress()`; leave it.

## Reuse and parity

Web plan 50 makes every web load set the duration, live always 0. This plan is the mobile copy of
that rule. The shared statement of the rule is in plan 11's `PACKAGES-PLAYBACK-CORE.md`
§ Livestreams ("no item carries a duration from the item before it").

## Tests

Extend `apps/mobile/src/lib/playback/mediaFileDurationHint.test.ts` (Vitest, existing
`describe` style in that file):

- `resolveLoadDurationSeconds`: live with hint 3600 → 0; not live with hint 3600 → 3600; not live
  with no hint → 0; not live with hint 0, -5, or `NaN` → 0.
- `resolveSampleDurationSeconds`: live with sample 120 → 0; live with sample 0 → 0; not live with
  sample 120 → 120; not live with sample 0 → `null`; not live with `NaN` → `null`.

The provider wiring is held by plan 73's Maestro flow, which plays an episode, then a livestream,
and checks that the livestream shows no duration.

## Release scratchpad

```markdown
## Mobile player never shows the previous item's duration

- Surfaces: mobile
- Change: Loading a new item always replaces the full player's duration and position, including
  when the load fails (the error state now shows the new item at its own start, and Retry starts
  there instead of at the previous item's position). A livestream never takes a duration, even
  when the platform player reports its seekable window as one.
- Who notices: listeners who switch from an episode to a livestream or hit a load error on mobile
- Operator steps: none
```
