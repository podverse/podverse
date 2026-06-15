# 06 — Tests, E2E, and documentation

## Objective

Add unit and E2E coverage for the video embed player, list row configuration, and auto-resize
contracts. Update operator documentation. Remove dead placeholder code paths where safe.

## Prerequisites

- Phases 1–5 complete.

## Scope

- Vitest unit tests for new parsers and layout math.
- Playwright E2E specs for video UX (single, list, chapters, overlays, builder options).
- Update `docs/features/EMBED-PLAYER.md`.
- Seed/demo fixtures if needed for video samples.
- Delete or deprecate `EmbedVideoPlaceholder` from active code paths.

## File targets

### New E2E

- `apps/web/e2e/embed-video-player.spec.ts` — primary video behavior spec

### Extend existing E2E

- `apps/web/e2e/embed-routes.spec.ts` — video presentation routes, aspect ratio param
- `apps/web/e2e/embed-share-builder.spec.ts` — builder aspect ratio, rows, auto-resize advanced
- `apps/web/e2e/embed-demo-index.spec.ts` — demo index video variants if present
- `apps/web/e2e/helpers/embedAssertions.ts` — helpers for overlay visibility, chapter title line

### Unit tests (consolidate if already added in earlier phases)

- `apps/web/src/lib/embed/__tests__/parseEmbedAspectRatio.test.ts`
- `apps/web/src/lib/embed/__tests__/parseEmbedListRows.test.ts`
- `apps/web/src/lib/embed/__tests__/embedLayoutDimensionsVideo.test.ts`
- `apps/web/src/lib/embed/__tests__/embedResizeMessage.test.ts`
- `apps/web/src/lib/embed/__tests__/buildEmbedIframeCode.test.ts` — responsive wrapper output

### Docs

- `docs/features/EMBED-PLAYER.md`

### Seed / demo (required)

- Confirm a seeded item with a **video enclosure** exists for embed E2E; if not, add one
  (`embSmpEpVid1` or similar) in `tools/generate-data/` / E2E seed scripts and seed constants. This is
  required to exercise the `<video>` path and is not optional.

## E2E scenarios (`embed-video-player.spec.ts`)

Follow `e2e-page-tests`, `e2e-readability`, `e2e-screenshot-verified-element` skills.

### Single video embed

1. Navigate to video presentation episode embed (`?presentation=video` or video medium item).
2. Verify `embed-video-stage` visible; no "coming soon" text.
3. Verify `<video>` element present when item has video enclosure.
4. Verify info overlay (`embed-player-info`) and controls (`embed-player-controls`) visible when paused.
5. Click play; verify overlays fade/hide after idle (use `expect` with timeout ~4s).
6. Hover stage; verify overlays visible again.

### Audio file in video presentation

1. Load podcast audio episode with `?presentation=video`.
2. Verify `embed-video-center-art` visible (not `<video>`).
3. Verify playback starts on play button.

### Autoplay (opt-in) + muted video

1. Load video presentation embed WITHOUT `autoplay` → verify it does not start playing (default off).
2. Load with `?presentation=video&autoplay=true` → verify video starts playing and is muted.
3. Verify `embed-video-mute-toggle` unmutes.

### Click-to-play

1. Click the video stage surface → toggles play/pause.
2. Click a control button (play/more/mute) → does not double-toggle the stage.

### Chapter UX (video)

1. Use seeded chaptered podcast (`embSmpEpAud1` + `presentation=video`).
2. Verify `embed-video-chapter-title` updates when seeking across chapter boundary.
3. Hover progress bar; verify chapter tooltip appears (distinct from audio embed — run comparison
   spec or same spec with audio presentation asserting tooltip absent).

### Aspect ratio

1. Load `?presentation=video&ar=1x1`; verify stage aspect ratio via bounding box ratio (~1:1 tolerance).

### List video embed

1. Load podcast list `?presentation=video&rows=3`.
2. Verify list region height ≈ 3 × 48px (measure `embed-list-region`).
3. Select row; verify video stage updates.

### Builder

1. Open embed builder for episode; select video type.
2. Change aspect ratio; verify preview iframe wrapper updates.
3. Select video-list; set rows to 7; verify generated iframe height in code field changes.
4. Enable auto-resize advanced; verify `resize=1` in URL and listener snippet visible.

## Unit test highlights

### buildEmbedIframeCode

- Single video → responsive div wrapper + absolute iframe; correct padding-bottom per `ar`.
- Single audio → numeric height only.
- List video → numeric height function of rows.

### embedResizeMessage

- Valid/invalid message discrimination.
- Rejects wrong `source` / `type` / non-number height.

### Layout dimensions

- `getEmbedListIframeHeightPx({ rows: 5, presentation: 'video' })` matches SCSS formula.
- rows 2 and 10 boundaries.

## Documentation updates (`EMBED-PLAYER.md`)

Add sections:

### Video presentation

- Overlay behavior (paused / hover / auto-hide).
- Audio file in video mode (center art).
- Chapter title line vs audio embed title behavior.
- Chapter popover on progress bar (video only).

### Query parameters (extend table)

| Param | Default | Notes |
| ----- | ------- | ----- |
| `ar` | `16x9` | `16x9`, `4x3`, `1x1` |
| `rows` | `5` | List only; 2–10 visible rows |
| `resize` | off | List + video only; requires parent listener |

### Iframe sizing

- Single video: responsive wrapper (document HTML example).
- List video default: fixed height formula.
- List video advanced: auto-resize setup steps + security notes.

### Breaking change

- Default list visible rows reduced from ~12 to 5 (document old vs new heights).

## Cleanup

- Remove `EmbedVideoPlaceholder` usage from `EmbedPlayerPanel` (file can remain temporarily with
  `@deprecated` comment or delete if no imports).
- Update demo page copy if it references "video coming soon".

## Acceptance criteria

- Unit tests cover new parsers, iframe wrapper, resize message guard, layout height helpers.
- E2E spec covers single video, audio-in-video, chapter line, overlay hide/show, list rows, builder
  controls.
- `EMBED-PLAYER.md` documents all new params and sizing modes.
- No "coming soon" in video embed production path.
- Existing audio embed E2E still pass (regression).

## Out of scope

- Full third-party integrator E2E for postMessage (document manual verification).
- Special video buttons (future plan).
