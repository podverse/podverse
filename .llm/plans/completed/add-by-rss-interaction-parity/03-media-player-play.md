# Subplan 3: Media Player and Play for Add-by-RSS

## Goal

When the user taps play on an add-by-RSS episode, track, or livestream, it
becomes "now playing": the correct enclosure URL is used, metadata is shown in
the player, and (when logged in) queue/history stay in sync.

## Prerequisites

- Subplan 1 (queue/playlist) done: `buildAddByRSSResourceData` and queue API
  exist so "play" can add now-playing to queue.
- Media player context: `apps/web/src/contexts/MediaPlayer.tsx` (mpItem,
  mpChannel, etc.). Player components and hooks assume DTO item/channel.

---

## Step 1: Chosen approach – Option A (extend MediaPlayer context)

**Option A – Extend MediaPlayer context with add-by-RSS state** (chosen)

- Add e.g. `mpAddByRSSIdText`, `mpAddByRSSResourceData`, optional
  channel-like display info (title, image).
- Controllers and "now playing" UI branch on "is add-by-RSS" and use enclosure
  URL and metadata from that state.
- Clear separation; no synthetic DTO. Call sites that need to know "now
  playing" source branch on add-by-RSS state.

---

## Step 2: Implement "play" from Add-by-RSS (web)

**Trigger**: User taps play on an add-by-RSS episode/track/livestream (detail
header or list row).

1. **Resolve enclosure**: From the add-by-RSS index item (or bundle), get the
   primary enclosure URL (and duration if available). Use the same logic as
   core for "default" enclosure when multiple exist.

2. **Update "now playing"**: Set add-by-RSS state in MediaPlayer context
   (idText, resource data, channel title/image, enclosure URL). Clear or
   ignore mpItem for play purpose; player component uses add-by-RSS state to
   render and to set audio src.

3. **Queue/history sync**: If the user is logged in, call the add-by-RSS
   "add as now-playing" API (e.g. `reqQueueResourceItemAddByRSSAddNowPlaying`)
   with `add_by_rss_resource_data` and playback_position 0 (or current). Use
   the same builder as in Subplan 1. This keeps queue and history consistent.

4. **Auto-queue**: If the app clears or resets "auto queue" when starting
   playback (e.g. in useMediaPlayerResourceUpdate), do the same when starting
   add-by-RSS play so autoplay-next source is consistent (Subplan 4 will
   define "next" for add-by-RSS).

**Files to touch**:
- Add-by-RSS headers/rows that have the play button: pass a single "onPlay"
  handler that receives the index item (and feed if needed), then calls the
  new "play add-by-RSS" logic.
- Either `apps/web/src/contexts/MediaPlayer.tsx` (add state + setters) or a
  shared "play add-by-RSS" helper that builds synthetic item and calls
  setMPItem/setMPChannel and sets a flag.
- `apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx`: if it only accepts
  DTOItem, either extend it to accept add-by-RSS (synthetic item + flag) or
  add a separate code path for "play add-by-RSS" that sets player state and
  queue now-playing without going through the same hook.

**Audit**: Tap play on an add-by-RSS episode from detail page. Player shows
title/artwork and plays the correct enclosure; queue (if logged in) shows it as
now playing.

---

## Step 3: Player UI for add-by-RSS

1. **Now-playing title, artwork, duration**: Source from add-by-RSS state
   (e.g. channel title from feed, item title from bundle, image from feed or
   item). Ensure the mini player and full player modal can show these when the
   current content is add-by-RSS.

2. **No DB links**: Add-by-RSS items have no episode/page URL in the main app;
   links to "episode" should go to the add-by-RSS episode route
   (`/add-by-rss/episode/[episodeId]`) using the add-by-RSS idText.

3. **Clip not supported**: The Clip feature is not possible with Add-by-RSS
   feeds (no DB clip entity). When the current "now playing" is an add-by-RSS
   item, the clip button must **not** be available (hide or disable it in the
   player UI and in any add-by-RSS episode/track/livestream headers or rows).

**Audit**: While an add-by-RSS episode is playing, open the player modal;
confirm title, image, and link (if any) are correct and point to add-by-RSS
episode page.

---

## Step 4: Enclosure selection (if applicable)

If the core player allows choosing between multiple enclosures (e.g. by
quality), add-by-RSS may have multiple enclosures in the bundle. Reuse the
same enclosure-selection UX if possible (from add-by-RSS state / bundle);
otherwise default to first enclosure.

---

## Deliverables checklist

- [x] Option A (MediaPlayer add-by-RSS state) implemented and documented.
- [x] Play from add-by-RSS episode/track/livestream sets now playing and
  starts playback with correct enclosure URL.
- [x] Queue "now playing" updated when logged in (add-by-RSS API).
- [x] Player UI shows correct title, artwork, and metadata for add-by-RSS.
- [x] Link from player to episode goes to add-by-RSS episode page when
  current item is add-by-RSS.
- [x] Clip button hidden/disabled when now playing is add-by-RSS (Clip not
  supported for Add-by-RSS).

---

## Files reference

| Area        | Path |
| ----------- | ---- |
| MediaPlayer context | `apps/web/src/contexts/MediaPlayer.tsx` |
| useMediaPlayerResourceUpdate | `apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx` |
| Add-by-RSS episode detail header | `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader.tsx` |
| Add-by-RSS episode row | `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeRow.tsx` |
| Queue add-by-RSS now-playing | `packages/helpers-requests/src/api/queue/queueResource/queueResourceItemAddByRSS.ts` |
