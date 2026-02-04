# Add-by-RSS Parity Subplan: Livestreams

## Goals
- Mirror non-add-by-RSS livestream list and detail views under add-by-RSS.
- Match visual layout/styling while allowing functional differences.
- Account for medium in view rendering and URL patterns.
- Support list and grid view modes for list pages.

## Scope
- Add-by-RSS livestream list view.
- Add-by-RSS livestream detail (item) view.
- Local-only routing and index lookup.

## Key References
- Non-add-by-RSS:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcasts/livestreams](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcasts/livestreams)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/livestream/[item_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/livestream/[item_id])
- Styles:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/podcasts/livestreams/LivestreamsList.module.scss](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/podcasts/livestreams/LivestreamsList.module.scss)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/podcast/PodcastList.module.scss](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/podcast/PodcastList.module.scss)
- Add-by-RSS utilities:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/addByRSS](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/addByRSS)

## Steps
1. Define add-by-RSS livestream list route and detail route mirroring non-add-by-RSS patterns.
   - Support paths: `/add-by-rss/livestreams`, `/add-by-rss/livestream/:id`.
2. Ensure URL patterns incorporate medium-specific identifiers as needed.
3. Build list and detail client components to mirror layout and composition.
4. Ensure list/grid view behavior matches non-add-by-RSS livestreams list.
5. Import shared styles from `LivestreamsList.module.scss` and `PodcastList.module.scss` as applicable.
6. Use local-only index values for route resolution.

## Deliverables
- Add-by-RSS livestream list/detail routes and components.
- Medium-aware URL pattern and view rendering notes.
