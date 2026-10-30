**Cursor model:** Opus 5.5 · **Reasoning:** extra high

# 51 — Web: one live position store for every live element

## Rows

R22, R25, R27

## Runs after

11, 50

## Files

apps/web/src/hooks/mediaElementBridgeSurface.ts
apps/web/src/hooks/__tests__/mediaElementBridgeSurface.test.ts
apps/web/src/lib/livePlayback/liveSeekWindow.ts
apps/web/src/lib/livePlayback/liveSeekWindow.test.ts
apps/web/src/lib/livePlayback/liveMediaStore.ts
apps/web/src/lib/livePlayback/liveMediaStore.test.ts
apps/web/src/hooks/useLiveMediaSnapshot.ts
apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerLiveStreamAV.tsx
apps/web/src/components/MediaPlayer/Controller/NonLiveMediaOrchestrator.tsx
release-notes/scratchpad.md

## Goal

Give the web player one place that knows, for the live element that is playing:

- the seekable window (`LiveSeekWindow` from plan 11) or `null`;
- where playback sits in it, as a `LivePlaybackDisplay` (plan 11);
- how to go to live, seek, skip, and resume after a pause.

This plan builds the store and wires both live hosts to it. It changes behavior in two places a
listener can notice: pressing Play on a paused livestream resumes in place or jumps to live
(R25), and on a progressive stream it reconnects (R27). Plan 52 builds the visible controls on
the store (Live control, behind-live time, scrubber, skip buttons). This plan adds no UI.

## Decisions this plan applies

- Rewind comes only from a window the stream reports. HLS with a window of at least
  `LIVE_MIN_REWIND_WINDOW_SECONDS` can rewind. Progressive delivery is always live-only: the
  window is `null` even though browsers report a `seekable` range for a progressive file. The
  player keeps no buffer of its own (R22).
- No DASH on web. The web player has no DASH engine and `classifyMediaSource` has no DASH
  delivery; a `.mpd` livestream is outside this work (area C made the same call on mobile).
- The live timeline never writes `mpCurrentTime` or `mpDuration`. Live position lives only in
  this store. `mpDuration` stays `0` for live resources (plan 50).
- Add by RSS livestreams keep playing on the non-live orchestrator (it owns the credential and
  blocked-host error handling) and register their element with the same store. Database
  livestreams play on `MediaPlayerControllerLiveStreamAV` and register there. One store, two hosts.
- An element that has not played yet reads as "at live" (position `null`). A livestream loaded
  paused (restore, cross-device adopt) then shows Live, not a behind time.
- The resume rule applies only after the element has played and then paused. A fresh element
  just starts.
- Reconnect on a progressive stream means a fresh connection: a new element for database
  livestreams, `bridge.reloadAt(0)` for Add by RSS.

## Change 1 — hls.js live sync position in `mediaElementBridgeSurface.ts`

`managedHlsPlayback` is a `WeakMap<HTMLMediaElement, { src; destroy }>` and `attachNonLiveHlsPlayback`
types the hls.js constructor locally (`HlsCtor`).

- Add `readonly liveSyncPosition: number | null;` to the local instance type of `HlsCtor` (hls.js
  1.x exposes `get liveSyncPosition(): number | null`).
- Add `liveSyncPosition: () => number | null` to the managed entry; set it to
  `() => hls.liveSyncPosition` where the entry is created. The native-HLS branch (sets `src`)
  creates no entry.
- Export `readManagedHlsLiveSyncPosition(media: HTMLMediaElement): number | null` — the entry's
  value when it is a finite number, else `null`.

## Change 2 — `apps/web/src/lib/livePlayback/liveSeekWindow.ts` (new, pure)

```typescript
import type { MediaSourceDelivery } from '@podverse/helpers';
import type { LiveSeekWindow } from '@podverse/playback-core';

export type SeekableRanges = Pick<TimeRanges, 'length' | 'start' | 'end'>;

/**
 * The live window an HTML media element holds, on its own timeline. Null for progressive
 * delivery and before the stream reports a seekable range.
 */
export function readLiveSeekWindow(params: {
  delivery: MediaSourceDelivery;
  seekable: SeekableRanges;
  liveSyncPositionSeconds: number | null;
  nativeJoinOffsetSeconds: number | null;
}): LiveSeekWindow | null;
```

