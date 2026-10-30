**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 50 — Web: every load sets the duration, and live items never take a stale one

## Rows

R12

## Runs after

none

## Files

apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx
apps/web/src/hooks/__tests__/useMediaPlayerResourceUpdate.duration.test.tsx
apps/web/src/hooks/usePlayAddByRSS.tsx
apps/web/src/hooks/__tests__/usePlayAddByRSS.test.tsx
apps/web/src/components/MediaPlayer/Controller/NonLiveMediaOrchestrator.tsx
apps/web/src/components/MediaPlayer/Controller/__tests__/NonLiveMediaOrchestrator.live.test.tsx
release-notes/scratchpad.md

## Goal

`mpDuration` is right for the item that is loaded, on every load, live or not. A live resource
always has `mpDuration === 0`. Plan 52 shows the word Live in the duration slot for live
resources; this plan makes sure no earlier episode's duration is left behind underneath it, and
that a non-live item shows its own duration (or nothing) before its metadata loads.

## What the code does today

- `mpDuration` (`apps/web/src/contexts/MediaPlayer.tsx`, state default `0`) is set in only two
  places: `NonLiveMediaOrchestrator.tsx` `onLoadedMetadata` (two `setMPDuration(newDuration)` calls,
  the staged-decision path and the non-staged path) and `usePlayAddByRSS.tsx`
  (`setMPDuration(duration)` after `const duration = typeof resourceData.duration === 'number' ?
  resourceData.duration : 0;`).
- `useMediaPlayerResourceUpdate.tsx` (the main load path for every database item, clip,
  soundbite, chapter, and livestream) computes `finalDuration = hinted ?? rowDuration` but passes
  it only to `updateNowPlaying`. It never calls `setMPDuration`. A livestream never fires
  `loadedmetadata` on the non-live element, so the previous episode's duration stays on screen.
  A non-live item shows the previous duration until its own metadata loads.
- `NonLiveMediaOrchestrator.tsx` `elementSource` (a plain declaration near the end of the
  component, built from `addByRSSEnclosureUrl ?? selectedItemEnclosureAndSource?.source?.uri` through
  `toFileMediaElementSource`) has no live check. The queue-head effect in
  `useMediaPlayerControllerQueueHeadLoading.ts` rebuilds labeled enclosures for every item,
  live included, so a database live item can hand its stream URL to the hidden non-live element.
  When the enclosure type is empty and the URL is not HLS, the surface effect returns early,
  the element loads the stream, `onLoadedMetadata` runs, consumes the staged decision, seeks, and
  sets the duration to `NaN` or a byte-derived number.
- `buildAddByRSSResourceData` (`packages/parser-mapping/src/addByRSS/queuePlaylistHelpers.ts`)
  copies the enclosure `length` into `duration` for livestream index items too. RSS enclosure
  `length` is a byte count, so an Add by RSS livestream gets a byte count as its duration.

## Liveness test

Use the existing helpers: `checkIsLiveItem(item)` for a database item, and
`isPlayerResourceLive({ mpItem, mpAddByRSS })` from
`apps/web/src/lib/crossDevicePlayback/playbackResource.ts` where player state is at hand (it checks
`checkIsLiveItem(mpItem)` and `mpAddByRSS.resourceData.liveItem`). Do not add a third liveness
helper. Key on the item, not only the target kind: area D's restore path can load a live item through an `item-podcast` target, and a
queue load does the same through `playbackTargetFromStandardLoad`.

## Change 1 — `useMediaPlayerResourceUpdate.tsx` sets the duration on every local load

- Take `setMPDuration` from `useMediaPlayer()` next to the setters the hook already uses.
- Add a module-level helper next to `durationHintSecondsForTarget`, in the same `switch` shape:

  ```typescript
  function isLiveTarget(target: PlaybackTarget): boolean {
    switch (target.kind) {
      case 'livestream':
        return true;
      case 'add-by-rss':
        return false;
      default:
        return checkIsLiveItem(target.item);
    }
  }
  ```

  Every member except `add-by-rss` carries `item` (`applyTargetToMediaPlayerState` calls
  `setMPItem(target.item)` for each). Add by RSS loads take their duration from `usePlayAddByRSS`
  (Change 2).
- At the end of the returned load function, the block reads today:
  `const decision = applyPlaybackLoad(coreRequest); setMPCurrentTime(decision.initialSeekSeconds);
  const rowDuration = …; const hintedDuration = …; const finalDuration = …;` then
  `updateNowPlaying({ …, mpDuration: finalDuration, mpCurrentTime: decision.initialSeekSeconds })`.
  Change it to:
  - `const isLiveLoad = isLiveTarget(target);`
  - Compute `finalDuration` as today, then
    `const loadedDuration = isLiveLoad ? 0 : finalDuration;` and
    `const loadedPosition = isLiveLoad ? 0 : decision.initialSeekSeconds;`
  - `setMPCurrentTime(loadedPosition); setMPDuration(loadedDuration);`
  - `updateNowPlaying` gets `mpDuration: loadedDuration` and `mpCurrentTime: loadedPosition`.
  - Return `decision` unchanged.
  `finalDuration` falls back to `0` when there is no hint and no row duration; keep that. A live
  item has no saved position (plan 11) and its duration is not a number of seconds.
- The remote branch (send a command, do not touch local state) is unchanged.
- `checkIsLiveItem` comes from `apps/web/src/utils/mediaPlayer/mediaPlayerItemEnclosureType`
  (already used in this area).

`onLoadedMetadata` still sets the real duration once the element knows it, so a non-live item
moves from its hint to the element's value as it does today.

