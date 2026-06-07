# 02 — Single embed UI and playback reuse

## Objective

Implement the single-item embed experience with fixed height and playback behavior that reuses existing
player decision logic under embed-mode guardrails from Phase 1.

## Prerequisites

- Phase 1 complete (minimal layout, embed-mode flags, query parser, noindex).
- Read playback mode contract in [`00-SUMMARY.md`](./00-SUMMARY.md).

## Scope

- Single embed layout (audio full behavior, video placeholder only).
- Fixed dimensions and section composition:
  - full-width
  - fixed height ~`180px`
  - top ~75% inline player region (inside embed shell, not global dock)
  - bottom footer row with branding + links
- Single-line truncation for all text fields.
- Chapter title append behavior when chapter-based playback target is active.
- Embed-mode playback integration (no queue restore, no auto-queue, no dock layout mutations).

## File targets

- `/apps/web/src/app/embed/**` (single route pages)
- `/apps/web/src/components/embed/*` (new single embed UI components)
- `/apps/web/src/styles/components/embed/*` (new styles)
- Reuse touch points:
  - `/apps/web/src/lib/embed/*` (embed-mode helpers from Phase 1)
  - `/apps/web/src/lib/playback/*`
  - `/apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx`
  - `/apps/web/src/contexts/MediaPlayerControls.tsx`
  - `/apps/web/src/utils/mediaPlayer/mediaPlayerInfoResolution.ts`

## UX contract

- Footer content:
  - Podverse branding at left
  - About link in footer navigation region
  - Open Source link right-aligned
- Ignore lightning icon for this phase.
- If detected media is video:
  - show a concise "coming soon" placeholder inside player panel
  - still render footer and stable embed shell

## Playback integration contract

- Render playback controls **inline** in the embed player region; do not rely on global `#media-player`
  aside from root layout (excluded by embed layout).
- Load media via existing playback entry points (`useMediaPlayerResourceUpdate`, playback decision
  matrix) with embed-mode flag set:
  - URL `autoplay` → `shouldPlay` on playback load input,
  - URL `t` → explicit start seconds on playback load input,
  - no anonymous playback restore on embed first visit,
  - no auto-queue or queue-resource now-playing side effects.
- Invalid/missing resource IDs render a stable error/not-found shell inside embed root (no throw).

## Test-target contract

Add stable selectors on embed shell components for E2E (Phase 5):

| Element | `data-testid` |
| --- | --- |
| Embed root | `embed-root` |
| Player region | `embed-player-region` |
| Title line | `embed-title` |
| Video placeholder | `embed-video-placeholder` |
| Footer | `embed-footer` |

## Implementation notes

- Prefer existing playback entry points over custom imperative player logic.
- Keep single-line text with existing ellipsis patterns/mixins.
- Ensure the chapter suffix format is deterministic and readable (e.g. `{itemTitle} — {chapterTitle}`).
- Keep layout resilient to long titles and narrow widths.
- Do not assert against `aside#media-player` in embed tests — that element is absent in embed layout.

## Acceptance criteria

- Single embed renders correctly under minimal layout for:
  - episode, track, clip, chapter, official-clip routes
- Audio targets fully load and play via inline embed player region.
- Video targets render placeholder state only (`embed-video-placeholder` visible).
- Chapter title is appended to item title in embed UI when chapter mode is active.
- Footer layout consistently matches left/center-right/right alignment intent.
- Embed playback does **not** trigger anonymous queue restore or auto-queue mutations.
- Invalid resource IDs show stable not-found shell (no uncaught error page).
- Required `data-testid` hooks are present on embed shell components.
