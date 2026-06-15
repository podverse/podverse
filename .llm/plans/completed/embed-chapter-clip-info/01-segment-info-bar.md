# 01 — Segment info bar (video embed)

## Goal

Add `EmbedSegmentInfoBar` as a fixed-height overlay flush above the bottom controls in video mode. Shows segment title (left) and start–end time (right) for chapter, clip, or item_soundbite.

## Tasks

1. Add tokens: `EMBED_CONTROLS_OVERLAY_HEIGHT_PX` (60), `EMBED_SEGMENT_INFO_BAR_HEIGHT_PX` (28) in `embedLayoutTokens.ts` and `_embedLayoutTokens.scss`; expose via `_embedLayout.scss` CSS vars.
2. Add `resolveEmbedActiveSegmentInfo.ts` — returns `{ title, startSeconds, endSeconds | null } | null` for clip, soundbite, or chapter (time-based + pinned + fallback).
3. Add `EmbedSegmentInfoBar.tsx` + SCSS; use `formatHHMMSS` for times.
4. Update `EmbedVideoStage.tsx` + SCSS: third layer `.overlaySegment` at `bottom: var(--embed-controls-overlay-height)`.
5. Remove `EmbedVideoChapterTitleLine` from `EmbedVideoControlsOverlay`; delete old component files.
6. Update `embedLayoutTokens.sync.test.ts` and add unit test for resolver.
7. Update E2E `embed-video-player.spec.ts` if needed for new testid `embed-segment-info-bar`.

## Verification

```bash
npm run test -w apps/web -- src/lib/embed/__tests__/embedLayoutTokens.sync.test.ts src/lib/embed/__tests__/resolveEmbedActiveSegmentInfo.test.ts
make e2e_test_web_report_spec SPEC=e2e/embed-video-player.spec.ts
```
