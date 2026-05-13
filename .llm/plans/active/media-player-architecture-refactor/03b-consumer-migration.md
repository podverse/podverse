# Phase 3b — Consumer migration to the new load policy

## Goal

Flip every existing playback-load consumer to the API designed in 3a,
remove the legacy fields and helper modules, and leave the codebase
with exactly one place that decides "where does this load start playing
and what should it do next."

## Scope

Per-call-site edits. No new types, no new contexts, no bridge work
(that is Phase 4). The legacy `MediaPlayerControllerAV.tsx` still owns
the `<audio>` / `<video>` element after this phase — its
`handleLoadedMetadata` simply consumes
`pendingPlaybackDecision.initialSeekSeconds` from context instead of
recomputing.

## Migration order (one commit each, in this sequence)

The order matters: producers first (so the new context state has data
in it before any consumer reads it), then the in-controller consumer,
then the standalone callers, then the deletions.

### Commit 1: `useQueueResourcesLoadActive` returns resources

File: `apps/web/src/hooks/useQueueResourcesLoadActive.tsx`

Change `loadActive` to compute and return `LoadActiveResult` (see 3a).
Keep the existing `setActiveQueueUpcomingResources(...)` side effect
so the queue UI continues to work; the migration of the queue UI off
that state (if applicable) is **not** in scope for this refactor.

Tests:

- Add unit coverage that the returned `activeResource` matches the
  resource that would have been picked as the head of upcoming.

### Commit 2: `useMediaPlayerResourceUpdate` consumes a single request

File: `apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx`

Replace the current parameter list with a single
`PlaybackLoadRequest`. The hook becomes:

```typescript
export function useMediaPlayerResourceUpdate() {
  const { applyPlaybackLoad, /* ...mediaPlayer fields... */ } =
    useMediaPlayer();

  return function updateMediaPlayerResource(
    request: PlaybackLoadRequest,
  ): PlaybackLoadDecision {
    const decision = applyPlaybackLoad(request);
    // (any caller-side bookkeeping that used to happen inline:
    //  history record, queue cleanup, etc., still happens here
    //  so 3b doesn't change behavior — Phase 5 may move it elsewhere)
    return decision;
  };
}
```

The hook is now a thin shim. Phase 5 considers folding it into
`MediaPlayerController` directly; we keep it for one phase to localize
the change diff.

The hook's existing `currentTime` clamping logic (line 176 in the
legacy file) is deleted — `resolvePlaybackLoadDecision` already does
this via `clampNearEndSeconds`.

### Commit 3: `MediaPlayerController.handleLoadQueueItem`

File: `apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx`

Replace the inline `musicItemPlaybackIntent` derivation with a single
`PlaybackTarget` construction:

```typescript
const target = buildPlaybackTargetFromQueueResource(resource, {
  /** intent default for the music branch is 'fresh_transition' from
   *  the controller's perspective; explicit_play and session_restore
   *  are set by their respective callers (TrackNextButton sets
   *  fresh_transition, AnonymousPlaybackRestoreController sets
   *  session_restore, list "play" buttons set explicit_play). */
});
const request: PlaybackLoadRequest = {
  target,
  explicitPlaybackSeconds: resource.playback_position ?? undefined,
  mediaFileDurationHintSeconds: undefined,
};
updateMediaPlayerResource(request);
```

The `pendingMusicQueueLoadIntentRef.current` drain is deleted; the
intent is part of the typed `target` already.

### Commit 4: `MediaPlayerController` autoQueue branch

Same file. The autoQueue load path constructs a music target with
`intent: 'fresh_transition'`. The existing auto-queue clear logic moves
into the policy (`shouldClearAutoQueue` is `false` for this case), but
the controller still calls the autoQueue context method when the
decision says so.

The `useEffect` that watches `activeQueueUpcomingResources` (lines
325–353) is deleted — `loadActive` returning the resources to the
caller obviates the watch.

### Commit 5: `AnonymousPlaybackRestoreController`

File: `apps/web/src/components/Queue/AnonymousPlaybackRestoreController.tsx`

The component currently sets `musicItemPlaybackIntentRef` and friends
before kicking the load. After 3b it constructs a
`PlaybackLoadRequest` directly:

```typescript
const target: PlaybackTarget = isMusicMediumId(item.medium)
  ? {
      kind: 'item-music',
      item,
      channel,
      intent: 'session_restore',
    }
  : {
      kind: item.media_kind === 'video' ? 'item-video' : 'item-podcast',
      item,
      channel,
    };

updateMediaPlayerResource({
  target,
  explicitPlaybackSeconds: snapshot.playback_seconds,
  mediaFileDurationHintSeconds: snapshot.duration_seconds,
});
```

The component no longer touches `musicSessionRestoreSeekSecondsRef` or
`musicItemPlaybackIntentRef`.

### Commit 6: `TrackNextButton` and `TrackNextButtonMobile`

Files:

