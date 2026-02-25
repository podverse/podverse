# Subplan 1: Add-by-RSS Queue and Playlist (Overview)

## Goal

Add-by-RSS episode, track, and livestream can be queued, added to playlist, removed
from queue/playlist, and marked as played. Same logical resource always yields the
same `add_by_rss_hash_id` for reliable remove/deduplication.

## Execution order

Implement in order: **[01a](01a-queue-playlist-backend.md)** → **[01b](01b-queue-playlist-web-builders.md)** → **[01c](01c-queue-playlist-web-ui.md)**.

| File | Focus |
| ---- | ----- |
| [01a](01a-queue-playlist-backend.md) | Backend: minimal hash + payload shape + ORM/API (queue + playlist add-by-RSS) |
| [01b](01b-queue-playlist-web-builders.md) | Web: `buildAddByRSSHashInput`, `buildAddByRSSResourceData`, `getAddByRSSHashId` |
| [01c](01c-queue-playlist-web-ui.md) | Web: wire headers/rows, playlist modal, queue list UI (where queue resources are rendered) |

## Prerequisites

- Backend already has queue/playlist add-by-RSS API and ORM methods. No new
  endpoints; use existing.
- Existing: `packages/orm/src/services/queue/queueResource.ts` (add-by-RSS
  helpers), `apps/api/src/controllers/queue/queueResourceItemAddByRSS.ts`,
  `packages/helpers-requests/src/api/queue/queueResource/queueResourceItemAddByRSS.ts`.
- Playlist add-by-RSS: `packages/helpers-requests/src/api/playlist/playlistResource/playlistResourceItemAddByRSS.ts`; API routes in `apps/api/src/routes/playlist.ts`.

---

## Step 1: Define minimal hash input (backend + shared type) — see 01a

**Requirement**: `add_by_rss_hash_id` = MD5 of a **minimal, stable** set of fields
only (not the full payload). Same feed + guid + title + pub date ⇒ same hash.

1. **Define the hash-input shape** (e.g. in `packages/helpers` or a shared type):
   - Keys (fixed order): e.g. `channel_id_text`, `guid`, `title`, `pub_date` (and
     for livestreams `start_time` or equivalent).
   - Values: strings; normalize dates to a single string format (e.g. ISO); omit
     undefined.

2. **Backend (ORM)**:
   - In `packages/orm/src/services/queue/queueResource.ts`, change add-by-RSS
     methods to compute `add_by_rss_hash_id` from a **minimal object** only.
   - Either: (a) accept a dedicated hash-input payload and hash that, or (b)
     extract the same minimal keys from `add_by_rss_resource_data` in a fixed
     order and hash that. Prefer (a) or explicit extraction so key order is
     guaranteed.
   - Ensure `getMd5Hash` in `packages/helpers/src/lib/hash.ts` is called with
     this minimal object (same keys, same order). Do not hash the full
     `add_by_rss_resource_data`.

3. **Playlist ORM**: Apply the same hash-from-minimal-set logic in
   `packages/orm` for playlist add-by-RSS (e.g. playlist resource service) if
   it currently hashes the full payload.

**Audit**: Run a test: same minimal input ⇒ same hash; different guid/title/pub
date ⇒ different hash. No dependency on full payload key order.

---

## Step 2: Web – build minimal hash input and full resource payload — see 01b

**Location**: Add helpers under `apps/web/src/utils/addByRSS/` (e.g.
`queuePlaylistHelpers.ts` or extend existing).

1. **`buildAddByRSSHashInput(item)`** (or overload for episode vs livestream):
   - Input: `AddByRSSItemIndexItem` or `AddByRSSLivestreamIndexItem` (from
     `apps/web/src/utils/addByRSS/types.ts`).
   - Output: plain object with **fixed key order**: e.g. `channel_id_text`,
     `guid`, `title`, `pub_date` (and livestream `start_time` if needed).
   - Normalize: dates as ISO string or agreed format; omit undefined; no
     nested objects. Single code path; no spread from multiple sources that
     could change order.

2. **`buildAddByRSSResourceData(item)`** (full payload for API storage/display):
   - Same input types. Output: object containing whatever the API stores (idText,
     medium, enclosure/channel info, etc.) for playback and list display.
   - API may accept this and derive hash from minimal subset server-side; or
     client sends both. Align with Step 1 (if backend extracts minimal set from
     payload, ensure this builder includes the minimal keys in a stable way, or
     send hash input separately if API supports it).

3. **`getAddByRSSHashId(item)`** (client-side, for remove-from-queue UI):
   - Call `buildAddByRSSHashInput(item)` then hash (e.g. use same MD5 utility
     as backend, or call an API that returns hash). Must match backend hash so
     “remove from queue” by `add_by_rss_hash_id` works.

**Audit**: One builder for hash input; one for full payload. Hash input has fixed
keys only. No `undefined` in serialized hash input.

---

## Step 3: Wire queue actions in Add-by-RSS UI — see 01c

**Files to touch**:

- `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader.tsx`
- `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeHeader.tsx` (if
  used in list)
- Episode row: `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeRow.tsx`
- Track header/row: `AddByRSSTrackRow.tsx`, `AddByRSSTrackDetailHeader.tsx`,
  `AddByRSSTrackHeader.tsx`
- Livestream: `AddByRSSLivestreamRow.tsx`, `AddByRSSLivestreamDetailHeader.tsx`,
  `AddByRSSLivestreamHeader.tsx`, grid nodes as needed

**Actions per surface** (replace placeholder handlers):

