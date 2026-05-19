# Phase 4b — Unified `<MediaElement>` for regular audio + video

## Goal

Collapse the two non-livestream controllers
(`MediaPlayerControllerAudio` + `MediaPlayerVideoWrapper`) into the
single `<MediaElement>` component scaffolded in 4a. After this phase
there is one media element render path for everything that is not a
livestream; livestreams stay on the legacy video.js path until the
follow-up
[`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/)
plan-set.

## Scope

- `apps/web/src/components/MediaPlayer/MediaElement/MediaElement.tsx`
  — promoted from a scaffold to the active renderer for the non-live
  path.
- `apps/web/src/components/MediaPlayer/MediaElement/mediaElementSourceFromTarget.ts`
  — fully implemented for non-live `PlaybackTarget` kinds.
- `apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx`
  — replaces `<MediaPlayerControllerAudio />` and
  `<MediaPlayerVideoWrapper />` with a single `<MediaElement
  target={...} />`.
- `apps/web/src/components/MediaPlayer/Controller/Audio/MediaPlayerControllerAudio.tsx`
  — **deleted**.
- `apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerControllerVideo.tsx`
  — **deleted**.
- `apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerVideoWrapper.tsx`
  — **deleted** (the wrapper exists today only to absorb the
  difference between the audio and video controllers; once they are
  one element, the wrapper is gone).
- `apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx`
  — **removed** (replaced by `NonLiveMediaOrchestrator.tsx`, which renders
  `<MediaElement>` and wires `useMediaElementBridge`).
- `apps/web/src/components/MediaPlayer/Controller/NonLiveMediaOrchestrator.tsx`
  — coordinates non-live playback, context mirrors, and bridge callbacks.
- `apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.tsx`
  — preserved, but consumes `<MediaElement>` directly when the active
  target is a video.

## 1. `mediaElementSourceFromTarget` (non-live cases)

Pure mapping from a `PlaybackTarget` to a `MediaElementSource`:

```typescript
export function mediaElementSourceFromTarget(
  target: PlaybackTarget,
): MediaElementSource {
  switch (target.kind) {
    case 'clip':
    case 'soundbite':
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return {
        kind: 'file',
        src: pickPrimaryMediaUrl(target.item),
        mimeType: pickPrimaryMimeType(target.item),
      };
    case 'add-by-rss':
      return {
        kind: 'file',
        src: target.resourceData.media_url,
        mimeType: target.resourceData.mime_type,
      };
    case 'livestream':
      throw new Error(
        'livestream must use LegacyLiveStreamControllerSelector — not <MediaElement>',
      );
  }
}
```

`pickPrimaryMediaUrl` and `pickPrimaryMimeType` are extracted from the
existing `NonLiveMediaOrchestrator` source-selection logic. They become
small, individually testable helpers under
`apps/web/src/components/MediaPlayer/MediaElement/`.

Unit tests cover:

- Each non-live `kind` returns a non-empty `src`.
- Add-by-RSS with missing `mime_type` returns `undefined` mime (the
  browser falls back).
- An item with multiple `enclosures` selects the first playable one
  (re-uses today's selection rules — extract them, don't change them).

## 2. `<MediaElement>` body

Full implementation now (4a was a scaffold):

```tsx
export function MediaElement({ target }: { target: PlaybackTarget }) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const {
    setMpCurrentTime,
    setMpIsPlaying,
    setMpDuration,
    setMpDidEnd,
    pendingPlaybackDecision,
    setPendingPlaybackDecision,
  } = useMediaPlayer();

  const bridge = useMediaElementBridge(mediaRef, {
    onTimeUpdate: setMpCurrentTime,
    onPlay: () => setMpIsPlaying(true),
    onPause: () => setMpIsPlaying(false),
    onEnded: () => setMpDidEnd(true),
    onLoadedMetadata: setMpDuration,
  });

  // Apply pending decision when the bridge is ready.
  // The bridge protects against race conditions internally via its
  // in-flight load token (see 04a "In-flight load token"). We only
  // need to ensure we don't clear pendingPlaybackDecision for a
  // *different* decision than the one we kicked off.
  useEffect(() => {
    if (!pendingPlaybackDecision) return;
    const decisionAtCallTime = pendingPlaybackDecision;
    const source = mediaElementSourceFromTarget(target);
    void bridge.loadAndStart(source, decisionAtCallTime).then(() => {
      // Only clear if state still holds the same decision instance —
      // a newer load may have replaced it while we were awaiting.
      setPendingPlaybackDecision((current) =>
        current === decisionAtCallTime ? null : current,
      );
    });
  }, [pendingPlaybackDecision, target, bridge, setPendingPlaybackDecision]);

  const isVideo = mediaTargetIsVideo(target);
  const elementKey = `${isVideo ? 'video' : 'audio'}::file`;

  return isVideo
    ? <video key={elementKey} ref={mediaRef} controls={false} playsInline />
    : <audio key={elementKey} ref={mediaRef} />;
}
```

`mediaTargetIsVideo` is a small predicate that lives next to
`mediaElementSourceFromTarget`. Its rules mirror the legacy
`shouldRenderVideoElement` logic exactly.

`<MediaElement>` is published through the `MediaPlayerControlsProvider`
so `useMediaPlayerControls()` returns its bridge.

## 3. Floating-portal wrapper

`MediaPlayerVideoPortalFloating.tsx` currently wraps the video element
in a draggable, resizable portal. Its DOM ownership of the `<video>`
must transfer to `<MediaElement>` while keeping the portal lifecycle.

Approach:

- `<MediaElement>` always renders the `<audio>` or `<video>` inline,
  in the controller's tree.
- When `target` is a video, `<MediaPlayerVideoPortalFloating>` portals
  the `<video>` element into the floating container using
  `ReactDOM.createPortal` keyed on the same element ref.
- The portal does **not** create a separate `<video>` element; it
  re-parents the one `<MediaElement>` owns.

This removes the wrapper-vs-element ownership ambiguity that exists
today (the wrapper conditionally created its own video element).

If portal re-parenting causes the element to lose state (some browsers
pause on DOM move), the bridge's saved-state snapshot from 4a handles
restore. The Phase 1 E2E spec for "minimize player while playing video"
verifies this.

## 4. Controller wiring

Before 4b:

```tsx
<>
  <MediaPlayerControllerAudio />
  <MediaPlayerVideoWrapper />
  <MediaPlayerControllerLiveStreamAudio />
  <MediaPlayerLiveStreamVideoWrapper />
