# Subplan 05c: Chapter Seek (Add-by-RSS)

## Goal

When the user seeks via a chapter (clicks a chapter in the list) while playing an add-by-RSS episode, the player’s current time and chapter highlight stay in sync. Same behavior as core; the only difference is the chapter list source (bundle/API vs `reqItemParseAndGetChapters`).

## Prerequisites

- 05a and 05b: Chapters data available (backend + client mappers); add-by-RSS episode page has Chapters tab with chapter list.
- Media player: when “now playing” is add-by-RSS, chapter list must be available to the component that handles chapter click (e.g. setMPCurrentTime, setMPItemChapter if used). Core episode page passes `item_chapters` into list/chapter components that trigger seek.

## Implementation

- Ensure chapter list is passed to the player or to a component that can trigger seek (e.g. set current time when chapter is clicked).
- When “now playing” is add-by-RSS and the episode has chapters, apply the same chapter-seek logic as core (e.g. setMPCurrentTime, setMPItemChapter if used). Chapter list source is bundle/API (from 05a/05b), not `reqItemParseAndGetChapters(item_id)`.
- If the add-by-RSS episode page’s Chapters tab uses the same list component as core (ListItemChapters / ListItemChapterRow), ensure that component receives a seek callback that works when now-playing is add-by-RSS (e.g. calls setMPCurrentTime with the chapter start time).

## Deliverables

- [ ] Chapter list on add-by-RSS episode page triggers seek when a chapter is clicked and that episode is now playing (add-by-RSS).
- [ ] Playback position and chapter highlight stay in sync (same as core).

## Files reference

| Area | Path |
| ---- | ---- |
| Add-by-RSS episode page | `apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx` |
| ListItemChapters / chapter row | `apps/web/src/components/List/ItemChapters/` |
| Media player (setMPCurrentTime, setMPItemChapter) | `apps/web/src/contexts/MediaPlayer` or controller |

## Audit

Play an add-by-RSS episode with chapters; click a chapter in the Chapters tab; playback seeks to that time and UI updates.