Rules, in order:

1. `delivery !== 'hls'` → `null`.
1. `seekable.length === 0` → `null`.
1. `start = seekable.start(length - 1)`, `end = seekable.end(length - 1)`. Either not finite, or
   `end <= start` → `null`.
1. Live edge:
   - `liveSyncPositionSeconds` finite → `Math.min(liveSyncPositionSeconds, end)` (hls.js).
   - else → `end - (nativeJoinOffsetSeconds ?? 0)` (native HLS: the distance from the end of the
     seekable range that playback sat at when it first joined live).
   - then `Math.max(edge, start)`.
1. Return `{ startSeconds: start, liveEdgeSeconds: edge }`.

Import the playback-core names from the package root, as other web code imports playback-core.

## Change 3 — `apps/web/src/lib/livePlayback/liveMediaStore.ts` (new)

Follow the factory-plus-instance shape of `apps/web/src/lib/crossDevicePlayback/crossDevicePlaybackStore.ts`.

```typescript
export type LiveMediaRegistration = {
  media: HTMLMediaElement;
  delivery: MediaSourceDelivery;
  /** Drop the connection and start the stream again at live, playing. */
  reconnect: () => void;
};

export type LiveMediaSnapshot = {
  /** A live element is registered. */
  attached: boolean;
  display: LivePlaybackDisplay;
};

export type LiveResumeOutcome = 'play' | 'reconnecting';

export function createLiveMediaStore(options?: {
  readLiveSyncPosition?: (media: HTMLMediaElement) => number | null;
  setInterval?: (fn: () => void, ms: number) => number;
  clearInterval?: (id: number) => void;
}): LiveMediaStore;

export const liveMediaStore: LiveMediaStore = createLiveMediaStore();
```

`readLiveSyncPosition` defaults to `readManagedHlsLiveSyncPosition`; the interval functions default
to `window.setInterval` / `window.clearInterval`. Tests inject all three.

`LiveMediaStore` methods:

- `register(registration): () => void`
  - Replaces any current registration (unregister the old one first). One live element plays at a
    time.
  - Attaches listeners on `media`: `timeupdate`, `progress`, `durationchange`, `seeked`, `playing`,
    `pause`, `loadedmetadata`. Each calls `refresh()`. Also starts a 1-second interval that calls
    `refresh()` (the window moves while paused and `timeupdate` stops).
  - Native join offset: when `delivery === 'hls'` and `readLiveSyncPosition(media)` is `null`, the
    first `playing` event after registration records
    `max(0, seekable.end(last) - media.currentTime)` for this registration. Never updated after
    that; a reconnect is a new registration and measures again.
  - Returns an unregister function that removes the listeners, clears the interval, drops the
    registration only if it is still the current one, and notifies.
- `getSnapshot(): LiveMediaSnapshot` — the cached snapshot (stable object between changes, for
  `useSyncExternalStore`). Detached snapshot:
  `{ attached: false, display: resolveLivePlaybackDisplay({ positionSeconds: null, window: null }) }`.
- `subscribe(listener): () => void`.
- `refresh(): void` — reads the window (Change 2) and the position, builds
  `resolveLivePlaybackDisplay`, and notifies only when the snapshot changes. Position is `null`
  until `media.played.length > 0`, else `media.currentTime`. Equality compares `attached`,
  `isAtLiveEdge`, `behindLiveSeconds`, `behindLiveLabel`, `canRewind`, and `windowFraction`
  rounded to three decimals. Whole-second display values keep re-renders to about one per second.
- `readWindow(): LiveSeekWindow | null` — the current window, read fresh (no cache), or `null`
  when nothing is registered.