- `apps/web/src/components/MediaPlayer/Buttons/TrackNextButton.tsx`
- `apps/web/src/components/MediaPlayer/Buttons/TrackNextButtonMobile.tsx`

Both currently set `pendingMusicQueueLoadIntentRef.current =
'fresh_transition'` before calling the controller's load method. After
3b, both call a thin helper that:

1. Resolves the next queue resource (this is the head of the upcoming
   list returned by `loadActive` in commit 1).
2. Builds a music target with the appropriate intent based on the
   current queue position and medium.
3. Calls `updateMediaPlayerResource(request)`.

The helper lives in
`apps/web/src/components/MediaPlayer/Buttons/buildTrackNextRequest.ts`
and is shared by both buttons.

### Commit 7: `usePlayAddByRSS`

File: `apps/web/src/hooks/usePlayAddByRSS.tsx`

Construct an `add-by-rss` target with the appropriate
`explicitPlaybackSeconds` from the resource's stored
`playback_position`. Delete the special-cased
`mpAddByRSSPlaybackSeconds` state from the MediaPlayer context (the
load policy reads the value out of `request.explicitPlaybackSeconds`
on the way through).

### Commit 8: `MediaPlayerControllerAV.handleLoadedMetadata`

File: `apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx`

Replace the inline seek-time computation with a read of
`pendingPlaybackDecision`. The new flow:

```typescript
const handleLoadedMetadata = useCallback(() => {
  const decision = pendingPlaybackDecisionRef.current;
  if (!decision) return; // safety guard; should always be set
  if (mediaRef.current) {
    mediaRef.current.currentTime = decision.initialSeekSeconds;
  }
  if (decision.shouldAutoPlay) {
    void mediaRef.current?.play();
  }
  if (typeof decision.pauseAtSeconds === 'number') {
    armPauseAt(decision.pauseAtSeconds);
  }
  setPendingPlaybackDecision(null);
}, [/* ... */]);
```

The `mediaRef` ref-mirror of `pendingPlaybackDecision` is the **only**
ref-mirror added in 3b — necessary because `handleLoadedMetadata` is
attached as a long-lived listener and needs the latest decision
without re-binding. Phase 4a removes it by moving the listener into
the bridge.

The huge inline branch (clip / soundbite / chapter / item-music
session_restore / item-video / item-podcast / add-by-RSS) is **all
deleted** — every per-source decision is in the policy now.

### Commit 9: Delete superseded helpers

Once the above commits are merged on the refactor branch and CI is
green, delete:

- `apps/web/src/lib/musicItemPlaybackIntent.ts`
- `apps/web/src/lib/musicSessionRestoreCurrentTime.ts`
- `apps/web/src/lib/playbackResumeNearEnd.ts` (its content moved into
  `apps/web/src/lib/playback/clampNearEndSeconds.ts` in Phase 2)
- The corresponding `*.test.ts` files (their cases are absorbed into
  `resolvePlaybackLoadDecision.test.ts`).

Run a full ripgrep to confirm no remaining imports:

```bash
rg "musicItemPlaybackIntent|musicSessionRestoreCurrentTime|playbackResumeNearEnd" apps/web
```

Should return zero hits.

### Commit 10: Remove legacy MediaPlayer context fields

File: `apps/web/src/contexts/MediaPlayer.tsx`

Remove:

- `musicItemPlaybackIntentRef`
- `pendingMusicQueueLoadIntentRef`
- `musicSessionRestoreSeekSecondsRef`
- `mpAddByRSSPlaybackSeconds` and its setter

Update the context default value and provider accordingly. CI should
now flag any leftover consumer; if anything fails, return to commit 9
and resolve the missed call site.

## Verification per commit

After each commit on the refactor branch:

```bash
npm run lint -w apps/web
npm run test:unit -w apps/web
make e2e_test_web_report_spec SPEC=e2e/<spec-relevant-to-the-commit>.spec.ts
```

After commit 10 (the deletions):

```bash
make e2e_test_web_report
```

## Out of scope

- Bridge / controls context (Phase 4).
- Touching live-stream controllers (still the legacy code path in
  3b — they don't participate in the load policy because livestream
  has trivial decision rules).
- Touching window `EVENTS.MEDIA_PLAYER` consumers (Phase 4c).

## Exit criteria

- `MediaPlayer.tsx` context exposes only the new fields from 3a.
- `MediaPlayerController.tsx` does not contain any music-intent
  branching.
- `MediaPlayerControllerAV.handleLoadedMetadata` is < 30 lines and
  contains no per-source `if/else` chain.
- The three helper files listed in commit 9 do not exist.
- `pendingPlaybackLoadRef` is not referenced anywhere in the codebase
  (verified by ripgrep — note the legacy file never used this exact
  name; if any equivalent shared mutable load-intent ref crept back in
  during the refactor, it must be removed).
- The Phase 1 E2E suite passes end-to-end.

## Verification commands

```bash
npm run lint -w apps/web
npm run test:unit -w apps/web
make e2e_test_web_report
```
