# Add-by-RSS Parity Subplan 01: Inventory and Local Routing

## Goals
- Enumerate the non-add-by-RSS list/detail components for the target content types.
- Define the add-by-RSS route map that mirrors existing routes.
- Ensure add-by-RSS URLs resolve only via locally available index values.

## Scope
- Podcasts, episodes, livestreams, artists, albums, tracks.
- Add-by-RSS routing structure under `apps/web/src/app/add-by-rss/...`.
- Local-only resolution using add-by-RSS index values.

## Key References
- Non-add-by-RSS list/detail components:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcasts](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcasts)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/[channel_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/[channel_id])
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episodes](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episodes)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episode/[item_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episode/[item_id])
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcasts/livestreams](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcasts/livestreams)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/livestream/[item_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/livestream/[item_id])
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/artists](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/artists)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/artist/[channel_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/artist/[channel_id])
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/albums](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/albums)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/album/[channel_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/album/[channel_id])
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/tracks](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/tracks)
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/track/[item_id]](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/track/[item_id])
- Add-by-RSS utilities and storage:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/addByRSS](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/addByRSS)

## Steps
1. Inventory each target content type:
   - Identify the list page, list component, and client component.
   - Identify the detail page, detail component, and client component.
2. Define add-by-RSS route equivalents:
   - List pages under `apps/web/src/app/add-by-rss/[resource]/page.tsx`.
   - Detail pages under `apps/web/src/app/add-by-rss/[resource]/[id_text]/page.tsx`.
   - Explicitly support paths:
     - `/add-by-rss/podcasts`, `/add-by-rss/podcast/:id`
     - `/add-by-rss/episodes`, `/add-by-rss/episode/:id`
     - `/add-by-rss/livestreams`, `/add-by-rss/livestream/:id`
     - `/add-by-rss/artists`, `/add-by-rss/artist/:id`
     - `/add-by-rss/albums`, `/add-by-rss/album/:id`
     - `/add-by-rss/tracks`, `/add-by-rss/track/:id`
3. Account for medium in URL patterns and view rendering.
4. Document local-only URL requirements:
   - Add-by-RSS routes must resolve using locally stored index values only.
   - Identify the exact index fields used to build and decode `id_text`.
5. Produce a route map table in this subplan file:
   - Non-add-by-RSS route -> add-by-RSS route.
   - Local index lookup key for add-by-RSS route resolution.

## Deliverables
- A complete route map with local index lookup keys for all target content types.
- A short note on any content types that require new local index keys or storage.

## Risks / Open Questions
- Missing local index values for some content types may require new storage or ID mapping utilities.