</>
```

After 4b:

```tsx
<>
  {target ? (
    target.kind === 'livestream' ? (
      <LegacyLiveStreamControllerSelector target={target} />
    ) : (
      <MediaElement target={target} />
    )
  ) : null}
</>
```

`LegacyLiveStreamControllerSelector` is a permanent wrapper that picks
`MediaPlayerControllerLiveStreamAudio` vs.
`MediaPlayerLiveStreamVideoWrapper` based on the target's media kind.
It remains until the
[`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/)
plan-set deletes the legacy livestream tree and folds livestreams into
`<MediaElement>`.

`MediaPlayerControlsProvider` publishes the `<MediaElement>` bridge when
the active target is non-live. When `target.kind === 'livestream'`, it
publishes `isAttached: false` (or a no-op bridge) so UI matches today's
effective no-op for seek/jump against livestream playback.

## 5. Deletions in 4b (commit by commit)

In order on the refactor branch:

1. Land `<MediaElement>` and rewire `MediaPlayerController` to use it
   for non-live targets. Both legacy controllers still exist; they're
   unreferenced from this point. Verify with `rg
   "MediaPlayerControllerAudio|MediaPlayerVideoWrapper|MediaPlayerControllerVideo"
   apps/web/src` — should show only the file definitions.
2. Delete `MediaPlayerControllerAudio.tsx`,
   `MediaPlayerControllerVideo.tsx`, `MediaPlayerVideoWrapper.tsx`.
3. **Done:** `MediaPlayerControllerAV.tsx` removed; non-live coordination
   lives in `NonLiveMediaOrchestrator.tsx`, and the `<audio>` / `<video>` DOM
   is rendered by `MediaElement.tsx` (bridge still owns imperative `src` /
   `load` / seek where applicable).
4. Delete `apps/web/src/components/MediaPlayer/Controller/Audio/`
   directory if it becomes empty.
5. Delete `apps/web/src/components/MediaPlayer/Controller/Video/`
   directory if only `MediaPlayerVideoPortalFloating.tsx` remains; if
   so, move that file up one level into `MediaElement/`.

After step 5, the primary non-live files under
`apps/web/src/components/MediaPlayer/Controller/` include:

- `MediaPlayerController.tsx` (the slimmed top-level controller)
- `NonLiveMediaOrchestrator.tsx` (non-live bridge wiring + effects)
- `LiveStream/` (kept until the HLS migration plan-set removes it)
- `mediaPlayerWindowKeyDown.ts`
- `mediaPlayerWindowKeyDown.test.ts`

## 6. Testing

Add or extend orchestration tests:

- `<MediaElement>` with a clip target → bridge `loadAndStart` is
  called with `kind: 'file'`, decision contains `pauseAtSeconds`.
- `<MediaElement>` with a music `session_restore` target → bridge
  `loadAndStart` decision contains the abridged seek seconds.
- Switch from audio target to video target → React `key` change
  occurs; the bridge re-attaches; saved state is restored if the
  switch is a "continuation" (e.g. UI swap, not a new load).

The Phase 1 E2E suite must remain green; in particular the floating
portal specs should pass without modification (or with cosmetic
selector updates if the DOM hierarchy changed).

## Out of scope

- Live streams (HLS migration plan-set).
- UI consumer migration off `EVENTS.MEDIA_PLAYER` (Phase 4c).
- Final controller slim-down + ESLint guards (5).

## Exit criteria

- `<MediaElement>` renders the non-live `<audio>` / `<video>` DOM for each
  `NonLiveMediaOrchestrator` mount (hidden audio + floating video).
- Legacy split controllers (`MediaPlayerControllerAudio`, `MediaPlayerControllerVideo`,
  `MediaPlayerVideoWrapper`) and `MediaPlayerControllerAV.tsx` are gone.
- `MediaPlayerControlsProvider` publishes the bridge when non-live playback
  is active.
- The floating-portal video player works end-to-end (verified by E2E).
- The Phase 1 baseline E2E suite still passes.

## Verification commands

```bash
npm run lint -w apps/web
npm run test:unit
make e2e_test_web_report
```
