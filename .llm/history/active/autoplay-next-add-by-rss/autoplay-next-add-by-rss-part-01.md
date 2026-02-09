# Autoplay Next (Add-by-RSS)

## Session 1 - 2025-02-07

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself. To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- 4a (next from queue when row is add-by-RSS) and 4b (list context + next from list) were implemented in prior session; this session completed 4b by wiring listContext from list nodes into rows.
- List nodes pass `listContext={{ feedIdText, itemIdTexts, currentIndex }}` and `indexItem` where needed: AddByRSSEpisodesListNodes, AddByRSSEpisodeNodes, AddByRSSTrackNodes, AddByRSSLivestreamNodes.

#### Files Modified

- apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodesListNodes.tsx (listContext + indexItem for rows)
- apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeNodes.tsx (listContext for rows)
- apps/web/src/components/AddByRSS/Artist/Album/Track/AddByRSSTrackNodes.tsx (listContext for rows)
- apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamNodes.tsx (listContext for rows)

## Session 2 - 2026-02-07

#### Prompt (Developer)

figure out why the "play next from queue" feature is failing for add by rss

#### Key Decisions

- Root cause: `useQueueResourcesLoadActive` was checking `is_active_queue` first, which selected the AV queue even when add-by-RSS music tracks were in the Music queue.
- Fix: When `medium_id` is provided (from the ended item), use it to find the correct queue first, then fall back to `is_active_queue` and AV queue.
- Also fixed: Media player flickering during track transitions by only clearing `mpAddByRSS` when there are no more items in the queue.

#### Files Modified

- apps/web/src/hooks/useQueueResourcesLoadActive.tsx (prioritize medium_id over is_active_queue when provided)
- apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx (pass medium_id, fix transition flicker)
- apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx (removed debug logs)
- apps/web/src/utils/addByRSS/playFromQueueResource.ts (removed debug logs)

## Session 3 - 2026-02-07

#### Prompt (Developer)

when i play a now playing item, i see it is saved at the 0 list_position in queue_resource. then before it finishes playing, I reload the page and I expect that when I reload the page that the Media player would load with that unfinished item. but instead the media player does not load at all.

#### Key Decisions

- Root cause: On page reload, no queue had `is_active_queue=true` for the Music queue, so the code fell back to AV queue which had no now-playing item.
- Fix Part 1: Set `is_active_queue=true` when items are added to now-playing in `queueResource.ts` (both add-by-RSS and non-add-by-RSS items).
- Fix Part 2: Added fallback in `useQueueResourcesLoadActive` to check ALL queues for a now-playing item if no `is_active_queue` is set.

#### Files Modified

- packages/orm/src/services/queue/queueResource.ts (added `_setQueueAsActiveTransactional` helper, called from `_addResourceToNowPlayingTransactional` and `_addItemAddByRSSToNowPlayingTransactional`)
- apps/web/src/hooks/useQueueResourcesLoadActive.tsx (added fallback to check all queues for now-playing if no is_active_queue found)

## Session 4 - 2026-02-07

#### Prompt (Developer)

When I clear the Q resource table and I set all of the Qs to have is active Q as false Then I reload the web page and play a track, an add by RSS track An error is thrown and the Q does not get an is active Q true

#### Key Decisions

- Root cause: `_setQueueAsActiveTransactional` used `manager.update('Queue', { account_id, ... }, ...)` but `account_id` is not a recognized entity property - it's a join column for the `account` relation.
- Fix: Use query builder pattern instead, which allows querying by actual database column name.

#### Files Modified

- packages/orm/src/services/queue/queueResource.ts (fixed `_setQueueAsActiveTransactional` to use query builder)

## Session 5 - 2026-02-07

#### Prompt (Developer)

The Ad by RSS podcasts and music elements are not rendering fully properly on the queues page. I see the title load, but it is aligned to the top instead of centered in the element and there is no Image or any other information The Q list rows should appear identical or nearly identical for both the core and add by RSS types of entities

#### Key Decisions

- Add-by-RSS items in `ListQueueResourceRow` were rendering with only a bare `<h3>` title element
- Updated to match the full rendering of core items: image, channel title, pub date, and duration for episodes/podcasts; image, title, and artist name for music tracks
- Used existing CSS classes from `ListEpisodeRow.module.scss` which already had `.trackRow`, `.trackTitle`, `.trackArtist` etc.
- Data extracted from `add_by_rss_resource_data`: `item_images`, `channel_images`, `channel_image_url`, `channel_title`, `pub_date`, `duration`, `medium_id`

#### Files Modified

