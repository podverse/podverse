# Subplan 4a: Next from Queue (Add-by-RSS Rows)

## Goal

When the next queue resource is add-by-RSS, load it by `id_text` from the queue
payload (item vs livestream via `start_time`), then call `playAddByRSS(indexItem)`.
Do **not** require list context for this path.

## Prerequisites

- Subplan 2: Queue response already includes add-by-RSS resource data for the
  owner (`add_by_rss_resource_data`, `add_by_rss_hash_id`). This step is
  **client-side only**: load and play.
- Subplan 3: Play add-by-RSS path exists (`playAddByRSS(indexItem)`).

## Implementation

1. **Load index item from queue resource**
   - In the controller (or a small helper), when choosing "next" from
     `activeQueueUpcomingResources`:
   - If the first resource has `add_by_rss_resource_data` (and is add-by-RSS,
     not redacted):
     - Get `id_text` from that payload.
     - Use `start_time` to distinguish item vs livestream.
     - Load index item from storage: `getAddByRSSItemByIdText` or
       `getAddByRSSLivestreamByIdText`.
     - Call `playAddByRSS(indexItem)`.

2. **Where to implement**
   - MediaPlayer controller (or hook that decides what to load when
     `activeQueueUpcomingResources` changes).
   - Effect that reacts to `activeQueueUpcomingResources`: if first resource
     is add-by-RSS, use the new "load from resource data → playAddByRSS" path;
     else keep existing item/clip/soundbite handling.

3. **Avoid double-play**
   - When queue refreshes after a list-next play, the effect will run again.
   - Include `mpAddByRSS?.idText` (or equivalent) in effect deps / guards so
     we do not "play" the same add-by-RSS item again when it is already
     now-playing.

## Deliverables

- [ ] Helper or inline logic: from `add_by_rss_resource_data` → load index
  item from storage (by idText, item vs livestream by start_time).
- [ ] Controller: when next queue resource is add-by-RSS, call that loader then
  `playAddByRSS(indexItem)`.
- [ ] No list context required for this path.

## Files reference

| Area                    | Path |
| ----------------------- | ---- |
| MediaPlayer controller  | `apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx` |
| Queue resource DTO      | `packages/helpers/src/dtos/queue/queueResource.ts` |
| Storage (item/livestream) | `apps/web/src/utils/addByRSS/storage.ts` |
| Play add-by-RSS         | `apps/web/src/hooks/usePlayAddByRSS.tsx` |
