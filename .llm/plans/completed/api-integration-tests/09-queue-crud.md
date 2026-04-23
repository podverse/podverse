# 09 — Queue CRUD

## Goal

Integration tests for queue management: now-playing, next, last, between, history, remove operations for clips, items, add-by-RSS items, and soundbites.

## Routes under test

All routes require authentication (checked in controllers).

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/queue/all-for-account/private` | All queues for account |
| GET | `/api/v1/queue/resources/all-by-account-abridged` | All queue resources abridged |
| GET | `/:queue_id_text/resources/now-playing` | Now-playing resource |
| GET | `/:queue_id_text/resources/upcoming-all` | All upcoming resources |
| GET | `/:queue_id_text/resources/history-paginated` | History paginated |
| POST | `/:queue_id_text/update-is-active` | Update active queue |
| POST | `/:queue_id_text/clip/:clip_id_text/now-playing` | Clip to now-playing |
| POST | `/:queue_id_text/clip/:clip_id_text/next` | Clip next |
| POST | `/:queue_id_text/clip/:clip_id_text/last` | Clip last |
| POST | `/:queue_id_text/clip/:clip_id_text/between` | Clip between |
| POST | `/:queue_id_text/clip/:clip_id_text/history` | Clip to history |
| DELETE | `/:queue_id_text/clip/:clip_id_text` | Remove clip |
| POST | `/:queue_id_text/item/:item_id_text/now-playing` | Item to now-playing |
| POST | `/:queue_id_text/item/:item_id_text/next` | Item next |
| POST | `/:queue_id_text/item/:item_id_text/last` | Item last |
| POST | `/:queue_id_text/item/:item_id_text/between` | Item between |
| POST | `/:queue_id_text/item/:item_id_text/history` | Item to history |
| DELETE | `/:queue_id_text/item/:item_id_text` | Remove item |
| POST | `/:queue_id_text/item-add-by-rss/now-playing` | RSS item to now-playing |
| POST | `/:queue_id_text/item-add-by-rss/next` | RSS item next |
| POST | `/:queue_id_text/item-add-by-rss/last` | RSS item last |
| POST | `/:queue_id_text/item-add-by-rss/between` | RSS item between |
| POST | `/:queue_id_text/item-add-by-rss/history` | RSS item to history |
| DELETE | `/:queue_id_text/item-add-by-rss/:add_by_rss_hash_id` | Remove RSS item |
| POST | `/:queue_id_text/item-soundbite/:id/now-playing` | Soundbite to now-playing |
| POST | `/:queue_id_text/item-soundbite/:id/next` | Soundbite next |
| POST | `/:queue_id_text/item-soundbite/:id/last` | Soundbite last |
| POST | `/:queue_id_text/item-soundbite/:id/between` | Soundbite between |
| POST | `/:queue_id_text/item-soundbite/:id/history` | Soundbite to history |
| DELETE | `/:queue_id_text/item-soundbite/:id` | Remove soundbite |

## File

`apps/api/src/test/queue.test.ts`

## Test cases

### Read endpoints

- **200 /all-for-account/private** — authenticated, returns array of queues
- **200 /resources/all-by-account-abridged** — authenticated, returns resources
- **200 /:id/resources/now-playing** — owner, returns current resource
- **200 /:id/resources/upcoming-all** — owner
- **200 /:id/resources/history-paginated** — owner
- **401 without auth** for each

### POST update-is-active

- **200 owner** — mocks queue owned by user, validates `is_active_queue` boolean
- **403 not owner** — mocks different owner
- **400 invalid body** — non-boolean value
- **401 without auth**

### Queue operations by resource type

Test one representative operation (now-playing, next, last, between, history, remove) per resource type:

#### Clip operations

- **200 clip/now-playing** — owner, mocks service
- **200 clip/next** — owner
- **200 clip/last** — owner
- **200 clip/between** — owner with position data
- **200 clip/history** — owner
- **200 DELETE clip** — owner
- **403 not owner**
- **401 without auth**

#### Item operations

Same pattern as clip — test now-playing, next, last, between, history, remove.

#### Item-add-by-RSS operations

Test now-playing and remove as representatives (same pattern as item).

#### Item-soundbite operations

Test now-playing and remove as representatives.

## Mocking strategy

- Mock `QueueService` and related services from `@podverse/orm`
- Queue ownership verification follows same pattern as playlist/clip

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/queue.test.ts
```
