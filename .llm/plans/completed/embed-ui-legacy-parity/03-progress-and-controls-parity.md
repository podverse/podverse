# 03 — Progress and controls parity

## Objective

Full-width progress bar with elapsed/total timestamps visible inside embed iframes.

## File targets

- `apps/web/src/components/embed/EmbedPlayerControls.tsx`
- `apps/web/src/styles/components/embed/EmbedPlayerControls.module.scss`

## Changes

1. In `.progressRow`, `:global` override `.mediaPlayerProgress`:
   - `width: 100%`
   - `max-width: 100%`
   - `flex: 1 1 auto`
2. Force desktop timestamps visible in embed:
   - `:global(.mediaPlayerProgressTime)` and `:global(.mediaPlayerProgressDuration)` → `display: block` (or flex)
   - Hide mobile-only time wrapper if it appears at iframe widths
3. Add `data-testid="embed-player-controls"` on controls root.
4. Keep layout: progress row, then right-aligned speed + play.

## Acceptance criteria

- Progress slider (`role="slider"`) and time labels visible on single and list embed headers.
