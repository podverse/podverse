# Phase 5 — Controller slim-down + ESLint guards

## Goal

After Phase 4, the architecture is in its final shape for **non-live**
playback: a single `<MediaElement>`, a single bridge for that path, a
controls context, and a load policy. Phase 5 sweeps incidental
complexity out of the remaining files and locks the bridge-only
`mediaRef` pattern in with ESLint. **Livestream** legacy code stays
until the HLS migration plan-set; do not delete `LiveStream/` here.

## Scope

- `apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx`
  (top-level controller; **permanently** includes
  `LegacyLiveStreamControllerSelector` until the HLS plan-set)
- `apps/web/src/components/MediaPlayer/MediaElement/**`
- `apps/web/src/contexts/MediaPlayer.tsx`,
  `apps/web/src/contexts/MediaPlayerCurrentTime.tsx`,
  `apps/web/src/contexts/Queue.tsx`,
  `apps/web/src/contexts/QueueResourcesAbridgedIndex.tsx`
- `apps/web/eslint.config.*` (`no-restricted-syntax` for direct
  `mediaRef` writes outside the bridge only)

## Deliverables

### 1. Remove ref-mirrors from `<MediaElement>`

Same as before: audit `useRef` in `MediaElement.tsx` and
`useMediaElementBridge.ts`; prefer `useEffectEvent` or `useLatestRef`.

### 2. `MediaPlayerController` reduced to a coordinator

The controller watches data inputs, builds `PlaybackLoadRequest`s, and
renders `<MediaElement>` **or** `LegacyLiveStreamControllerSelector`.
Target line count: **under 250 lines** (livestream branch adds bulk).
If longer, extract hooks under `apps/web/src/hooks/`.

### 3. Context split decisions

Unchanged from prior plan: keep `MediaPlayerCurrentTime` separate; keep
`MediaPlayer` vs `MediaPlayerControlsContext` split; decide on
`QueueResourcesAbridgedIndex` vs `Queue`; keep `AutoQueue` separate.

### 4. Final dead-code sweep

```bash
rg "musicItemPlaybackIntent|musicSessionRestoreCurrentTime|playbackResumeNearEnd|EVENTS\.MEDIA_PLAYER|NonLiveMediaOrchestrator|MediaPlayerControllerAudio|MediaPlayerControllerVideo|MediaPlayerVideoWrapper" apps/web
```

Should return zero hits for **removed** symbols. **Do not** require
zero hits for `MediaPlayerControllerLiveStream` or `video.js` — those
remain until the HLS plan-set.

### 5. ESLint guard (bridge-only `mediaRef` writes)

Add **only** `no-restricted-syntax` (section 5b from the prior plan):
forbid `mediaRef.current.X = Y` and `.play()` / `.pause()` / `.load()`
outside `useMediaElementBridge.ts`. Optional 5c for `CustomEvent` /
`MEDIA_PLAYER` resurrection if useful.

**Do not** add `no-restricted-imports` for `video.js` in this plan-set
(that ships with
[`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/)).

## Exit criteria

- `MediaPlayerController.tsx` is under 250 lines.
- `<MediaElement>` is under 150 lines and has at most 2 `useRef`
  calls.
- `useMediaElementBridge` is under 350 lines.
- Dead-code ripgrep above returns zero hits for removed symbols.
- `no-restricted-syntax` guard is active; `npm run lint -w apps/web`
  passes.
- All Phase 1 orchestration tests and E2E specs pass.
- Context-split decision documented.

## Verification commands

```bash
wc -l \
  apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx \
  apps/web/src/components/MediaPlayer/MediaElement/MediaElement.tsx \
  apps/web/src/hooks/useMediaElementBridge.ts
npm run lint -w apps/web
npm run test:unit
make e2e_test_web_report
```
