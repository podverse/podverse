# Subplan 4b: List Context and "Next from List"

## Goal

Define list-context shape and storage. When the user plays from an add-by-RSS
list, set list context; when playback ends and current is add-by-RSS, prefer
"next from list" (if list context has `currentIndex + 1`), then fall back to
queue (4a). Clear or update list context when the user changes source (e.g.
plays a non–add-by-RSS item or a different add-by-RSS list).

## List context shape

- `feedIdText: string` — channel_id_text of the feed.
- `itemIdTexts: string[]` — ordered list of add-by-RSS item idTexts (e.g. same
  feed’s episodes in current sort order).
- `currentIndex: number` — index in `itemIdTexts` of the currently playing item.

Store in a dedicated add-by-RSS list context (e.g. `AddByRSSListContext`) or
AutoQueue/MediaPlayer context. Ensure it is cleared when user starts core
(non–add-by-RSS) play or plays from a different add-by-RSS list.

## Where to set list context

Set list context at every place that calls `playAddByRSS` from a list:

- **Episode list row**: e.g. `AddByRSSEpisodeRow` — when play is tapped from a
  list, set context then `playAddByRSS(indexItem)`.
- **Track list row**: e.g. `AddByRSSTrackRow` — same pattern.
- **Livestream list row**: e.g. `AddByRSSLivestreamRow` — same pattern.
- **Optionally**: Episode/track/livestream **detail** header when opened from a
  list (if we want "next" to follow that list when user started from list and
  navigated to detail).

Each list **node** (e.g. `AddByRSSEpisodesListNodes`, `AddByRSSEpisodeNodes`,
`AddByRSSTrackNodes`, `AddByRSSLivestreamNodes`) should pass the list-context
payload (feedIdText, itemIdTexts, currentIndex) into the row so the row can
set it on play.

## Playback-end: list-next vs queue-next order

When current track ends and current is add-by-RSS:

1. **If list context exists and has next** (`currentIndex + 1` within
   `itemIdTexts`):
   - Load that idText from IndexedDB (item then livestream by start_time).
   - Call `playAddByRSS(indexItem)`.
   - Advance or clear context as needed (e.g. set currentIndex to new index or
     clear when list is exhausted).
2. **Else**: Fall back to queue (Subplan 4a): use first element of
   `activeQueueUpcomingResources`; if add-by-RSS, load from resource data and
   `playAddByRSS`.

Still call `queueResourcesLoadActive()` for UI sync; the important part is that
the **decision** to play next is: list-next first (when available), then
queue-next. Avoid double-play or wrong source by implementing this order in one
place (e.g. in `handleEnded` or a small `useAddByRSSPlayNext` hook).

## Clearing list context

- When user starts playing a **core** (non–add-by-RSS) item: clear list context
  (e.g. in `useMediaPlayerResourceUpdate` or wherever `setMPAddByRSS(null)` is
  called when switching to core).
- When user plays from a **different** add-by-RSS list: overwrite list context
  with the new list (set on play as above).

## Deliverables

- [ ] List-context state: shape (feedIdText, itemIdTexts, currentIndex) and
  provider/setter (e.g. AddByRSSListContext).
- [ ] Playback-end: when current is add-by-RSS, try play-next-from-list (if
  list context has next); else play-next-from-queue (4a).
- [ ] Rows: set list context when playing from list (episode, track, livestream
  rows); list nodes pass listContext into rows.
- [ ] Clear list context when switching to core play (and overwrite when
  playing from another add-by-RSS list).

## Files reference

| Area                    | Path |
| ----------------------- | ---- |
| List context            | e.g. `apps/web/src/contexts/AddByRSSListContext.tsx` |
| Play next from list     | e.g. `apps/web/src/hooks/useAddByRSSPlayNext.tsx` |
| Playback end            | `apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx` |
| Clear on core play      | e.g. `apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx` |
| Episode row             | `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeRow.tsx` |
| Track row               | `apps/web/src/components/AddByRSS/Artist/Album/Track/AddByRSSTrackRow.tsx` |
| Livestream row          | `apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamRow.tsx` |
| List nodes (pass context) | AddByRSSEpisodesListNodes, AddByRSSEpisodeNodes, AddByRSSTrackNodes, AddByRSSLivestreamNodes |