- apps/web/src/components/List/Queues/ListQueueResourceRow.tsx (expanded add-by-RSS rendering to include image, channel info, date, duration)

## Session 6 - 2026-02-07

#### Prompt (Developer)

When you save an ad by RSS data Value to the column. It should contain the full Item and channel data with it So that If the user switches to a different device that has not Parsed that feed yet, but it is in their queue. it should have all of the potential information needed to give a maximum user experience So that will require the item and channel in the add by RSS data value This may not be very efficient, but we want to ensure all the data is there for now. If this is a large scope task, then we may need to break it into subplans.

#### Key Decisions

- Store full item data in `add_by_rss_resource_data` for cross-device access (when IndexedDB is unavailable)
- For episodes/tracks: include the entire `bundle` (ParsedRSSFeedCompatBundle['items'][number])
- For livestreams: include both `liveItem` and `livestream_item` (raw item data)
- Fallback logic: try IndexedDB first (fastest, latest data), then reconstruct from embedded bundle data
- Trade-off: larger database payload per queue item, but ensures full functionality across devices

#### Files Modified

- apps/web/src/utils/addByRSS/queuePlaylistHelpers.ts (added bundle/liveItem/livestream_item to payload)
- packages/helpers/src/dtos/addByRSSResourceData.ts (added bundle/liveItem/livestream_item type fields)
- apps/web/src/utils/addByRSS/playFromQueueResource.ts (added reconstructItemFromResourceData, reconstructLivestreamFromResourceData fallback functions)

## Session 7 - 2026-02-07

#### Prompt (Developer)

parser mapping

#### Key Decisions

- Moved add-by-RSS index item types and reconstruction functions to `@podverse/parser-mapping` for cross-platform reuse (web, mobile, etc.)
- Types (`AddByRSSItemIndexItem`, `AddByRSSLivestreamIndexItem`, `AddByRSSMappedFeed`) now exported from parser-mapping
- Reconstruction functions (`reconstructAddByRSSItemFromResourceData`, `reconstructAddByRSSLivestreamFromResourceData`) now in parser-mapping
- Web app re-exports types from parser-mapping and uses shared reconstruction functions

#### Files Modified

- packages/parser-mapping/src/addByRSS/types.ts (new - shared add-by-RSS index item types)
- packages/parser-mapping/src/addByRSS/reconstruct.ts (new - shared reconstruction functions)
- packages/parser-mapping/src/index.ts (export new add-by-RSS modules)
- apps/web/src/utils/addByRSS/types.ts (re-export from parser-mapping, remove duplicates)
- apps/web/src/utils/addByRSS/playFromQueueResource.ts (use shared reconstruction functions)

## Session 8 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Fixed add-by-RSS drag reordering persistence by adding `'add_by_rss'` type detection and appropriate API calls
- `getType()` now checks `add_by_rss_hash_id` first and returns `'add_by_rss'`
- `getIdText()` now returns `add_by_rss_hash_id` for add-by-RSS items
- Added API calls for add-by-RSS reordering: `AddNext`, `AddLast`, and `AddBetween`
- Removed duplicate `LoadingSpinnerOverlay` from `ListQueueResources.tsx` (parent already handles loading state)
- Removed internal `isLoading` state and `setIsLoading` calls from `ListQueueResources.tsx`

#### Files Modified

- apps/web/src/components/List/Queues/ListQueueResources.tsx
- apps/web/src/app/queues/QueuesPageList.tsx (removed LazyLoadPlaceholder from dynamic import to prevent duplicate spinner)
- apps/web/src/styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss (removed negative margin from .trackRow and padding-left from .trackClickable to align track rows with episode rows)

## Session 9 - 2026-02-09

#### Prompt (Developer)

add the debugs

#### Key Decisions

- Add temporary client and server debug logs to trace add-by-RSS now-playing restore on page load.

#### Files Modified

- apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx
- apps/web/src/hooks/usePlayAddByRSS.tsx
- apps/web/src/utils/addByRSS/playFromQueueResource.ts
- apps/api/src/controllers/queue/queueResource.ts

## Session 10 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Guarded add-by-RSS `timeupdate` so it doesn't overwrite restored position before playback when autoplay is blocked.
- Seek add-by-RSS media after metadata loads to avoid browser resetting currentTime during load.
- Removed temporary client/server debug logs after confirming the time reset path.

#### Files Modified

- apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx
- apps/web/src/contexts/MediaPlayerCurrentTime.tsx
- apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx
- apps/web/src/hooks/usePlayAddByRSS.tsx
- apps/web/src/utils/addByRSS/playFromQueueResource.ts
- apps/api/src/controllers/queue/queueResource.ts
- apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx
