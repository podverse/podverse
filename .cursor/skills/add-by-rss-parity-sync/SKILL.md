---
name: add-by-rss-parity-sync
description: Keeps add-by-RSS views in sync with non-add-by-RSS counterparts. Use when modifying podcasts/episodes/livestreams/artists/albums/tracks list or detail components, routes, or styles in apps/web.
---

# Add-by-RSS Parity Sync

## Instructions

- When editing non-add-by-RSS list or detail views for podcasts, episodes, livestreams, artists, albums, or tracks, check the corresponding add-by-RSS components and update them to match visual/layout changes.
- For add-by-RSS detail views, mirror the non-add-by-RSS layout as closely as possible, including headers, tabs, and list row styling.
- Add-by-RSS podcast detail tabs should omit clips; episodes, about, and settings remain.
- Do not include Share buttons on add-by-RSS headers; these pages are not shareable.
- Reuse the same SCSS modules between non-add-by-RSS and add-by-RSS components unless the add-by-RSS view has unique layout requirements.
- Ensure add-by-RSS list views support both list and grid rendering when their non-add-by-RSS equivalents do.
- When syncing list/detail layouts, reuse shared wrappers (e.g., `DetailListWrapper`) used by the
  non-add-by-RSS page to keep spacing and loading overlays consistent.
- Keep add-by-RSS routes aligned with:
  - `/add-by-rss/podcasts`, `/add-by-rss/podcast/:id`
  - `/add-by-rss/episodes`, `/add-by-rss/episode/:id`
  - `/add-by-rss/livestreams`, `/add-by-rss/livestream/:id`
  - `/add-by-rss/artists`, `/add-by-rss/artist/:id`
  - `/add-by-rss/albums`, `/add-by-rss/album/:id`
  - `/add-by-rss/tracks`, `/add-by-rss/track/:id`
- Add-by-RSS routes must resolve via locally stored index values only.
- For add-by-RSS channel views (podcast/artist/album), show the feed URL as a title fallback until parsed fields are available.
- Add-by-RSS episode/track/livestream rows should include the same MoreButton menu as non-add-by-RSS; placeholder handlers are acceptable when behavior is unavailable.
- Add-by-RSS settings tabs should include a refresh feed action and parse status display using the
  add-by-RSS parser flow for the single feed.

## Examples

- Updating `apps/web/src/app/podcasts/PodcastsClient.tsx` layout: mirror layout updates in add-by-RSS podcast list components and keep list/grid parity.
- Changing `PodcastList.module.scss`: ensure add-by-RSS detail views importing this style remain compatible and reflect the same UI structure.
- Adjusting detail layout wrappers: if a non-add-by-RSS page wraps content with `DetailListWrapper`,
  ensure the add-by-RSS page does the same to keep loading overlays aligned.
