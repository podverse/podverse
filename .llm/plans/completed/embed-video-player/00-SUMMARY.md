# Embed Video Player — 00 Summary

## Goal

Replace the video-mode embed placeholder with a working video presentation. The user chooses audio vs
video at embed build time (existing `presentation` / builder type plumbing). Video embed behavior:

- **Single:** fills available width, preserves aspect ratio (responsive iframe wrapper).
- **Overlays:** info row + controls over the video; visible when paused or on hover; auto-hide after
  idle when playing.
- **Chapters:** separate chapter title line above controls (video); progress-bar chapter popover on
  hover (video only — audio embed keeps popover disabled).
- **Media:** plays video and audio enclosures; audio-only in video mode shows centered chapter-art
  (chapter → item → channel → placeholder).
- **List:** fixed-height list with configurable visible row count (2–10, default 5); optional
  advanced secure auto-resize for responsive video + fixed list.

## Locked decisions

| Topic | Decision |
| ----- | -------- |
| Aspect ratio | Builder option; default `16:9`; choices `16:9`, `4:3`, `1:1` |
| Single video height | Responsive via iframe padding-bottom wrapper (no JS) |
| Video + list height | **Default:** fixed deterministic heights (video box + list rows) |
| Video + list advanced | Opt-in `resize=1` + parent listener snippet; secure postMessage only when enabled |
| List row count | Builder + query `rows`; min 2, max 10, default 5 (audio AND video lists) |
| Autoplay | Builder option, **default OFF** (opt-in via existing `autoplay` param) |
| Video autoplay behavior | When `autoplay=true`, video starts **muted + playing** with an unmute affordance |
| Audio embed + video file | Audio-only UX (hidden audio); no video surface |
| Video embed + audio file | Video UX with centered art; hidden audio playback |
| Chapter title (audio) | In info row title (existing) |
| Chapter title (video) | Single line above progress row; ellipsis; left-aligned |
| Chapter popover (audio) | Disabled on progress bar (existing) |
| Chapter popover (video) | Enabled on progress bar hover |
| Active enclosure | Single resolved value shared by playback-load and mount decision (see below) |
| Video content-ready | Identity-match (same as audio); do NOT depend on element `readyState` |
| `mediaType` swap | Keep one stable `mediaType` per loaded item to avoid orchestrator remount/reset |
| Special video buttons | Out of scope (later plan), EXCEPT minimal mute/unmute toggle for muted autoplay |
| Builder color/theme | Out of scope (still "coming soon") |

## Feasibility analysis

### Single video embed (responsive)

**Feasible with pure CSS.** Generated iframe code wraps the iframe in a responsive container:

```html
<div style="position:relative;width:100%;padding-bottom:56.25%;height:0;">
  <iframe style="position:absolute;inset:0;width:100%;height:100%;" ...></iframe>
</div>
```

`padding-bottom` = `100 / aspectRatio` percent (e.g. 56.25% for 16:9). The embed page uses
`aspect-ratio` CSS on the video stage so content matches the wrapper.

### Video + list embed (responsive video above fixed list)

**Not feasible in one static iframe with pure CSS alone.** Total height =
`videoHeight(width) + listHeight`, but `width` is unknown when the operator copies embed code.

**Two supported modes:**

1. **Fixed (default):** Video region uses a fixed height token; list region =
   `rows × row-height`. Entire iframe height is deterministic at codegen time.
2. **Advanced auto-resize (opt-in):** Embed measures `document.documentElement.scrollHeight` and
   postMessages to parent; parent resizes iframe. Gated by `resize=1`; listener snippet required;
   origin validation + namespaced message type.

## New query parameters

| Param | Scope | Default | Values |
| ----- | ----- | ------- | ------ |
| `ar` | single + list (video presentation) | `16x9` | `16x9`, `4x3`, `1x1` |
| `rows` | list only | `5` | integer 2–10 |
| `resize` | list + video presentation | `false` | `1` / `true` enables auto-resize |

Existing params unchanged: `autoplay`, `t`, `chapter_markers`, `presentation`, list `type`/`sort`/`page`/`range`/`play_id_text`.

## Architecture composition

```text
EmbedSingleShell / EmbedListShell
└── EmbedPlayerPanel (mediaType=video)
    └── EmbedVideoStage (new)
        ├── EmbedVideoMediaMount (inline video OR hidden audio + centered art)
        ├── EmbedVideoInfoOverlay → EmbedPlayerInfo (overlay variant)
        ├── EmbedVideoControlsOverlay
        │   ├── EmbedVideoChapterTitleLine (new)
        │   └── EmbedPlayerControls (showChapterHoverTooltip prop)
        └── useEmbedVideoOverlayVisibility (paused=show; playing=fade on idle)
```

