# 03 — Tablet split detail + player layout (18.3, 18.4)

**Detail docs:** [512-tablet-split-detail](/docs/proposals/mobile/_master-plan_/phase-1/details/512-tablet-split-detail.md),
[513-tablet-player-layout](/docs/proposals/mobile/_master-plan_/phase-1/details/513-tablet-player-layout.md)
**Model:** Codex 5.3
**Requires:** plan 02 (`useResponsive()` + breakpoints).

## Tasks

### Split podcast detail (18.3)

1. In [`PodcastDetailScreen.tsx`](/apps/mobile/src/screens/podcast/PodcastDetailScreen.tsx), branch
   on `useResponsive().isTablet` (prefer landscape / ≥ `lg`):
   - **Phone / `!isTablet`:** current stacked layout — unchanged component tree.
   - **Tablet:** a row with a left detail pane (max width) + right episode-list pane (`flex: 1`).
2. Reuse existing header + episode-list components (re-parent only). Episode tap still navigates to
   `EpisodeDetailScreen`. No new data fetching. Add `testID="podcast-detail-split"` on the tablet
   container; preserve existing ids.

### Tablet player layout (18.4)

3. In [`MiniPlayer.tsx`](/apps/mobile/src/components/player/MiniPlayer.tsx), cap content width on
   tablet (`maxWidth` = `lg` value) and center; phone stays full-bleed.
4. In [`FullPlayerScreen.tsx`](/apps/mobile/src/screens/player/FullPlayerScreen.tsx), on tablet
   render a two-column layout (artwork left; title/controls/up-next right) behind `isTablet`; phone
   keeps the vertical stack. Add `testID="full-player-two-column"`.
5. Reuse existing artwork/transport/up-next components; tokens from `@podverse/design-tokens` — no
   hardcoded hex/px. Rotation must not remount the audio engine.

## Acceptance

- Phone podcast detail, mini player, and full player unchanged.
- Tablet: podcast detail side-by-side; mini player width-capped/centered; full player two-column.
- All transport controls and episode navigation behave as before.

## Do not

- No inline episode preview / third pane (Track 23). No transcript/video reflow (Track 21).
- Do not run tests during agent work.
