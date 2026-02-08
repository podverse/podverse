# 01b: Add-by-RSS Queue and Playlist – Web Builders

## Goal

Web app has a single place that builds minimal hash input and full resource
payload for add-by-RSS queue/playlist APIs. Same resource always yields the
same `add_by_rss_hash_id` (for remove/deduplication).

**Parent**: [01-queue-playlist.md](01-queue-playlist.md). Depends on [01a](01a-queue-playlist-backend.md). Follow with [01c](01c-queue-playlist-web-ui.md).

---

## Location

Add helpers under `apps/web/src/utils/addByRSS/` (e.g. `queuePlaylistHelpers.ts`
or extend existing). Types from `apps/web/src/utils/addByRSS/types.ts`
(`AddByRSSItemIndexItem`, `AddByRSSLivestreamIndexItem`).

---

## Step 1: buildAddByRSSHashInput(item)

- **Input**: `AddByRSSItemIndexItem` or `AddByRSSLivestreamIndexItem`.
- **Output**: Plain object with **fixed key order**: e.g. `channel_id_text`,
  `guid`, `title`, `pub_date` (livestream: add `start_time` if needed). Use
  **snake_case** keys to match the backend minimal hash shape.
- Normalize: dates as ISO or agreed format; omit undefined; no nested objects.
  Single code path; no spread from multiple sources that could change order
  (so `JSON.stringify` is deterministic and client hash matches server).

**Recommendation (source of fields)**:
- **Title**: Not on the index item directly; get it from the bundle (e.g.
  `bundle.item?.title` or the compat item’s title field). Include in hash input
  so same episode ⇒ same hash.
- **Hash input**: Build the minimal object with a single ordered key list (e.g.
  construct `{ channel_id_text, guid, title, pub_date }` in that order) so key
  order is guaranteed and backend `getMd5Hash(JSON.stringify(data))` matches.

---

## Step 2: buildAddByRSSResourceData(item)

- **Input**: Same index item types.
- **Output**: Full payload for API storage/display (idText, medium,
  enclosure/channel info, etc.) for playback and list display. Must include the
  minimal hash keys in a stable way if backend extracts from payload; otherwise
  backend may receive hash input separately if API supports it (align with 01a).

**Suggested keys** (align with backend): channel_id_text, guid, title,
pub_date, medium; enclosure url/duration if needed for play; livestream
start_time where applicable.

---

## Step 3: getAddByRSSHashId(item)

- Call `buildAddByRSSHashInput(item)` then hash (same MD5 utility as backend, or
  call an API that returns hash). Must match backend hash so “remove from
  queue” by `add_by_rss_hash_id` works.

**Audit**: One builder for hash input; one for full payload. Hash input has
fixed keys only. No `undefined` in serialized hash input.

---

## Deliverables checklist

- [ ] `buildAddByRSSHashInput`, `buildAddByRSSResourceData`, `getAddByRSSHashId`
  in one module; used by all add-by-RSS queue/playlist UI (01c).
- [ ] Same resource ⇒ same hash; no inline object construction for payload in
  headers/rows.

---

## Files reference

| Area           | Path |
| -------------- | ---- |
| Add-by-RSS types | `apps/web/src/utils/addByRSS/types.ts` |
| Helpers (new or existing) | `apps/web/src/utils/addByRSS/` (e.g. queuePlaylistHelpers) |
| Backend hash  | `packages/helpers/src/lib/hash.ts` (same algorithm client-side if needed) |