Audio presentation path unchanged: stacked info + controls, fixed 166px panel height.

## Critical implementation contracts (resolve known risks)

These address the highest-risk areas found in review. Treat as non-negotiable.

### Single active-enclosure source of truth

The mount decision (video vs audio surface) and the playback-load enclosure selection must derive
from **one** resolved value. `useEmbedPlaybackLoad` loads with
`enclosureSelectedParams: 'use-active-item-or-default'` ([useEmbedPlaybackLoad.ts](apps/web/src/hooks/useEmbedPlaybackLoad.ts)),
so the resolved selection lives in `mpItemLabeledItemEnclosures` + `mpEnclosureSelectedParams`. The
video mount must read the **same** selection via `getSelectedLabeledItemEnclosureAndSource(...)` —
never compute a separate guess. If they could diverge, fix the resolver, not the call site.

### Video content-ready = identity match (no readyState)

`NonLiveMediaOrchestrator` / `useMediaElementBridge` do **not** expose `readyState` today, and adding
that plumbing is out of scope. Video readiness uses the **same identity-match pattern as audio**
(`getLoadedEmbedResourceIdentity` vs fallback identity, plus fallback display content) in
[embedPlayerContentReady.ts](apps/web/src/lib/embed/embedPlayerContentReady.ts). Remove the current
unconditional `mediaType === 'video' → true` shortcut.

### mediaType swap / playback continuity

