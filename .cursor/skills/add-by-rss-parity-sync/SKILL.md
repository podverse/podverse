---
name: add-by-rss-parity-sync
description: Keeps add-by-RSS views in sync with non-add-by-RSS counterparts. Use when modifying podcasts/episodes/livestreams/artists/albums/tracks list or detail components, routes, or styles in apps/web.
---

# Add-by-RSS Parity Sync

## Instructions

- When editing non-add-by-RSS list or detail views for podcasts, episodes, livestreams, artists, albums, or tracks, check the corresponding add-by-RSS components and update them to match visual/layout changes.
- Reuse the same SCSS modules between non-add-by-RSS and add-by-RSS components unless the add-by-RSS view has unique layout requirements.
- Ensure add-by-RSS list views support both list and grid rendering when their non-add-by-RSS equivalents do.
- Keep add-by-RSS routes aligned with:
  - `/add-by-rss/podcasts`, `/add-by-rss/podcast/:id`
  - `/add-by-rss/episodes`, `/add-by-rss/episode/:id`
  - `/add-by-rss/livestreams`, `/add-by-rss/livestream/:id`
  - `/add-by-rss/artists`, `/add-by-rss/artist/:id`
  - `/add-by-rss/albums`, `/add-by-rss/album/:id`
  - `/add-by-rss/tracks`, `/add-by-rss/track/:id`
- Add-by-RSS routes must resolve via locally stored index values only.
- For add-by-RSS channel views (podcast/artist/album), show the feed URL as a title fallback until parsed fields are available.

## Examples

- Updating `apps/web/src/app/podcasts/PodcastsClient.tsx` layout: mirror layout updates in add-by-RSS podcast list components and keep list/grid parity.
- Changing `PodcastList.module.scss`: ensure add-by-RSS detail views importing this style remain compatible and reflect the same UI structure.
