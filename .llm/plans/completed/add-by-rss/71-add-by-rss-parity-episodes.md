# Add-by-RSS Parity Subplan: Episodes

## Goals
- Mirror non-add-by-RSS episode list and detail views under add-by-RSS.
- Match visual layout/styling while allowing functional differences.
- Account for medium in view rendering and URL patterns.
- Support list and grid view modes for list pages.

## Scope
- Add-by-RSS episode list view.
- Add-by-RSS episode detail (item) view.
- Local-only routing and index lookup.

## Key References
- Non-add-by-RSS:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episodes](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episodes)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episode/[item_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episode/[item_id])
- Styles:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/podcast/PodcastList.module.scss](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/podcast/PodcastList.module.scss)
- Add-by-RSS utilities:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/addByRSS](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/addByRSS)

## Steps
1. Define add-by-RSS episode list route and detail route mirroring non-add-by-RSS patterns.
   - Support paths: `/add-by-rss/episodes`, `/add-by-rss/episode/:id`.
2. Ensure URL patterns incorporate medium-specific identifiers as needed.
3. Build list and detail client components to mirror layout and composition.
4. Ensure list/grid view behavior matches non-add-by-RSS episodes list.
5. Import shared styles from `PodcastList.module.scss` where used by detail views.
6. Use local-only index values for route resolution.

## Deliverables
- Add-by-RSS episode list/detail routes and components.
- Medium-aware URL pattern and view rendering notes.
