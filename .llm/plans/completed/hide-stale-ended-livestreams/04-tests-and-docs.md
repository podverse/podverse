# 04 — Tests and docs

## API integration tests (apps/api/src/test)

Cover `/live-item/global/recent`, `/category/recent`, `/subscribed/recent`, the `top` variants, and `/live-item/channel/:id` with `liveItemType=ended`:

- ended 2 days ago (end_time set) -> excluded; ended 2 hours ago -> included.
- ended with null end_time, start_time 2 days ago -> excluded; start_time 2 hours ago -> included.
- `live` and `pending` always returned regardless of age.
- `GET /item/:idOrIdText` still returns a stale ended live item (direct link).

## Unit tests

- `isLiveItemEndedAndStale` / `getEndedLiveItemVisibilityCutoff` in helpers (covered in Phase 1; expand if needed).

## Docs

- Update live-item API docs (e.g. under `docs/`) to note ended lists only include items ended within the last day.

## Verification

```bash
npm run test:unit
npm run test:e2e:api
```
