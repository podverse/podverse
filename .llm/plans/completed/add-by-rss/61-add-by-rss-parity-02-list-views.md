# Add-by-RSS Parity Subplan 02: List Views

## Goals
- Mirror non-add-by-RSS list views for podcasts, episodes, livestreams, artists, albums, and tracks.
- Reuse existing non-add-by-RSS styles to keep visuals in sync.
- Support both list and grid view modes.

## Scope
- List pages and list client components only.
- Visual parity only; functional differences allowed.

## Key References
- Non-add-by-RSS list pages and clients:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcasts](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcasts)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episodes](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episodes)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcasts/livestreams](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcasts/livestreams)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/artists](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/artists)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/albums](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/albums)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/tracks](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/tracks)
- Styling sources:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/podcasts/livestreams/LivestreamsList.module.scss](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/podcasts/livestreams/LivestreamsList.module.scss)

## Steps
1. For each content type, create add-by-RSS list routes and list client components that mirror layout and structure.
   - Support paths:
     - `/add-by-rss/podcasts`, `/add-by-rss/artists`, `/add-by-rss/albums`
     - `/add-by-rss/tracks`, `/add-by-rss/episodes`, `/add-by-rss/livestreams`
2. Reuse list composition patterns:
   - Same top-level layout container.
   - Same list grid or list component composition.
3. Ensure list/grid toggle behavior mirrors the non-add-by-RSS views.
3. Account for medium in list rendering and route parameters.
4. Import and reuse the same SCSS modules used by non-add-by-RSS list views where applicable.
5. Wire add-by-RSS data sources:
   - Use add-by-RSS storage/index data to populate list items.
   - Avoid server lookups; data is local-only.
6. Validate empty-state rendering:
   - Ensure empty states match layout/spacing of non-add-by-RSS views.

## Deliverables
- Add-by-RSS list pages and list client components for all target content types.
- Verified style parity by SCSS module reuse.

## Risks / Open Questions
- Some list views may depend on list components not yet compatible with add-by-RSS data shapes.