1. **Queue next**: Get queue for medium (`getQueueForMedium(queues,
   channel.medium_id)` from `@podverse/helpers`). Build
   `add_by_rss_resource_data` via `buildAddByRSSResourceData(indexItem)`.
   Call `apiRequestService.reqQueueResourceItemAddByRSSAddNext(queue.id_text,
   { add_by_rss_resource_data })`. Toast success/error.

2. **Queue last**: Same; use `reqQueueResourceItemAddByRSSAddLast`.

3. **Mark as played**: `reqQueueResourceItemAddByRSSAddHistory` with
   `completed: true` (and playback_position if required by API).

4. **Remove from queue**: When the queue UI shows an add-by-RSS row, removal must
   use `reqQueueResourceItemAddByRSSDelete(queue_id_text, add_by_rss_hash_id)`.
   Ensure queue list/context exposes `add_by_rss_hash_id` for add-by-RSS rows
   and that the remove handler branches on add-by-RSS vs regular item.

**Auth**: If not logged in, show login-required modal (same as core:
`setModalLoginRequired`) before queue/playlist actions.

**Audit**: Every Add-by-RSS header/row that shows queue actions uses the shared
builder and API helpers; no inline object construction for payload.

---

## Step 4: Playlist modal and add-to-playlist for Add-by-RSS — see 01c

**Current state**: `ModalPlaylistAddTo` and `ModalPlaylistAddToState` in
`apps/web/src/contexts/Modals.tsx` take `channel`, `item`, `clip`,
`item_soundbite`. Add-by-RSS has no `item`; it has index item + resource data.

1. **Extend modal state** (`apps/web/src/contexts/Modals.tsx`):
   - Add to `ModalPlaylistAddToState`: e.g. `addByRSSResourceData: object | null`
   and optionally `addByRSSHashId: string | null`. When present, the modal
   treats this as “add this add-by-RSS resource to the selected playlist”.

2. **Modal component** (`apps/web/src/components/Modal/ModalPlaylistAddTo.tsx`):
   - When `modalPlaylistAddTo.addByRSSResourceData` is set, on “Add to
     playlist” (or per-playlist add), call the **playlist** add-by-RSS API
     (e.g. `reqPlaylistResourceItemAddByRSSAddFirst` or equivalent in
     `packages/helpers-requests`) with `playlist_id_text` and
     `add_by_rss_resource_data`. Do not send `item_id_text`.

3. **Opening the modal from Add-by-RSS**:
   - In Add-by-RSS episode/track/livestream headers/rows, “Add to playlist”
     should call `setModalPlaylistAddTo({ channel: null, item: null, clip: null,
     item_soundbite: null, addByRSSResourceData: buildAddByRSSResourceData(...),
     addByRSSHashId: getAddByRSSHashId(...) })` (or equivalent). Ensure the modal
     does not require `item` when add-by-RSS is set.

4. **Remove from playlist**: If there is a “remove from playlist” flow that
   shows playlist resources, ensure add-by-RSS resources can be removed by
   `add_by_rss_hash_id` (API already has delete by add-by-RSS hash). Wire UI
   to call that when the row is add-by-RSS.

**Audit**: Adding an add-by-RSS episode to a playlist from Add-by-RSS detail
page works; playlist shows the entry; remove from playlist works for that
entry.

---

## Step 5: Queue list UI – show and remove add-by-RSS entries — see 01c (queue list: QueuesPageList, ListQueueResources, ListQueueResourceRow)

**Context**: Queue resources are loaded and shown somewhere (e.g. queue page or
sidebar). Ensure:

1. When the API returns queue resources that include add-by-RSS rows (with
   `add_by_rss_hash_id` and optionally `add_by_rss_resource_data` for the
   owner), the UI can display them (title, position, etc.) using the resource
   data.
2. “Remove from queue” for those rows calls
   `reqQueueResourceItemAddByRSSDelete(queue_id_text, add_by_rss_hash_id)`.

**Files**: Locate where queue resources are fetched and rendered (e.g. queue
context, queue page, or profile). Add branching for add-by-RSS rows and wire
delete to the add-by-RSS delete API.

**Audit**: Queue list shows add-by-RSS items when owned; remove from queue
succeeds and list updates.

---

## Deliverables checklist

- [ ] Backend hashes only minimal set (fixed keys); ORM queue + playlist.
- [ ] Web: `buildAddByRSSHashInput`, `buildAddByRSSResourceData`,
  `getAddByRSSHashId` in one place; used everywhere.
- [ ] Add-by-RSS episode/track/livestream: Queue next, Queue last, Mark as
  played, Add to playlist (modal), no placeholders.
- [ ] ModalPlaylistAddTo supports add-by-RSS; add/remove from playlist work.
- [ ] Queue list shows add-by-RSS entries and supports remove by
  add_by_rss_hash_id.
- [ ] Same resource always yields same hash (manual or unit test).

---

## Files reference

| Area        | Path |
| ----------- | ---- |
| ORM queue   | `packages/orm/src/services/queue/queueResource.ts` |
| API queue   | `apps/api/src/controllers/queue/queueResourceItemAddByRSS.ts` |
| Helpers hash| `packages/helpers/src/lib/hash.ts` |
| Web requests| `packages/helpers-requests/src/api/queue/queueResource/queueResourceItemAddByRSS.ts` |
| Add-by-RSS types | `apps/web/src/utils/addByRSS/types.ts` |
| Episode detail header | `apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader.tsx` |
| Modal state | `apps/web/src/contexts/Modals.tsx` |
| Playlist modal | `apps/web/src/components/Modal/ModalPlaylistAddTo.tsx` |
