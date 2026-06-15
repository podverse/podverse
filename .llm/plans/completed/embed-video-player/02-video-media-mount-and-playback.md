# 02 — Video media mount and playback

## Objective

Replace `EmbedVideoPlaceholder` with a working inline media mount: visible `<video>` for video
enclosures, hidden `<audio>` + centered art for audio enclosures in video presentation. Enable
embed playback load for video mode and tighten content-ready logic.

## Prerequisites

- Phase 1 complete (aspect-ratio video stage container exists in `EmbedPlayerPanel` / shell).

## Scope

- New `EmbedVideoMediaMount` and `EmbedVideoCenterArt`.
- Wire playback load hooks for video presentation (single + list).
- Update `embedPlayerContentReady` for real video readiness.
- Audio embed unchanged: still hidden audio only even when enclosure is video (optional: play video
  file as audio-only — see behavior below).

## File targets

### New

- `apps/web/src/components/embed/EmbedVideoMediaMount.tsx`
- `apps/web/src/components/embed/EmbedVideoCenterArt.tsx`
- `apps/web/src/styles/components/embed/EmbedVideoCenterArt.module.scss`

### Modified

- `apps/web/src/components/embed/EmbedPlayerPanel.tsx` — video branch uses mount inside stage
- `apps/web/src/components/embed/EmbedSingleShell.tsx` — remove `isAudio`-only playback gate if present
- `apps/web/src/components/embed/EmbedListShell.tsx` — enable `useEmbedPlaybackLoad` for video
- `apps/web/src/hooks/useEmbedSinglePlaybackLoad.ts` (if gated on audio)
- `apps/web/src/hooks/useEmbedPlaybackLoad.ts`
- `apps/web/src/lib/embed/embedPlayerContentReady.ts`
- `apps/web/src/hooks/useEmbedPlayerContentReady.ts`

### Reference (read, minimal change)

- `apps/web/src/components/MediaPlayer/MediaElement/NonLiveMediaMount.tsx`
- `apps/web/src/components/embed/EmbedInlineMediaMount.tsx`
- `apps/web/src/components/MediaPlayer/Controller/NonLiveMediaOrchestrator.tsx`
- `apps/web/src/components/MediaPlayer/MediaElement/MediaElement.tsx`

## Media mount behavior

### Video presentation + video enclosure

Mount **one** visible inline orchestrator:

```tsx
<NonLiveMediaOrchestrator
  {...avProps}
  mediaType="video"
  preload="auto"
  hidden={false}
  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
/>
```

- No floating portal (`MediaPlayerVideoPortalFloating`).
- Video fills aspect-ratio stage; letterbox with `object-fit: contain` when native ratio differs from
  `--embed-video-aspect-ratio`. Verify the passed `style` merges with (does not override) the
  element `layoutStyle` applied in `MediaElement`.
- Do **not** mount a separate hidden audio element for the same file (orchestrator handles one element).

### Muted autoplay (opt-in)

- `autoplay` is **default off** (existing param). When `autoplay=true` in video presentation, the
  video must start **muted and playing** so browsers permit cross-origin autostart. Set initial
  muted state in video presentation when autoplay is requested.
- The unmute affordance lives in the controls overlay (Phase 3). This is the only in-scope "special
  button"; all other video buttons remain deferred.
- Audio presentation autoplay behavior is unchanged.

### Video presentation + audio enclosure

Mount hidden audio (same as today) **plus** centered art:

```tsx
<NonLiveMediaOrchestrator {...avProps} mediaType="audio" preload="auto" hidden={true} />
<EmbedVideoCenterArt />
```

`EmbedVideoCenterArt`:

- Uses `buildMediaPlayerArtworkImageCandidates` with chapter → item → channel → placeholder chain.
- Reuse `resolveEmbedActiveChapterForArtwork` + `shouldUseChapterArtwork` (same as `EmbedPlayerInfo`).
- Center art in stage with `object-fit: contain`; max size ~60% of stage (tokenize if needed).
- Append `IMAGES.SRC.EMBED_PLACEHOLDER` as final candidate (match `EmbedPlayerInfo`).

### Detecting enclosure media type (single source of truth)

The mount decision MUST read the **same** resolved selection the playback-load path uses — do not
compute a separate guess (see 00-SUMMARY "Single active-enclosure source of truth").