- `goToLive(): void` — no registration → return. `resolveGoToLive(readWindow())`: `seek` → set
  `media.currentTime`; `reconnect` → `registration.reconnect()`. Then `refresh()`. It does not
  change `mpIsPlaying`; callers do (plan 52).
- `seekTo(seconds: number): void` — only when `isRewindableLiveWindow(window)`; sets
  `media.currentTime = clampLiveSeekSeconds(window, seconds)`, then `refresh()`.
- `seekToFraction(fraction: number): void` — same guard; `liveSeekSecondsAtFraction`.
- `jumpBy(deltaSeconds: number): void` — same guard; `seekTo(media.currentTime + deltaSeconds)`.
- `prepareResume(media: HTMLMediaElement): LiveResumeOutcome` — the R25 / R27 rule, called by a
  host right before it calls `media.play()`:
  - `media` is not the registered element → `'play'` (non-live elements pass through untouched).
  - `media.played.length === 0` or `!media.paused` → `'play'`.
  - Otherwise `resolveLiveResume({ positionSeconds: media.currentTime, window: readWindow() })`:
    `resume-in-place` → `'play'`; `seek` → set `media.currentTime`, `'play'`; `reconnect` →
    `registration.reconnect()`, `'reconnecting'` (the caller must not call `play()`).

Every read of `seekable` and `played` sits in a `try` that treats a throw as "no window" /
"not played" (a detached element can throw in some browsers). Do not log those.

## Change 4 — `apps/web/src/hooks/useLiveMediaSnapshot.ts` (new)

```typescript
export function useLiveMediaSnapshot(): LiveMediaSnapshot {
  return useSyncExternalStore(
    liveMediaStore.subscribe,
    liveMediaStore.getSnapshot,
    liveMediaStore.getSnapshot
  );
}
```

No selector: the snapshot object is already stable between changes. `'use client'` is not needed
in a hook file unless the neighbours use it; match `hooks/useRemotePlayerDisplay.ts`.

## Change 5 — database livestreams register (`MediaPlayerControllerLiveStreamAV.tsx`)

- `MediaPlayerControllerLiveStreamAV` holds `const [connection, setConnection] = useState(0);`
  and keys the element `` `${source.delivery}:${source.src}:${connection}` ``. Pass
  `onReconnect={() => setConnection((n) => n + 1)}` to `LivestreamMediaElement` (wrap in
  `useCallback`). A new key mounts a fresh element, which is a fresh connection for both
  progressive and HLS (the HLS attach runs again on mount).
- `LivestreamMediaElement`:
  - Add a registration effect, declared **before** the existing `[playing]` effect so it runs
    first on mount:

    ```typescript
    useEffect(() => {
      const media = liveMediaRef.current;
      if (media === null) {
        return;
      }
      return liveMediaStore.register({
        media,
        delivery: source.delivery ?? 'file',
        reconnect: () => onReconnectRef.current(),
      });
    }, [source.delivery]);
    ```

    Add the `onReconnect: () => void` prop and keep it in a ref so the effect does not re-run:
    `const onReconnectRef = useRef(onReconnect); onReconnectRef.current = onReconnect;`.
  - In the `[playing]` effect, the start path (both the immediate `readyState >= HAVE_CURRENT_DATA`
    call and the `canplay` listener) becomes:

    ```typescript
    if (liveMediaStore.prepareResume(media) === 'reconnecting') {
      return;
    }
    void media.play().catch(/* existing notifyLocalPlayRejected handling */);
    ```

    The pause path is unchanged. A reconnect remounts the element while `playing` is still true,
    so the new element's own `[playing]` effect starts it.

## Change 6 — Add by RSS livestreams register (`NonLiveMediaOrchestrator.tsx`)

Runs after plan 50, which made `elementSource` null for database live items, so the only live
source left on this element is an Add by RSS livestream.

