# 512-tablet-split-detail

**Master step:** 18.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Optional two-pane layout on tablets for podcast detail: podcast header/metadata on the left, the
episode list on the right, side-by-side. Phone keeps the existing single, vertically-scrolling
layout.

1. Use `useResponsive().isTablet` (from 511) to branch in
   [`PodcastDetailScreen.tsx`](/apps/mobile/src/screens/podcast/PodcastDetailScreen.tsx):
   - **Phone:** current stacked layout (header → episode list) — unchanged.
   - **Tablet (landscape or ≥ `lg`):** a row with a left detail pane (fixed/max width) and a
     right episode-list pane (`flex: 1`). Selecting an episode still navigates to
     `EpisodeDetailScreen` (do **not** build an inline third pane — that is Track 23 polish).
2. Keep it a **functional sketch**: reuse existing header + list components, just re-parent them
   into the two-pane container behind the `isTablet` branch. No new data fetching.
3. `testID`s: `podcast-detail-split` (container, tablet only), preserve existing
   `podcast-detail-*` ids.

## Acceptance criteria

- Phone layout byte-for-byte unchanged (same component tree behind the `!isTablet` branch).
- Tablet renders detail + episode list side-by-side; episode tap routes to episode detail.
- No duplicated data fetching; both panes read the same loaded podcast/episodes state.

## Web parity references

- [`apps/web/src/app/podcast/[podcast_id]/PodcastPageClient.tsx`](/apps/web/src/app/podcast/[podcast_id]/PodcastPageClient.tsx)
  — detail + episode list information hierarchy (web is single-column; tablet split is an
  adaptation, not a web mirror).

## Non-goals

- Inline episode preview pane / three-pane master-detail (Track 23 operator polish).
- Split view on any other screen (only podcast detail for this step).

## Verification

```bash
npm run mobile:ios -- --device "iPad Pro 13-inch (M4)"
```