`useRegisterMediaPlayerControlsBridge(bridge)` is called per orchestrator instance
([NonLiveMediaOrchestrator.tsx](apps/web/src/components/MediaPlayer/Controller/NonLiveMediaOrchestrator.tsx)
line 563). Flipping `mediaType` between `audio` and `video` remounts the element and resets playback.
Contract: resolve `mediaType` **once per loaded item** (from the item's selected enclosure) and keep
it stable for that item; only change it when the loaded item or the user-selected enclosure actually
changes. Document that an explicit alternate-enclosure swap (audio file ↔ video file) is allowed to
reload media.

### Autoplay (opt-in) + muted video

- `autoplay` stays **default false**; surfaced as an explicit builder control (already a builder
  checkbox — keep default off and document opt-in).
- When `autoplay=true` in **video** presentation: start the video **muted and playing**, render an
  unmute affordance on the controls overlay (minimal mute/unmute toggle — the only "special button"
  in scope). Audio presentation autoplay behavior is unchanged.

### Click-to-play model (video)

Clicking the video surface toggles play/pause. The info-overlay title is a toggle button in the
audio embed ([EmbedPlayerInfo.tsx](apps/web/src/components/embed/EmbedPlayerInfo.tsx) line 187); in
the video overlay it must not swallow the stage click — scope title-toggle click to the title text
only and let the surrounding stage handle play/pause.

## Reuse-first anchors

| Concern | Existing file |
| ------- | ------------- |
| Playback orchestrator | `NonLiveMediaOrchestrator`, `useNonLivePlaybackAvProps` |
| Embed audio mount | `EmbedInlineMediaMount.tsx` |
| Main app video mount | `NonLiveMediaMount.tsx` (floating portal — do not reuse portal; reuse orchestrator) |
| Info row | `EmbedPlayerInfo.tsx` |
| Controls row | `EmbedPlayerControls.tsx`, `MediaPlayerProgress.tsx` |
| Chapter selection | `selectItemChapterForTime.ts` |
| Art fallback | `buildMediaPlayerArtworkImageCandidates` |
| Layout tokens | `_embedLayoutTokens.scss`, `embedLayoutTokens.ts`, `embedLayoutDimensions.ts` |
| URL / iframe codegen | `buildEmbedUrl.ts`, `buildEmbedIframeCode.ts` |
| Builder UI | `EmbedBuilderPanel.tsx` |
| Content ready (video stub) | `embedPlayerContentReady.ts` (returns true for video today — must tighten) |

## Layout token additions (planned)

| Token / var | Purpose |
| ----------- | ------- |
| `--embed-video-aspect-ratio` | CSS `aspect-ratio` value (16/9, 4/3, 1/1) |
| `--embed-list-visible-rows` | Row count for list region height calc |
| `$embed-list-region-height` | `rows × $embed-list-row-height` |
| `$embed-video-list-player-height` | Fixed video box for list layout (replaces placeholder) |
| `$embed-video-overlay-bg` | Semi-transparent overlay backgrounds |
| `$embed-video-overlay-fade-ms` | Overlay auto-hide transition duration |

Keep TS mirrors in `embedLayoutTokens.ts` and `embedLayoutDimensions.ts` in sync with SCSS.

## Security: auto-resize postMessage

- **Off by default.** Embed only registers `ResizeObserver` / posts when `resize=1` in URL.
- **Message namespace:** e.g. `{ source: 'podverse-embed', type: 'resize', height: number }`.
- **Parent listener:** validate `event.origin` against allowlist (embed origin + optional
  `data-podverse-resize-origin` on iframe); ignore unknown messages.
- **Builder advanced section:** separate textarea for listener snippet; not included in default
  iframe code.
- **No `*` targetOrigin** in embed postMessage calls.

## File inventory (new + modified)

### New components / hooks

- `apps/web/src/components/embed/EmbedVideoStage.tsx`
- `apps/web/src/components/embed/EmbedVideoMediaMount.tsx`
- `apps/web/src/components/embed/EmbedVideoInfoOverlay.tsx`
- `apps/web/src/components/embed/EmbedVideoControlsOverlay.tsx`
- `apps/web/src/components/embed/EmbedVideoChapterTitleLine.tsx`
- `apps/web/src/components/embed/EmbedVideoCenterArt.tsx`
- `apps/web/src/hooks/useEmbedVideoOverlayVisibility.ts`
- `apps/web/src/hooks/useEmbedVideoAutoResize.ts`

### New lib

- `apps/web/src/lib/embed/parseEmbedAspectRatio.ts`
- `apps/web/src/lib/embed/parseEmbedListRows.ts`
- `apps/web/src/lib/embed/parseEmbedAutoResize.ts`
- `apps/web/src/lib/embed/embedAspectRatio.ts`
- `apps/web/src/lib/embed/embedResizeMessage.ts`
- `apps/web/src/lib/embed/buildEmbedResizeListenerSnippet.ts`
- `apps/web/src/lib/embed/__tests__/parseEmbedAspectRatio.test.ts`
- `apps/web/src/lib/embed/__tests__/parseEmbedListRows.test.ts`
- `apps/web/src/lib/embed/__tests__/embedLayoutDimensionsVideo.test.ts`

### New styles

- `EmbedVideoStage.module.scss`
- `EmbedVideoInfoOverlay.module.scss`
- `EmbedVideoControlsOverlay.module.scss`
- `EmbedVideoChapterTitleLine.module.scss`
- `EmbedVideoCenterArt.module.scss`

### Modified (representative)

- `EmbedPlayerPanel.tsx` — video branch → `EmbedVideoStage`
- `EmbedSingleShell.module.scss` — responsive single video shell
- `EmbedListShell.module.scss` — rows-driven list height; fixed vs auto-resize modes
- `_embedLayoutTokens.scss`, `_embedLayout.scss`, `embedLayoutTokens.ts`, `embedLayoutDimensions.ts`
- `parseEmbedQueryParams.ts`, `embedTypes.ts`, `buildEmbedUrl.ts`, `buildEmbedIframeCode.ts`
- `embedBuilderTypes.ts`, `parseEmbedBuilderQueryParams.ts`, `buildEmbedBuilderUrl.ts`
- `EmbedBuilderPanel.tsx`
- `EmbedListShell.tsx`, `EmbedSingleShell.tsx` — enable video playback load
- `embedPlayerContentReady.ts`
- `EmbedPlayerControls.tsx`, `MediaPlayerProgress.tsx` — chapter popover opt-in for video embed
- `docs/features/EMBED-PLAYER.md`
- E2E: extend `embed-routes.spec.ts`, `embed-share-builder.spec.ts`; add `embed-video-player.spec.ts`

## Deliverables in this plan set

- `00-EXECUTION-ORDER.md`
- `01-layout-tokens-and-responsive-single.md`
- `02-video-media-mount-and-playback.md`
- `03-video-overlays-info-controls-chapter.md`
- `04-list-count-and-video-list-fixed.md`
- `05-video-list-autoresize-advanced.md`
- `06-tests-e2e-and-docs.md`
- `COPY-PASTA.md`

## Out of scope

- Video-player special action buttons (future work).
- Builder color / theme customization.
- Livestream / video.js paths (non-live file video only).
