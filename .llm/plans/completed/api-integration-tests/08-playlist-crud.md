# 08 — Playlist CRUD

## Goal

Integration tests for playlist create, update, delete, ownership verification, and resource management (items, clips, soundbites).

## Routes under test

| Method | Path | Auth | Membership | Notes |
|--------|------|------|------------|-------|
| POST | `/api/v1/playlist` | Required | Required | Create playlist |
| PATCH | `/api/v1/playlist/:playlist_id_text` | Required | Required | Update playlist (owner) |
| DELETE | `/api/v1/playlist/:playlist_id_text` | Required | Skipped | Delete playlist (owner) |
| GET | `/api/v1/playlist/:playlist_id_text` | Optional | None | Get playlist (private: owner) |
| GET | `/api/v1/playlist/public/top` | Public | None | Public top playlists |
| GET | `/api/v1/playlist/private/top` | Required | Skipped | Private top |
| GET | `/api/v1/playlist/private/recent` | Required | Skipped | Private recent |
| GET | `/api/v1/playlist/private/oldest` | Required | Skipped | Private oldest |
| GET | `/api/v1/playlist/private/az` | Required | Skipped | Private A-Z |
| GET | `/api/v1/playlist/private/favorites` | Required | Skipped | All favorites |
| GET | `/api/v1/playlist/private/followed/top` | Required | Skipped | Followed top |
| GET | `/api/v1/playlist/private/followed/recent` | Required | Skipped | Followed recent |
| GET | `/api/v1/playlist/private/followed/oldest` | Required | Skipped | Followed oldest |
| GET | `/api/v1/playlist/private/followed/az` | Required | Skipped | Followed A-Z |
| GET | `/:playlist_id_text/resources` | Optional | None | Get playlist resources |
| GET | `/:playlist_id_text/resources/private-all` | Required | Skipped | All resources (private) |
| GET | `/:playlist_id_text/resources/queue-by-list-position` | Required | Skipped | Queue by position |
| GET | `/:playlist_id_text/resources/shuffle` | Optional | None | Shuffled resources |
| POST | `/:playlist_id_text/clip/:clip_id_text/first` | Required | Skipped | Add clip first |
| POST | `/:playlist_id_text/clip/:clip_id_text/between` | Required | Skipped | Add clip between |
| POST | `/:playlist_id_text/clip/:clip_id_text/last` | Required | Skipped | Add clip last |
| DELETE | `/:playlist_id_text/clip/:clip_id_text` | Required | Skipped | Remove clip |
| POST | `/:playlist_id_text/item/:item_id_text/first` | Required | Skipped | Add item first |
| POST | `/:playlist_id_text/item/:item_id_text/between` | Required | Skipped | Add item between |
| POST | `/:playlist_id_text/item/:item_id_text/last` | Required | Skipped | Add item last |
| DELETE | `/:playlist_id_text/item/:item_id_text` | Required | Skipped | Remove item |
| POST | `/:playlist_id_text/item-add-by-rss/first` | Required | Skipped | Add RSS item first |
| POST | `/:playlist_id_text/item-add-by-rss/between` | Required | Skipped | Add RSS item between |
| POST | `/:playlist_id_text/item-add-by-rss/last` | Required | Skipped | Add RSS item last |
| DELETE | `/:playlist_id_text/item-add-by-rss/:add_by_rss_hash_id` | Required | Skipped | Remove RSS item |
| POST | `/:playlist_id_text/item-soundbite/:soundbite_id_text/first` | Required | Skipped | Add soundbite first |
| POST | `/:playlist_id_text/item-soundbite/:soundbite_id_text/between` | Required | Skipped | Add soundbite between |
| POST | `/:playlist_id_text/item-soundbite/:soundbite_id_text/last` | Required | Skipped | Add soundbite last |
| DELETE | `/:playlist_id_text/item-soundbite/:soundbite_id_text` | Required | Skipped | Remove soundbite |

## File

`apps/api/src/test/playlist.test.ts`

## Test cases

### POST / (create)

- **201 with valid data** — authenticated + membership, mocks `PlaylistService.create`
- **401 without auth**
- **403 with expired membership**

### PATCH /:playlist_id_text (update)

- **200 owner + membership** — mocks playlist owned by user
- **403 not owner** — mocks different owner
- **404 not found**
- **401 without auth**
- **403 expired membership**

### DELETE /:playlist_id_text

- **200 owner** — membership not required for delete
- **403 not owner**
- **404 not found**
- **401 without auth**

### GET /:playlist_id_text

- **200 public playlist, anonymous**
- **200 private playlist, owner**
- **404 private playlist, not owner**

### Private list endpoints

- **200 /private/top** — authenticated, returns array
- **200 /private/recent** — authenticated
- **200 /private/favorites** — authenticated
- **401 without auth** for each

### Followed list endpoints

- **200 /private/followed/top** — authenticated
- **401 without auth**

### Resources endpoints

- **200 /resources** — public playlist, returns resources
- **200 /resources/private-all** — authenticated, owner
- **200 /resources/shuffle** — returns shuffled resources
- **401 /resources/private-all without auth**

### Add/remove resource operations (clip, item, soundbite)

Test one representative from each resource type to verify the pattern:

- **200 add clip first** — owner, mocks service
- **200 add clip between** — owner
- **200 add clip last** — owner
- **200 remove clip** — owner
- **403 not owner** for add/remove
- **401 without auth**

Same pattern for item and item-soundbite operations. For item-add-by-rss, test one representative.

## Mocking strategy

- Mock `PlaylistService`, `PlaylistResourceService` from `@podverse/orm`
- Use ownership patterns matching clip tests

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/playlist.test.ts
```
