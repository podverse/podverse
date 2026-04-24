# 01 — API: private list order + optional lightweight likes

## As implemented (tight contract)

Keep these aligned with the repo; if behavior changes, update **this file** and [06](./06-tests-e2e-and-verification.md).

## Server (ORM + API)

- `PlaylistService.getManyPrivate` ([packages/orm/src/services/playlist/playlist.ts](../../../packages/orm/src/services/playlist/playlist.ts)): `order` merges with **`{ is_default_likes: 'DESC' }` first**, then the user’s sort (A–Z, `last_updated`, etc.) so default-likes playlists float to the top for a medium.
- `getAllLikesPrivate` / `GET /playlist/private/likes`: query `include_resources=0` (string) omits `playlist_resources` in the ORM when `includeResources` is false; **metadata-only** response.
- `PlaylistService.update` / `PATCH /playlist/:id_text`: **body is `title`, `description`, `sharable_status_id` only** — **`medium` / `medium_id` is not part of the user update contract** (not only for `is_default_likes`; it cannot change after create). ORM type: `PlaylistUserUpdateDto` in the playlist service. See [05](./05-web-playlist-edit-constraints.md).

## helpers-requests

- [packages/helpers-requests/src/api/playlist/playlist.ts](../../../packages/helpers-requests/src/api/playlist/playlist.ts): `reqPlaylistGetAllLikesPrivate` supports optional `includeResources`; when `false`, request uses `?include_resources=0`.

## API tests (required in this phase)

[apps/api/src/test/playlist.test.ts](../../../apps/api/src/test/playlist.test.ts) **must** include (at least):

- **GET** `.../private/likes?include_resources=0` drives `getAllLikesPrivate` with resources omitted (already covered — keep when refactoring).
- **PATCH** with body **without** `medium` and **200** on success (align mocks with `PlaylistService.update` signature if tests assert call args).

**Stretch (if harness allows):** assertion on **private list** path that ordering includes `is_default_likes` `DESC` (may require more realistic `getManyPrivate` mock data).

## Definition of done (01)

- [ ] `include_resources=0` behavior and test stay green  
- [ ] `PATCH` contract in docs and controller matches **no medium** for updates  
- [ ] No remaining references in this file to “PATCH medium only for default-likes” as the sole rule (global rule is **no** `medium` on update)
