# 01a: Add-by-RSS Queue and Playlist – Backend

## Goal

Backend computes `add_by_rss_hash_id` from a **minimal, stable** set of fields only.
Same feed + guid + title + pub date ⇒ same hash. ORM and API accept/store full
payload; hash is derived from minimal subset.

**Parent**: [01-queue-playlist.md](01-queue-playlist.md) (overview). Follow with [01b](01b-queue-playlist-web-builders.md) then [01c](01c-queue-playlist-web-ui.md).

---

## Prerequisites

- Existing: `packages/orm/src/services/queue/queueResource.ts` (add-by-RSS helpers),
  `apps/api/src/controllers/queue/queueResourceItemAddByRSS.ts`,
  `packages/helpers-requests/src/api/queue/queueResource/queueResourceItemAddByRSS.ts`.
- Playlist add-by-RSS: `packages/helpers-requests/src/api/playlist/playlistResource/playlistResourceItemAddByRSS.ts`
  (stub; implement or extend as needed). API routes in `apps/api/src/routes/playlist.ts`:
  POST `/:playlist_id_text/item-add-by-rss/first`, `.../between`, `.../last`;
  DELETE `/:playlist_id_text/item-add-by-rss/:add_by_rss_hash_id`.

---

## Step 1: Define minimal hash input (shared type)

1. **Hash-input shape** (e.g. in `packages/helpers` or shared type):
   - Keys (fixed order): e.g. `channel_id_text`, `guid`, `title`, `pub_date`;
     for livestreams add `start_time` or equivalent.
   - Values: strings; normalize dates to a single format (e.g. ISO); omit
     undefined.

2. **Payload shape**: Full `add_by_rss_resource_data` stored by API may include
   idText, medium, enclosure/channel info, etc. The **minimal** object used only
   for hashing must be a strict subset with fixed key order.

---

## Step 2: ORM – hash from minimal set only

1. **Queue ORM** (`packages/orm/src/services/queue/queueResource.ts`):
   - Change add-by-RSS methods to compute `add_by_rss_hash_id` from a minimal
     object only (either accept a dedicated hash-input payload and hash that, or
     extract the same minimal keys from `add_by_rss_resource_data` in fixed
     order). Prefer explicit extraction so key order is guaranteed.
   - Use `getMd5Hash` in `packages/helpers/src/lib/hash.ts` with this minimal
     object. Do not hash the full `add_by_rss_resource_data`.

2. **Playlist ORM**: Apply the same hash-from-minimal-set logic in
   `packages/orm` for playlist add-by-RSS (playlist resource service) if it
   currently hashes the full payload.

**Audit**: Same minimal input ⇒ same hash; different guid/title/pub_date ⇒
different hash. No dependency on full payload key order.

---

## Step 3: API – accept payload; derive hash server-side

- Queue/playlist add-by-RSS controllers accept `add_by_rss_resource_data` (full
  payload). Server derives minimal set and `add_by_rss_hash_id` in ORM layer;
  no need for client to send hash if backend can derive it consistently.

**Audit**: Add-by-RSS add (queue/playlist) stores resource data and correct
hash; remove by `add_by_rss_hash_id` works.

---

## Deliverables checklist

- [ ] Minimal hash-input shape defined (fixed keys); full payload shape
  documented where stored.
- [ ] ORM queue + playlist: `add_by_rss_hash_id` computed from minimal set
  only; `getMd5Hash` used with that set.
- [ ] API accepts add-by-RSS payloads; hash derived server-side; remove by
  hash works.

---

## Files reference

| Area         | Path |
| ------------ | ---- |
| ORM queue    | `packages/orm/src/services/queue/queueResource.ts` |
| API queue    | `apps/api/src/controllers/queue/queueResourceItemAddByRSS.ts` |
| Helpers hash | `packages/helpers/src/lib/hash.ts` |
| Playlist API | `apps/api/src/routes/playlist.ts` (item-add-by-rss routes) |
| Playlist helpers | `packages/helpers-requests/src/api/playlist/playlistResource/playlistResourceItemAddByRSS.ts` |
