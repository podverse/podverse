# 07 — Clip CRUD

## Goal

Integration tests for clip create, update, delete, and ownership verification, plus public/private list endpoints.

## Routes under test

| Method | Path | Auth | Membership | Notes |
|--------|------|------|------------|-------|
| POST | `/api/v1/clip` | Required | Required | Create clip |
| PATCH | `/api/v1/clip/:clip_id_text` | Required | Required | Update clip (owner only) |
| DELETE | `/api/v1/clip/:clip_id_text` | Required | Skipped | Delete clip (owner only) |
| GET | `/api/v1/clip/:clip_id_text` | Optional | None | Get clip (private: owner only) |
| GET | `/api/v1/clip/private` | Required | Skipped | List user's private clips |
| GET | `/api/v1/clip/public/recent` | Public | None | Recent public clips |
| GET | `/api/v1/clip/public/oldest` | Public | None | Oldest public clips |
| GET | `/api/v1/clip/public/top` | Public | None | Top public clips |
| GET | `/api/v1/clip/public/category/recent` | Public | None | Category recent clips |
| GET | `/api/v1/clip/public/category/oldest` | Public | None | Category oldest clips |
| GET | `/api/v1/clip/public/category/top` | Public | None | Category top clips |
| GET | `/api/v1/clip/public/channel/recent/:channel_id_text` | Public | None | Channel recent clips |
| GET | `/api/v1/clip/public/channel/oldest/:channel_id_text` | Public | None | Channel oldest clips |
| GET | `/api/v1/clip/public/channel/top/:channel_id_text` | Public | None | Channel top clips |
| GET | `/api/v1/clip/public/item/recent/:item_id_text` | Public | None | Item recent clips |
| GET | `/api/v1/clip/public/item/oldest/:item_id_text` | Public | None | Item oldest clips |
| GET | `/api/v1/clip/public/item/top/:item_id_text` | Public | None | Item top clips |
| GET | `/api/v1/clip/public/subscribed/recent` | Required | Skipped | Subscribed recent clips |
| GET | `/api/v1/clip/public/subscribed/top` | Required | Skipped | Subscribed top clips |

## File

`apps/api/src/test/clip.test.ts`

## Test cases

### POST / (create)

- **201 with valid data** — authenticated + active membership, mocks `ClipService.create`, sends `{ start_time, end_time, title, item_id_text, sharable_status_id }`
- **401 without auth**
- **403 with expired membership** — membership is required for create
- **400 with missing required fields** — sends partial body

### PATCH /:clip_id_text (update)

- **200 with valid data, owner** — authenticated + membership, mocks clip owned by user, verifies update called
- **403 when not owner** — mocks clip owned by different user
- **404 when clip not found** — mocks clip lookup to return null
- **401 without auth**
- **403 with expired membership**

### DELETE /:clip_id_text

- **200 when owner** — authenticated, mocks clip owned by user
- **403 when not owner** — mocks clip owned by different user
- **404 when clip not found**
- **401 without auth**

### GET /:clip_id_text

- **200 for public clip, anonymous** — mocks public clip, no auth needed
- **200 for private clip, owner** — authenticated, mocks private clip owned by user
- **404 for private clip, not owner** — authenticated, mocks private clip owned by different user
- **404 for private clip, anonymous** — no auth, private clip

### GET /private

- **200 with auth** — returns user's clips array
- **401 without auth**

### Public list endpoints (sample 3-4 to verify pattern)

- **200 /public/recent** — returns array
- **200 /public/top** — returns array
- **200 /public/category/recent** — with query params, returns array
- **200 /public/channel/recent/:channel_id_text** — returns array

### Subscribed endpoints

- **200 /public/subscribed/recent** — authenticated, returns array
- **401 /public/subscribed/recent** — without auth

## Mocking strategy

- Mock `ClipService` from `@podverse/orm` with methods for create, update, delete, getByIdText, getMany (various list queries)
- Mock clip ownership verification via the service mock returning appropriate owner IDs

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/clip.test.ts
```
