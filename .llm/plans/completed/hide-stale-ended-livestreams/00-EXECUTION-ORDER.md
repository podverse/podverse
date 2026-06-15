# Hide ended livestreams older than one day — Execution Order

Stop the API list endpoints from returning ended livestreams (live items) that ended more than one day ago, using `end_time` with a fallback to `start_time`, while keeping single-item detail pages reachable via direct link.

## Decisions (confirmed with user)

- Detail pages / `GET /api/v1/item/:idOrIdText` stay unfiltered (direct links keep working). Only list endpoints filter.
- Cutoff uses `live_item.end_time`; when `end_time` is null, fall back to `start_time`.
- The 1-day window is a shared constant in `@podverse/helpers` (hardcoded, no env).
- Only ended items are affected; `live` and `pending` are always returned.

## Data model recap

- `LiveItemStatusEnum.Ended = 3` (`packages/helpers/src/dtos/liveItem/liveItem.ts`).
- `live_item.start_time` (not null) and `live_item.end_time` (nullable) (`packages/orm/src/entities/liveItem/liveItem.ts`).
- List queries already filter by `live_item_status_id` when `liveItemType` is set; `itemType` is `live-item` only when a `liveItemType` is provided, so the ended cutoff only needs to apply when `liveItemType === 'ended'`.

## Phases (sequential)

1. `01-helpers-visibility.md` — constant + cutoff + stale predicate in helpers.
2. `02-orm-where-filter.md` — ended cutoff in paginated ORM list queries.
3. `03-channel-controller.md` — channel/album endpoint in-memory filter.
4. `04-tests-and-docs.md` — API integration + unit tests + docs.

## Out of scope

- Optional: order ended lists by `end_time DESC` instead of `start_time DESC` (`getRecentOrder` in `apps/api/src/controllers/item.ts`). Mention only.
- No web-side filtering needed; API is the single source of truth. Embed lists already filter to `Live` only.
