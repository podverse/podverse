# Add-by-RSS Parity Subplan 03: Detail Views and Fallbacks

## Goals
- Mirror non-add-by-RSS detail views for podcasts, episodes, livestreams, artists, albums, and tracks.
- Provide feed URL title fallback for add-by-RSS channel views until parser fills required fields.

## Scope
- Detail pages and detail client components.
- Channel-type views: podcasts, artists, albums.
- Item-type views: episodes, tracks, livestreams.

## Key References
- Non-add-by-RSS detail pages and clients:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/[channel_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/[channel_id])
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episode/[item_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episode/[item_id])
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/livestream/[item_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/livestream/[item_id])
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/artist/[channel_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/artist/[channel_id])
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/album/[channel_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/album/[channel_id])
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/track/[item_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/track/[item_id])
- Shared detail list styles:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/podcast/PodcastList.module.scss](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/podcast/PodcastList.module.scss)

## Steps
1. For each content type, create add-by-RSS detail routes and detail client components that mirror layout and structure.
   - Support paths:
     - `/add-by-rss/podcast/:id`, `/add-by-rss/artist/:id`, `/add-by-rss/album/:id`
     - `/add-by-rss/track/:id`, `/add-by-rss/episode/:id`, `/add-by-rss/livestream/:id`
2. Reuse non-add-by-RSS styles by importing the same SCSS modules (e.g., `PodcastList.module.scss`).
3. Account for medium in detail rendering and route parameters.
4. Implement title fallbacks for channel views:
   - If required channel fields are unparsed, show the feed URL as the title.
   - Keep layout consistent with non-add-by-RSS title blocks.
5. Handle missing metadata gracefully:
   - Only display fields when available.
   - Keep spacing and block ordering aligned with non-add-by-RSS views.
6. Ensure local-only lookup:
   - Detail views resolve via local index values only (no server fetch).

## Deliverables
- Add-by-RSS detail pages and client components for all target content types.
- Feed URL title fallback for unparsed channel views.

## Risks / Open Questions
- Some detail layouts may depend on server-only fields that are not available locally.