- Registration effect. `addByRSSEnclosureUrl` and `elementSource` are plain declarations near the
  end of the component, after the play effect, so place this effect directly after the
  `const elementSource … ;` line (before the video aspect-ratio effect):

  ```typescript
  const isAddByRSSLive = mpAddByRSS !== null && isPlayerResourceLive({ mpItem: null, mpAddByRSS });
  const elementDelivery = elementSource?.delivery ?? 'file';
  useEffect(() => {
    const media = mediaRef.current;
    if (!isAddByRSSLive || addByRSSEnclosureUrl === undefined || media === null) {
      return;
    }
    return liveMediaStore.register({
      media,
      delivery: elementDelivery,
      reconnect: () => {
        void bridgeRef.current?.reloadAt(0);
      },
    });
  }, [isAddByRSSLive, addByRSSEnclosureUrl, elementDelivery]);
  ```

  `mediaRef`, `bridgeRef`, `addByRSSEnclosureUrl`, and `elementSource` are the component's
  existing names. `bridge.reloadAt` reloads `src` (or re-attaches HLS) and plays; plan
  50's live branch in `onLoadedMetadata` keeps it from seeking.
- Play effect (the effect that awaits `waitForPlayableMediaSource` and calls `bridge.play()`):
  immediately before `await bridge.play()`, add

  ```typescript
  const media = mediaRef.current;
  if (media !== null && liveMediaStore.prepareResume(media) === 'reconnecting') {
    return;
  }
  ```

  For every non-live resource `prepareResume` returns `'play'` without reading anything, so
  episode playback is unchanged.

## Comments

Doc comments on the exported functions and types, stating rules (**comments-future-forward**).
No plan or row numbers in code.

## Tests

Vitest, apps/web.

- `apps/web/src/hooks/__tests__/mediaElementBridgeSurface.test.ts`, add: an element attached
  through the hls.js path (the file already fakes the hls.js import) reports the fake instance's
  `liveSyncPosition` through `readManagedHlsLiveSyncPosition`; a detached or native element
  reports `null`.
- New `apps/web/src/lib/livePlayback/liveSeekWindow.test.ts` with a small fake `TimeRanges`:
  progressive → `null`; empty ranges → `null`; hls.js sync `72` inside `[0, 90]` → `{0, 72}`;
  sync beyond the end → the end; native offset `18` → `{0, 72}`; no sync and no offset → the end;
  an edge below the start → the start; a non-finite end → `null`; the last of two ranges is used.
- New `apps/web/src/lib/livePlayback/liveMediaStore.test.ts` with a fake media object (an
  `EventTarget` with writable `currentTime`, `paused`, `played`, `seekable`) and injected interval
  and sync readers:
  - register sets `attached`; the unregister function clears it; a second register replaces the
    first.
  - An element that has not played reads as at live with no behind label.
  - Played, window `[0, 120]` with edge `102`, position `60` → `behindLiveLabel` `'\u22120:42'`,
    `canRewind` true.
  - `prepareResume`: fresh element → `'play'`, no seek; paused at `60` → `'play'`, no seek; paused
    at `3` (inside the start margin) → `currentTime` set to the edge, `'play'`; progressive played
    and paused → `reconnect` called, `'reconnecting'`; an unregistered element → `'play'`.
  - `goToLive`: HLS → `currentTime` set to the edge; progressive → `reconnect` called.
  - `seekTo` / `seekToFraction` / `jumpBy` do nothing on a window shorter than 30 seconds and clamp
    into `[start + 6, edge]` on a rewindable one.
  - Native join offset is measured on the first `playing` event only.
  - `refresh` with unchanged whole-second values does not notify.

## Release scratchpad

```markdown
## Livestreams resume or rejoin live after a pause

- Surfaces: web
- Change: Pressing Play on a paused livestream now resumes where it was paused when the stream
  (HLS) still holds that moment, and jumps to the live moment when it no longer does. A
  progressive livestream (a plain audio or video stream with no seekable window) reconnects and
  plays from the live moment, since it cannot hold anything from before the pause. Applies to
  livestreams from the catalog and from Add by RSS.
- Who notices: web listeners who pause a livestream and play it again
- Operator steps: none
```
