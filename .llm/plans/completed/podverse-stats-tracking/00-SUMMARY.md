# Stats tracking wiring — summary

## Goal

Fire authenticated `POST /api/v1/stats/{account|channel|clip|item|playlist}` when logged-in users view key pages or play media. The API and ORM dedupe (`account_guid` + entity id) already exist; this work wires `apps/web` and adds API tests.

## Shared implementation

- **`packages/helpers-requests`**: Typed `reqStatsTrack*` POST helpers + `ApiRequestService` methods.
- **`apps/web`**: Fire-and-forget helpers (`trackStats*`) calling the API only when `loggedInAccount` is set; ignore failures silently (optional `console.debug` only if needed — prefer none).
- **Playback**: `useMediaPlayerResourceUpdate` centralizes channel/clip/item when Podverse media loads; playlist uses `AutoQueueContext` when `playlist_id_text` is set.

## Testing

- **`apps/api/src/test/stats.track.test.ts`**: Supertest against app after `startApp()`, with `@podverse/orm` mocks for `CategoryService`, `AccountService`, and all five `StatsTrackEvent*Service` classes so no DB is required for these tests.

## Product note

Clip playback also updates channel + item stats (three POSTs per first play); each is idempotent per entity.
