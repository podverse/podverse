# 01c: Add-by-RSS Queue and Playlist – Web UI

## Goal

Wire queue and playlist actions in Add-by-RSS episode/track/livestream UI;
playlist modal supports add-by-RSS; queue list shows and removes add-by-RSS
entries.

**Parent**: [01-queue-playlist.md](01-queue-playlist.md). Depends on [01a](01a-queue-playlist-backend.md), [01b](01b-queue-playlist-web-builders.md).

---

## Where queue resources are rendered

- **Queue list**: `apps/web/src/app/queues/QueuesPageList.tsx` and
  `QueuesPageContext.tsx`; list rendered via
  `apps/web/src/components/List/Queues/ListQueueResources.tsx` and
  `ListQueueResourceRow.tsx`. Data from queue context / `QueueResourcesAbridgedIndex`;
  ensure add-by-RSS rows expose `add_by_rss_hash_id` and branch remove handler
  on add-by-RSS vs regular item (`reqQueueResourceItemAddByRSSDelete`).

---

## Step 1: Wire queue actions in Add-by-RSS UI

**Files to touch**:

- `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader.tsx`
- `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeHeader.tsx`,
  `AddByRSSEpisodeRow.tsx`
- Track: `AddByRSSTrackRow.tsx`, `AddByRSSTrackDetailHeader.tsx`,
  `AddByRSSTrackHeader.tsx`
- Livestream: `AddByRSSLivestreamRow.tsx`, `AddByRSSLivestreamDetailHeader.tsx`,
  `AddByRSSLivestreamHeader.tsx`

**Actions** (use `buildAddByRSSResourceData` from 01b):

1. **Queue next**: `getQueueForMedium(queues, channel.medium_id)`; call
   `apiRequestService.reqQueueResourceItemAddByRSSAddNext(queue.id_text,
   { add_by_rss_resource_data })`. Toast success/error.
2. **Queue last**: `reqQueueResourceItemAddByRSSAddLast`.
3. **Mark as played**: `reqQueueResourceItemAddByRSSAddHistory` with
   `completed: true` (and playback_position if required).
4. **Remove from queue**: Use `reqQueueResourceItemAddByRSSDelete(queue_id_text,
   add_by_rss_hash_id)`; ensure queue list exposes `add_by_rss_hash_id` for
   add-by-RSS rows and remove handler branches on add-by-RSS vs regular.

**Auth**: If not logged in, show login-required modal (`setModalLoginRequired`)
before queue/playlist actions.

**Clip**: The Clip feature is not supported for Add-by-RSS. Do not show or
enable the clip button on add-by-RSS episode/track/livestream headers or rows
(see also Subplan 3 for player UI when add-by-RSS is now playing).

---

## Step 2: Playlist modal and add-to-playlist

- **Modal state** (`apps/web/src/contexts/Modals.tsx`): Extend
  `ModalPlaylistAddToState` with `addByRSSResourceData: object | null` and
  optionally `addByRSSHashId: string | null`. When set, modal treats as “add
  this add-by-RSS resource to the selected playlist”.

- **Modal** (`apps/web/src/components/Modal/ModalPlaylistAddTo.tsx`): When
  add-by-RSS is set, on “Add to playlist” call playlist add-by-RSS API (e.g.
  `reqPlaylistResourceItemAddByRSSAddFirst` or equivalent in
  `packages/helpers-requests/src/api/playlist/playlistResource/playlistResourceItemAddByRSS.ts`)
  with `playlist_id_text` and `add_by_rss_resource_data`. Do not send
  `item_id_text`.

- **Opening modal from Add-by-RSS**: In episode/track/livestream headers/rows,
  “Add to playlist” calls `setModalPlaylistAddTo({ ..., addByRSSResourceData:
  buildAddByRSSResourceData(...), addByRSSHashId: getAddByRSSHashId(...) })`.
  Modal must not require `item` when add-by-RSS is set.

- **Remove from playlist**: If “remove from playlist” shows playlist resources,
  ensure add-by-RSS resources can be removed by `add_by_rss_hash_id`; wire UI to
  call playlist delete-by-add-by-RSS-hash.

---

## Step 3: Queue list – show and remove add-by-RSS entries

1. When the API returns queue resources that include add-by-RSS rows (with
   `add_by_rss_hash_id` and optionally `add_by_rss_resource_data` for owner),
   the UI displays them (title, position, etc.) using the resource data.
2. “Remove from queue” for those rows calls
   `reqQueueResourceItemAddByRSSDelete(queue_id_text, add_by_rss_hash_id)`.

**Files**: `ListQueueResourceRow.tsx`, `ListQueueResources.tsx`,
`QueuesPageContext.tsx` (or wherever queue resources are fetched). Add
branching for add-by-RSS rows and wire delete to add-by-RSS delete API.

**Audit**: Queue list shows add-by-RSS items when owned; remove from queue
succeeds and list updates.

---

## Deliverables checklist

- [ ] Add-by-RSS episode/track/livestream: Queue next, Queue last, Mark as
  played, Add to playlist (modal); no placeholders.
- [ ] ModalPlaylistAddTo supports add-by-RSS; add/remove from playlist work.
- [ ] Queue list shows add-by-RSS entries and supports remove by
  add_by_rss_hash_id.
- [ ] Every Add-by-RSS header/row that shows queue actions uses shared builders
  (01b); no inline payload construction.

---

## Files reference

| Area           | Path |
| -------------- | ---- |
| Episode detail header | `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader.tsx` |
| Modal state   | `apps/web/src/contexts/Modals.tsx` |
| Playlist modal | `apps/web/src/components/Modal/ModalPlaylistAddTo.tsx` |
| Queue list    | `apps/web/src/app/queues/QueuesPageList.tsx`, `QueuesPageContext.tsx` |
| List queue resources | `apps/web/src/components/List/Queues/ListQueueResources.tsx`, `ListQueueResourceRow.tsx` |
| Web requests  | `packages/helpers-requests/src/api/queue/queueResource/queueResourceItemAddByRSS.ts`, `.../playlist/playlistResource/playlistResourceItemAddByRSS.ts` |
