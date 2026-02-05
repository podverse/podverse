# Add-by-RSS Parity Subplan: Albums

## Goals
- Mirror non-add-by-RSS album list and detail views under add-by-RSS.
- Match visual layout/styling while allowing functional differences.
- Account for medium in view rendering and URL patterns.
- Support list and grid view modes for list pages.

## Scope
- Add-by-RSS album list view.
- Add-by-RSS album detail (channel) view.
- Local-only routing and index lookup.
- Feed URL title fallback when unparsed.

## Key References
- Non-add-by-RSS:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/albums](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/albums)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/album/[channel_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/album/[channel_id])
- Styles:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/podcast/PodcastList.module.scss](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/podcast/PodcastList.module.scss)
- Add-by-RSS utilities:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/addByRSS](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/addByRSS)

## Steps
1. Define add-by-RSS album list route and detail route mirroring non-add-by-RSS patterns.
   - Support paths: `/add-by-rss/albums`, `/add-by-rss/album/:id`.
2. Ensure URL patterns incorporate medium-specific identifiers as needed.
3. Build list and detail client components to mirror layout and composition.
4. Ensure list/grid view behavior matches non-add-by-RSS albums list.
5. Import shared styles from `PodcastList.module.scss`.
6. Use local-only index values for route resolution.
7. Add feed URL title fallback for unparsed album channels.

## Deliverables
- Add-by-RSS album list/detail routes and components.
- Medium-aware URL pattern and view rendering notes.
