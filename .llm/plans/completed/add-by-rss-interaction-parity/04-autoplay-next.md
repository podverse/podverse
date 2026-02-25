# Subplan 4: Autoplay Next for Add-by-RSS

## Goal

When the current track is add-by-RSS and autoplay-next is on, the next item is
chosen from the **local** add-by-RSS list (e.g. same feed’s episodes or the
list the user was viewing), not from the API. When the queue contains
add-by-RSS items, “next” from queue still follows queue order and loads the
add-by-RSS resource when that’s the next row.

## Prerequisites

- Subplan 3 (media player and play) done: “now playing” can be an add-by-RSS
  item and there is a “play add-by-RSS” path.

## Current behavior (core)

- `useAutoQueueLoadResources` and AutoQueue context use `mpItem`/`mpChannel`
  and fetch “next” from the API (playlist or episode list by item_id).
- That path does not apply to add-by-RSS because there is no DB item_id.

**Where “playback ended” / “play next” is handled**: In
`apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx`,
`handleEnded` runs on media `ended` event: it calls `moveNowPlayingToHistory`
then `setMPShouldPlay(true)` and `queueResourcesLoadActive()`. So “next” is
driven by `queueResourcesLoadActive()` (which typically calls
`useAutoQueueLoadResources` or equivalent). The client gets “next” from the
queue when the queue is the source (queue response already includes
add-by-RSS rows with `add_by_rss_resource_data` for the owner per Subplan 2);
for list-based autoplay (not from queue), “next” must come from a stored
add-by-RSS list context.

---

## Recommended list context shape

When the user started playback from an add-by-RSS list (e.g. feed’s episode
list), store a **list context** so “play next” can resolve the next item. Suggested shape:

- `feedIdText: string` — channel_id_text of the feed.
- `itemIdTexts: string[]` — ordered list of add-by-RSS item idTexts (e.g. same
  feed’s episodes in current sort order).
- `currentIndex: number` — index in `itemIdTexts` of the currently playing item.

Store in AutoQueue context, MediaPlayer context, or a dedicated add-by-RSS
list context; ensure it survives navigation until playback ends or user
changes source. When playback ends and current is add-by-RSS with list
context, “next” = `itemIdTexts[currentIndex + 1]`; load that item from
IndexedDB and trigger play add-by-RSS (Subplan 3).

---

## Step 1: Detect add-by-RSS “now playing”

When determining what to play next (e.g. on playback end or when building
“up next” list), the autoplay logic must know if the current resource is
add-by-RSS.

- If Subplan 3 used **Option A**: Check add-by-RSS state in MediaPlayer (e.g.
  mpAddByRSSIdText != null).
- If **Option B**: Check the flag or id convention (e.g. mpItem.id prefixed with
  add-by-RSS sentinel, or a separate `mpIsAddByRSS` boolean).

Ensure this is available in the hook or component that handles “play next”
(e.g. `useAutoQueueLoadResources` or the component that reacts to playback
end).

---

## Step 2: Define “next” when current is add-by-RSS and not from queue

When the user started playback from an add-by-RSS list (e.g. from a feed’s
episode list or the add-by-RSS episodes page), “next” should be the next item
in **that** list.

1. **List context**: When the user taps play on an add-by-RSS episode from a
   list (e.g. podcast detail episode list, or add-by-RSS episodes list), store
   the “list context”: e.g. ordered list of add-by-RSS index items (or their
   idTexts) and the current index. Options:
   - Store in AutoQueue context (e.g. “add-by-RSS list” + current index), or
   - Store in MediaPlayer context alongside add-by-RSS state, or
   - Re-derive from IndexedDB when playback ends (same feed’s episodes, same
     sort order) using current idText to find index and then index+1.

2. **Playback end**: When the current track ends and autoplay-next is enabled:
   - If current is add-by-RSS and there is a “list context” with a next item,
     call the “play add-by-RSS” path (Subplan 3) for that next item.
   - If current is add-by-RSS but no list context (e.g. user opened episode
     directly), optionally derive list from IndexedDB (e.g. same feed’s
     episodes by pub date) and use “next” by position; or do not autoplay.

3. **Repeat / shuffle**: If the app supports repeat or shuffle for auto-queue,
   apply the same to the add-by-RSS list (e.g. repeat = play same again or
   wrap to start; shuffle = pick random from list). Optional for first
   iteration.

---

## Step 3: “Next” when playing from queue (mixed queue)

When the user is playing from the queue (e.g. “play next” from queue view),
the queue order is already defined by the API. The queue may contain both
regular items and add-by-RSS items.

1. **Current item is add-by-RSS and came from queue**: When playback ends, the
   “next” item is the next row in the queue (from API). If that row is
   add-by-RSS, load it using the add-by-RSS resource data from the queue
   response (Subplan 3 play path). If that row is a regular item, use existing
   “next from queue” logic (mpItem, etc.). No change to queue order; only the
   “load this resource” step branches on add-by-RSS vs item.

2. **Ensure queue response includes add-by-RSS resource data for owner**: Per
   Subplan 2, only the queue owner gets full add-by-RSS data. So when the
   client fetches “my queue” and gets the next resource, it will have
   add_by_rss_resource_data for add-by-RSS rows; use that to play.

**Files to touch**:
- `apps/web/src/hooks/useAutoQueueLoadResources.tsx`: When building “next”
  resources, if the next queue row is add-by-RSS, the client must have a path
  to “play this add-by-RSS resource” (from queue payload) instead of
  fetching by item_id.
- Playback-end handler (e.g. in MediaPlayer controller or a listener): Branch
  on “is current add-by-RSS”; if yes and next is from list context, play next
  from list; if next is from queue, play next from queue (and if that’s
  add-by-RSS, use add-by-RSS play path).

---

## Step 4: Preserve list context when navigating

When the user plays from an add-by-RSS list (e.g. podcast feed’s episodes),
navigating away and back should not necessarily clear “list context” until
playback ends or user explicitly changes source. Store the list (or feed id +
sort) and current index in a way that survives navigation (context or
sessionStorage), so that when playback ends, “next” is still correct.

---

## Deliverables checklist

- [ ] Detection of “current is add-by-RSS” in autoplay/next logic.
- [ ] When playback ends and current is add-by-RSS with list context, next
  item in that list autoplays.
- [ ] When playing from queue, next queue row is played; if it’s add-by-RSS,
  add-by-RSS play path is used.
- [ ] (Optional) Repeat/shuffle for add-by-RSS list.
- [ ] List context preserved across navigation where appropriate.

---

## Files reference

| Area                    | Path |
| ----------------------- | ---- |
| useAutoQueueLoadResources | `apps/web/src/hooks/useAutoQueueLoadResources.tsx` |
| AutoQueue context       | `apps/web/src/contexts/AutoQueue.tsx` |
| MediaPlayer controller  | `apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx` |
| Queue resources loading | `apps/web/src/hooks/useQueueResourcesLoadActive.tsx` (if used) |
