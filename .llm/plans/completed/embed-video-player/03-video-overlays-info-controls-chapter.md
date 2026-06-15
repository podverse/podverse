# 03 — Video overlays, info, controls, and chapter UX

## Objective

Implement the video-mode overlay UX: semi-transparent info row at top, controls + chapter title at
bottom, auto-hide on idle when playing, and progress-bar chapter popover (video only). Reuse
`EmbedPlayerInfo` and `EmbedPlayerControls` where possible.

## Prerequisites

- Phase 2 complete (video stage with working media mount and playback).

## Scope

- Compose `EmbedVideoStage` with overlay layers.
- Auto-hide visibility hook (paused = show; playing + no hover = fade after ~3s).
- Video-specific chapter title line above progress row.
- Enable chapter hover tooltip on progress bar for video embed only.
- Click-to-play/pause on the video surface.
- Minimal mute/unmute toggle in the controls overlay (for muted autoplay; only in-scope special button).
- Audio embed chapter behavior unchanged.

## File targets

### New

- `apps/web/src/components/embed/EmbedVideoStage.tsx` (consolidate stage + overlays; may refactor from Phase 2)
- `apps/web/src/components/embed/EmbedVideoInfoOverlay.tsx`
- `apps/web/src/components/embed/EmbedVideoControlsOverlay.tsx`
- `apps/web/src/components/embed/EmbedVideoChapterTitleLine.tsx`
- `apps/web/src/hooks/useEmbedVideoOverlayVisibility.ts`
- `apps/web/src/styles/components/embed/EmbedVideoStage.module.scss`
- `apps/web/src/styles/components/embed/EmbedVideoInfoOverlay.module.scss`
- `apps/web/src/styles/components/embed/EmbedVideoControlsOverlay.module.scss`
- `apps/web/src/styles/components/embed/EmbedVideoChapterTitleLine.module.scss`

### Modified

- `apps/web/src/components/embed/EmbedPlayerPanel.tsx` — video branch renders `EmbedVideoStage`
- `apps/web/src/components/embed/EmbedPlayerInfo.tsx` — optional `variant?: 'stacked' | 'overlay'`
- `apps/web/src/components/embed/EmbedPlayerControls.tsx` — pass through chapter tooltip prop
- `apps/web/src/components/MediaPlayer/Sliders/MediaPlayerProgress.tsx` — opt-in chapter tooltip
- `apps/web/src/styles/components/embed/EmbedPlayerInfo.module.scss` — overlay variant styles
- `apps/web/src/lib/embed/resolveEmbedPrimaryTitle.ts` — video overlay may prefer item title in info
  row (chapter title moves to separate line); document behavior
- Remove or stop using `EmbedVideoPlaceholder.tsx` in production path (keep file until cleanup in Phase 6)

## Overlay visibility contract

`useEmbedVideoOverlayVisibility`:

| State | Overlays visible |
| ----- | ---------------- |
| Paused | Always visible |
| Playing + pointer inside stage | Visible |
| Playing + pointer outside | Visible until idle timer elapses (~3s) |
| Playing + idle | Hidden (opacity 0; pointer-events none on overlay chrome) |

Implementation notes:

- Attach `onMouseEnter` / `onMouseLeave` / `onFocusIn` / `onFocusOut` on stage root.
- Use `mpIsPlaying` from `useMediaPlayer`.
- Idle timer: reset on mouse move inside stage while playing.
- CSS transition: `$embed-video-overlay-transition-ms` (300ms) for opacity.
- Overlays remain in DOM when hidden (accessibility: controls still reachable via keyboard when focused).

Constants in `_embedLayoutTokens.scss`:

```scss
$embed-video-overlay-idle-hide-ms: 3000;
$embed-video-overlay-transition-ms: 300;
$embed-video-overlay-bg-alpha: 0.72; // tune against design tokens
```

Use existing surface/color tokens for overlay background; no `var(--token, fallback)`.

## Stage layout

```text
┌──────────────────────────────────────────┐
│ ░░░ Info overlay (top) ░░░░░░░░░░░░░░░░ │
│                                          │
│           video / center art             │
│                                          │
│ ░░░ Controls overlay (bottom) ░░░░░░░░░ │
│   [chapter title line - ellipsis]        │
│   [progress][time][...][play]            │
└──────────────────────────────────────────┘
```

`EmbedVideoStage.module.scss`:

```scss
.videoStage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.mediaLayer {
  position: absolute;
  inset: 0;
}

.overlayTop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
}

.overlayBottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
}
```

## Info overlay

`EmbedVideoInfoOverlay`:

- Semi-transparent background behind info row (full width, padding matches embed panel tokens).
- Renders `EmbedPlayerInfo` with `variant="overlay"`.

Overlay variant adjustments for `EmbedPlayerInfo`:

- Keep same content: art, channel title, episode title, date, brand logo.
- **Title line in video mode:** show **item title** (or clip/soundbite title), not active chapter
  title — chapter moves to bottom line. Implement via prop `preferItemTitleInInfo={true}` or
  `variant="overlay"` branch in title resolution.
