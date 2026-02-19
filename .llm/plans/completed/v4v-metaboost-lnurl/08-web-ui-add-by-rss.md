# 08 - Web UI (Add-by-RSS Parity)

## Goal

Keep add-by-RSS boost workflows in parity with core V4V UI, including metaBoost display and logic.

## Target Repo

- `/Users/mitcheldowney/repos/pv/podverse`

## Key Files

- `apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx`
- `apps/web/src/components/AddByRSS/Artist/AddByRSSArtistHeader.tsx`
- `apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumHeader.tsx`

## Tasks

1. **UI parity**
   - Mirror metaBoost display and logic from core UI.
   - Ensure add-by-RSS views omit share buttons.

2. **Workflow parity**
   - Use metaBoost endpoint when present; fallback when absent.
   - Keep add-by-RSS behavior consistent with existing constraints.

## Output

- Add-by-RSS V4V flow matches core flow and supports metaBoost.

