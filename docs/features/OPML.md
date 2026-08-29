# OPML import / export

OPML lets users move podcast subscriptions between apps. Podverse supports **export** and
**import** on web (Settings → OPML) and mobile (More → OPML).

## Export

Authenticated `GET /api/v2/account/opml/export` returns an OPML 2.0 document built from the
account’s directory follows plus add-by-RSS follows.

- **Web:** Settings OPML tab downloads the file.
- **Mobile:** writes a cache file and opens the OS share sheet (`Share` + `expo-file-system`).

Shared client helper: `reqAccountOpmlExport` in `@podverse/helpers-requests`.

## Import

Import is an **async server job** (same pattern as add-by-RSS parse): MQ queue `opml-import`,
worker processing, Valkey status, client poll.

| Step  | Endpoint                                                                          |
| ----- | --------------------------------------------------------------------------------- |
| Start | `POST /api/v2/account/opml/import` body `{ "opml": "<xml…>" }` → `{ request_id }` |
| Poll  | `GET /api/v2/account/opml/import/status/:request_id` until `completed` / `failed` |

Shared helpers: `reqAccountOpmlImport`, `reqAccountOpmlImportStatus`.

### Per-feed resolution (server)

For each OPML outline feed URL:

1. **DB** (`FeedService.getByUrl`, http/https) → directory-follow immediately (does **not** count
   toward the hourly limit).
2. Else **Podcast Index** `podcastGetByFeedUrl` → enqueue indexed on-demand parse + **pending
   follow** (counts as new work; resolves to a directory follow when parse creates the channel).
3. Else **add-by-RSS** follow + parse enqueue (counts as new work).

Per-feed failures are recorded in the report and do not stop the run.

### Rate limit

`OPML_IMPORT_MAX_FEEDS_PER_HOUR` (default **50**) counts only **new work** (PI enqueue +
add-by-RSS). Instant DB-match subscribes do not count. When the limit is hit mid-job, remaining
feeds are marked `rate_limited` and the status payload includes `rateLimited` retry metadata; web
and mobile show a rate-limit modal.
This soft cap is separate from HTTP enqueue 429 limits such as
`ACCOUNT_OPML_IMPORT_ENQUEUE_MAX_PER_HOUR` (API env).

When `PODVERSE_E2E_FIXTURES=1`, import runs **synchronously** in the API (no MQ worker required for
E2E stacks).

## Surfaces

| Surface | UI                                        | E2E                                         |
| ------- | ----------------------------------------- | ------------------------------------------- |
| Web     | `apps/web/.../SettingsOpml` (`?tab=opml`) | `apps/web/e2e/settings-opml-export.spec.ts` |
| Mobile  | `apps/mobile/.../MoreOpmlScreen`          | `apps/mobile/e2e/opml.yaml`                 |

Implementation plan archive removed after the OPML work was completed.
Related: [ADD-BY-RSS](/docs/features/ADD-BY-RSS.md).