- Text remains single-line ellipsis (existing styles).
- Art thumbnail stays in top-left (same 78px or slightly smaller in overlay — match mockup).

### Click-to-play and title-toggle coexistence

- Clicking the video stage surface toggles play/pause (common video UX).
- The existing info title-toggle button ([EmbedPlayerInfo.tsx](apps/web/src/components/embed/EmbedPlayerInfo.tsx)
  line 187) must NOT swallow the stage click in overlay mode. Constrain the toggle hit area to the
  title text itself (e.g. `pointer-events` only on the text, or stop propagation on the title button)
  so the surrounding stage still receives the play/pause click.
- Buttons in the controls overlay (play, more, alternate enclosure, mute) must `stopPropagation` so
  clicking them does not also toggle the stage play/pause.

## Controls overlay

`EmbedVideoControlsOverlay`:

- Semi-transparent background strip at bottom.
- Contains:
  1. `EmbedVideoChapterTitleLine` (conditional)
  2. `EmbedPlayerControls` with new props
  3. Mute/unmute toggle (video only)

### Mute/unmute toggle

- Render a mute/unmute button in the controls overlay for video presentation only.
- Reflects current muted state; toggles `mpIsMuted` via media controls.
- Primary purpose: let users unmute after muted autoplay (Phase 2). This is the only in-scope
  special video button; others remain deferred.
- `data-testid="embed-video-mute-toggle"`. Needs a localized `aria-label` (mute / unmute) — add i18n
  keys (see i18n section).

### Chapter title line

`EmbedVideoChapterTitleLine`:

- Visible when chapters loaded and active chapter has title (same guards as
  `shouldEmbedShowChapterInfo`).
- Single line, left-aligned, `text-overflow: ellipsis`, `white-space: nowrap`, `overflow: hidden`.
- Uses `selectItemChapterForTime(mpItemChapters, mpCurrentTime)` or `mpItemChapter` when pinned.
- `data-testid="embed-video-chapter-title"`.
- Hidden when no active chapter title (do not reserve empty row — collapse).

### Progress bar chapter popover

Update `MediaPlayerProgress`:

```typescript
type MediaPlayerProgressProps = {
  // ...
  showChapterHoverTooltip?: boolean; // explicit override
};

const enableChapterHoverTooltip =
  showChapterHoverTooltip ??
  (layoutVariant !== 'embed');
```

`EmbedPlayerControls` for video overlay:

```tsx
<MediaPlayerProgress
  layoutVariant="embed"
  showChapterMarkers={showChapterMarkers}
  showChapterHoverTooltip={true}
/>
```

Audio embed path: unchanged (no prop → tooltip disabled).

## EmbedPlayerPanel integration

Replace video branch:

```tsx
) : (
  <EmbedVideoStage
    fallbackResource={fallbackResource}
    headerTitle={headerTitle}
    showChapterMarkers={showChapterMarkers}
    sharedQuery={sharedQuery}
  />
)
```

Move `EmbedPlayerLoadingOverlay` inside stage or keep at panel level (overlay above media, below
loading spinner).

Delete stacked `EmbedPlayerInfo` above video placeholder (info only in overlay for video mode).

## Small-size behavior

At narrow widths a 16:9 stage can be short (e.g. ~180px tall at 320px wide), so top + bottom overlays
can cover most of the video. Define minimums: cap overlay chrome heights, allow the info art to
shrink, and ensure the center of the stage stays visible. Add an acceptance check at a small width.

## Accessibility

- Hidden overlays use `opacity: 0` + `pointer-events: none` but remain in DOM; reveal on focus
  (`onFocusIn`) so keyboard users never focus an invisible control. This is an acceptance criterion,
  not optional.

## i18n

- Add mute/unmute `aria-label` keys (e.g. `embed_video_mute` / `embed_video_unmute`) in
  `apps/web/i18n/originals/en-US.json`; pass localized strings from the app (no copy baked into
  shared UI). Other overlay regions reuse existing translations.

## Acceptance criteria

- Video embed shows info overlay at top with semi-transparent background matching mockup intent.
- Controls overlay at bottom with same controls as audio embed (progress, time, more, play) plus
  mute/unmute toggle.
- When paused, overlays always visible.
- When playing, overlays hide ~3s after mouse leaves stage (smooth fade).
- Hovering stage while playing shows overlays immediately.
- Clicking the video surface toggles play/pause; control buttons and title toggle do not also toggle
  the stage.
- Chapter title appears above progress row (video only); ellipsizes when long.
- Progress bar chapter popover works on hover in video embed; still disabled in audio embed.
- Mute/unmute toggle reflects and controls muted state; usable to unmute after muted autoplay.
- Overlays reveal on keyboard focus when hidden; stage remains usable at a small width.
- Audio embed layout and chapter-in-title behavior unchanged.

## Out of scope

- List row count (Phase 4).
- Auto-resize (Phase 5).
- Special video buttons (future).