```typescript
import { getSelectedLabeledItemEnclosureAndSource } from '@podverse/helpers';

const selected = getSelectedLabeledItemEnclosureAndSource({
  labeledItemEnclosures: mpItemLabeledItemEnclosures,
  type: mpEnclosureSelectedParams.type,
  enclosureRowIndex: mpEnclosureSelectedParams.enclosureRowSelected,
  sourceRowIndex: mpEnclosureSelectedParams.sourceRowSelected,
});
const isVideoFile = selected?.labeledItemEnclosure?.mediaType === 'video';
```

Both `mpItemLabeledItemEnclosures` and `mpEnclosureSelectedParams` are populated by
`useEmbedPlaybackLoad` (`enclosureSelectedParams: 'use-active-item-or-default'`). Re-render when
`mpEnclosureSelectedParams` changes (alternate enclosure modal).

### mediaType stability (avoid orchestrator remount/reset)

`useRegisterMediaPlayerControlsBridge` runs per orchestrator instance, so flipping `mediaType`
remounts the element and resets playback. Resolve `mediaType` **once per loaded item** from the
selected enclosure and memoize it on the loaded item identity; only recompute when the loaded item
or the user-selected enclosure actually changes. An explicit alternate-enclosure swap
(audio file ↔ video file) is allowed to reload media; passive re-renders must not.

### Audio presentation + video enclosure

Keep current behavior: `EmbedInlineMediaMount` with `mediaType="audio"` only. If the selected
enclosure is video, playback still uses audio path (browser may not play — verify). Product intent:
preserve audio-only UX; prefer selecting an audio enclosure when available. Document in code comment;
no video surface in audio presentation.

## Playback load enablement

Today `EmbedListShell` gates:

```typescript
enabled: selectedRow !== null && presentationStyle === 'audio',
```

Change to:

```typescript
enabled: selectedRow !== null && presentationStyle !== 'unknown',
```

Or explicitly `=== 'audio' || === 'video'`.

Apply same pattern in `EmbedSingleShell` / `useEmbedSinglePlaybackLoad` if audio-only gated.

Ensure alternate enclosure selection (`EmbedAlternateEnclosureModal`) works in video mode (already
supports video enclosures).

## Content ready (identity-match, NOT readyState)

`isEmbedPlayerContentReady` currently returns `true` for all video mode without loaded media:

```typescript
if (input.mediaType === 'video') {
  return true;
}
```

Remove that shortcut. Use the **same identity-match pattern as audio** — do NOT add element
`readyState` plumbing (the orchestrator/bridge does not expose it and that is out of scope):

- Ready when `getLoadedEmbedResourceIdentity(...)` matches the fallback identity, OR
  `embedFallbackHasDisplayContent(fallbackResource)` is true (art/title can render before play).
- Applies to both video files and audio-in-video.
- Keep loading overlay until ready.

## Stage structure (interim before Phase 3 overlays)

```tsx
<div className={styles.videoStage} data-testid="embed-video-stage">
  <EmbedVideoMediaMount />
  {/* Phase 3 adds overlay layers here */}
</div>
```

`EmbedVideoStage.module.scss` (create minimal in this phase or defer shell file to Phase 3):

- `position: relative; width: 100%; height: 100%; background: var(--color-surface-inverse)` or black.
- Stage fills aspect-ratio box from Phase 1.

## data-testid hooks

- `embed-video-stage`
- `embed-video-element` (on visible video)
- `embed-video-center-art` (audio-in-video mode)

## Acceptance criteria

- Single video embed plays video files inline (no placeholder text).
- Single video embed with audio file shows centered chapter-art and plays audio.
- List video embed loads and plays selected row (video or audio file).
- Loading overlay clears when media is actually ready (not immediately for video).
- Audio presentation embed unchanged (no visible video).
- Alternate enclosure switching updates mount (video ↔ audio file) and is the only path that reloads
  media; passive re-renders keep `mediaType` stable (no playback reset).
- Mount decision and playback-load enclosure selection derive from the same resolved value.
- Content-ready uses identity-match (no `readyState`); loading overlay clears accordingly.
- With `autoplay=true`, video starts muted and playing.

## Out of scope

- Info/controls overlays (Phase 3).
- Chapter title line / popover (Phase 3).
- List row count / fixed list heights (Phase 4).
