# Plan 02 - API Likes Service And Toggle

## Goal

Provide explicit likes API behavior for:
- snapshot reads (what is liked, grouped by default-likes playlists),
- efficient bulk “filled icon” checks on large pages (`POST` membership), and
- a single, race-safe like/unlike **toggle** path that can also **create the default-likes playlist rows
  on first use** (first like only).

## Target Files

- `apps/api/src/routes/playlist.ts`
- `apps/api/src/controllers/playlist/playlist.ts`
- `apps/api/src/controllers/playlist/playlistResourceItem.ts`
- `apps/api/src/controllers/playlist/playlistResourceClip.ts`
- `packages/orm/src/services/playlist/playlist.ts`
- `packages/helpers/src/dtos/playlist/playlist.ts`
- `packages/helpers-requests/src/api/playlist/playlist.ts`
- `packages/helpers-requests/src/api/_request.ts`

## Steps

1. Rename the private read endpoint and DTOs from “favorites” to “likes” and ensure the response can
   still build a fast in-memory set/map for:
   - `item` ids
   - `clip` ids
   - add-by-rss “hash” ids (whatever the canonical DTO key is in helpers)
2. Add **`POST` bulk membership** (recommended, stable contract):
   - Batched, capped request body (max ids per type) to avoid `GET` mega-query strings.
   - Returns membership booleans/sets to drive filled thumbs in tables without N API calls.
3. Add a single **server-side `toggle` endpoint** (recommended) that can handle all likeable
   resource kinds the web needs:
   - `av_item` / `music_item` (maps to the correct `medium` default-likes playlist)
   - `clip` (always maps to the **AV** default-likes playlist)
   - add-by-rss (maps through the same playlist resource routes as the existing add-to-playlist flows)
   - Implementation detail is internal (may delegate to the existing
     `POST/DELETE` playlist resource routes, but the web should call the dedicated toggle for UX and
     to centralize the “default likes playlist” resolution).
4. **First like provisioning (explicit behavior):** `toggle` must be able to:
   - resolve the account’s `is_default_likes` playlist rows for AV and music, creating them on-demand
   - enforce uniqueness in the DB and remain safe under concurrent first-like requests (transaction
     or equivalent idempotent create pattern)
5. **My Likes list reads:** add dedicated, paginated `GET` list endpoints (one per tab) that reuse the
   existing playlist resource listing code paths internally, but are filtered server-side:
   - **Episodes tab**: only item resources, AV medium
   - **Music tab**: only item resources, music medium
   - **Clips tab**: only clip resources, from the **AV** default-likes playlist membership (no third
     default-likes `medium` required)

## Acceptance Criteria

- Likes are strictly backed by the default `is_default_likes` playlist rows, not ad-hoc tables.
- A logged-in user can:
  - fetch a private likes snapshot,
  - bulk query membership for many ids in one `POST` call,
  - like/unlike via a toggle endpoint, with correct per-resource mapping (including add-by-rss and clips).
- The toggle endpoint is **idempotent** and safe under **concurrent** first-like behavior.
- My Likes tab list endpoints are paginated and can be bound to the existing list UI without client-only
  filtering tricks.