## Change 2 — `usePlayAddByRSS.tsx` treats an Add by RSS livestream as live

- Right after `const idText = indexItem.idText ?? '';` (the local branch, after the remote early
  return), add
  `const isLive = isPlayerResourceLive({ mpItem: null, mpAddByRSS: { idText, resourceData } });`
  and `const startPosition = isLive ? 0 : playbackPosition;`.
- Replace `const duration = typeof resourceData.duration === 'number' ? resourceData.duration : 0;`
  with a version that is `0` when `isLive` (two plain statements if a nested ternary trips lint).
- From there down, read `startPosition` wherever the local branch reads `playbackPosition` today:
  `hasProvidedPosition`, both `syncPlaybackPolicy` calls, `resolvedPosition`'s initial value, and
  the `typeof playbackPosition !== 'number'` guard on the stored-position lookup. A live resource
  then always starts at `0` and never runs the queue / upcoming / history lookup.
- The remote branch above (`resolveRemotePickCommand`) and everything else (enclosures,
  cross-device publish, list context) is unchanged.

## Change 3 — `NonLiveMediaOrchestrator.tsx` leaves live items alone

Two edits. Both use `isPlayerResourceLive` / `checkIsLiveItem` as named.

1. `const elementSource: MediaElementSource | null = sourceUri !== undefined ? … : null;` (a plain
   declaration after the `addByRSSEnclosureUrl` / `sourceUri` / `sourceMime` block near the end of
   the component): add `&& !checkIsLiveItem(mpItem)` to its condition. Database live items are
   played only by `MediaPlayerControllerLiveStreamAV`. Add by RSS livestreams have
   `mpItem === null` and keep their source here; plan 51 builds on that.
2. `onLoadedMetadata(newDuration)`: before `takeCommandStartSeek` and the staged-decision branch,
   add a live branch:

   ```typescript
   if (isPlayerResourceLive({ mpItem: mpItemRef.current, mpAddByRSS: mpAddByRSSRef.current })) {
     bridgeRef.current?.pauseAt(-1);
     setMPDuration(0);
     if (mpShouldPlayRef.current === true) {
       updateNowPlaying({
         mpChannel: mpChannelRef.current,
         mpClip: mpClipRef.current,
         mpItem: mpItemRef.current,
         mpItemSoundbite: mpItemSoundbiteRef.current,
         mpDuration: 0,
         mpCurrentTime: 0,
         eventKind: 'play',
       });
     }
     setPendingPlaybackDecision?.(null);
     loadListenSession('none', 0);
     return;
   }
   ```

   Place it right after the `onVideoAspectRatioChangeRef` call and before
   `const commandStartSeconds = takeCommandStartSeek(…)`. All names above exist in the component
   (`mpItemRef`, `mpAddByRSSRef`, `bridgeRef`, `mpShouldPlayRef`, the optional
   `setPendingPlaybackDecision` prop, `loadListenSession`). `pauseAt(-1)` clears any pause point a
   clip left. No seek runs: a live element starts where the stream puts it, and plan 51 owns
   every later live position change.

Do not change the surface effect's early return or the play effect's `checkIsLiveItem` skip; with
`elementSource` null for database live items they no longer see a live source.

## Comments

Keep comments future-forward (**comments-future-forward**). One short comment above the
`elementSource` live check is enough: database live items play only in the live controller.

## Tests

Vitest, apps/web. Follow the harness of the neighbouring test file named in each bullet.

- New `apps/web/src/hooks/__tests__/useMediaPlayerResourceUpdate.duration.test.tsx`, built on the
  mocks in `useMediaPlayerResourceUpdate.nearEndClamp.test.tsx` plus a `setMPDuration` spy in the
  `useMediaPlayer` mock:
  - An `item-podcast` load whose abridged index row has a duration sets `mpDuration` to that value,
    even when the previous `mpDuration` was a different number.
  - A `livestream` target load sets `mpDuration` to `0` and `mpCurrentTime` to `0`.
  - An `item-podcast` target whose item has `live_item` set sets `mpDuration` to `0`.
  - A load with no hint and no row duration sets `mpDuration` to `0`.
- `apps/web/src/hooks/__tests__/usePlayAddByRSS.test.tsx`, add: an Add by RSS livestream
  (`resourceData.liveItem` is an object, `resourceData.duration` is a large byte count, a provided
  position of `120`) calls `setMPDuration(0)` and starts at position `0` without the stored-position
  lookup.
- New `apps/web/src/components/MediaPlayer/Controller/__tests__/NonLiveMediaOrchestrator.live.test.tsx`,
  built on `NonLiveMediaOrchestrator.seekPolicy.test.tsx`:
  - A database live item with a labeled enclosure renders the non-live `<audio>` without a `src`.
  - An Add by RSS livestream with a staged decision whose initial seek is `30`: dispatching
    `loadedmetadata` with a duration of `42` calls `setMPDuration(0)`, leaves `currentTime`
    unchanged, and clears the staged decision.

## Release scratchpad

```markdown
## The player no longer shows the last episode's duration

- Surfaces: web
- Change: Every load into the web player now sets the duration right away from the item (or
  clears it), instead of waiting for the media to load. A livestream always has no numeric
  duration, so starting one after an episode no longer leaves the episode's length on screen.
  Add by RSS livestreams no longer take the enclosure's byte length as a duration, and never
  resume from a stored position. The hidden episode player no longer loads a database livestream's
  URL.
- Who notices: web listeners who switch from an episode to a livestream, or between episodes
- Operator steps: none
```
