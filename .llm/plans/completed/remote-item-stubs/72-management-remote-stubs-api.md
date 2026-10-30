**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 72 — Management API for remote stubs

Admin routes to list remote stubs, read one, queue a re-check, re-point, or promote job
(plan 71), and delete a stub. Follow the merge review routes
(`apps/management-api/src/routes/feedMergeReview.ts`) for structure, auth, validation, errors, and
audit logging. Management-api gets no Podcast Index or parser dependency.

## Rows

R23, R37, R38, R39, R40, R41

## Runs after

71

## Files

apps/management-api/src/schemas/feedRemoteStubs.ts
apps/management-api/src/lib/feed/feedRemoteStubsAppDb.ts
apps/management-api/src/lib/feed/feedRemoteStubsAppDb.integration.test.ts
apps/management-api/src/routes/feedRemoteStubs.ts
apps/management-api/src/routes/feeds.ts
apps/management-api/src/routes/feeds-remote-stubs.integration.test.ts
apps/management-api/openapi.yml
packages/management-api-requests/src/feeds.ts
release-notes/scratchpad.md

## Routes — `feedRemoteStubs.ts` (new)

`export function registerFeedRemoteStubRoutes(router: Router): void`, called in
`apps/management-api/src/routes/feeds.ts` right after `registerFeedMergeReviewRoutes(router);`
(line 163), so it is registered before the `/:id` routes. Every route uses `ensureAuthenticated`
and `requireCrud('feeds', <op>)`, the `parseIdParam` and `readAdminId` shape from
`feedMergeReview.ts`, and `console.error(label, err)` plus 500 for unexpected errors.

| Method and path | CRUD op | Success |
| --- | --- | --- |
| `GET /feeds/remote-stubs` | read | 200 `{ remote_stubs, pagination }` |
| `GET /feeds/remote-stubs/:id` | read | 200 `{ remote_stub }`, 404 when missing |
| `POST /feeds/remote-stubs/:id/recheck` | update | 202 `{ job }` |
| `POST /feeds/remote-stubs/:id/repoint` | update | 202 `{ job }` |
| `POST /feeds/remote-stubs/:id/promote` | create | 202 `{ job }` |
| `DELETE /feeds/remote-stubs/:id` | delete | 204 |

- Promote is `create` because it adds a feed. Re-check and re-point are `update`.
- Every POST and DELETE loads the stub first (404 `Remote stub not found` when missing).
- Re-check calls `scheduleRemoteStubRecheck(id)`; re-point calls
  `scheduleRemoteStubRepoint(id, provider_feed_id)`; promote calls
  `scheduleRemoteStubPromote(stub.index_provider, stub.provider_feed_id)`. All come from
  `@podverse/orm` (plan 71). Re-point answers 400 `Target equals the current provider feed id`
  when the body id equals the stub's.
- Delete calls `new RemoteChannelStubService().deleteById(id)` (plan 11); `false` → 404.
- `job` in each 202 is `{ id, job_type, status, run_after }` from the returned `ScheduledJob`
  (`run_after` as ISO string).
- Audit every POST and DELETE with `AuditLogService.record`: `tableName: 'remote_channel_stub'`,
  `rowId: stub.id`, `beforeSnapshot` = `{ id, index_provider, provider_feed_id, title, feed_url }`.
  POSTs use `operation: 'update'` and `afterSnapshot` = the same fields plus
  `scheduled_job_type` (and `target_provider_feed_id` for re-point). DELETE uses
  `operation: 'delete'` and `afterSnapshot: null` (`AuditRecord` in
  `lib/database/auditLog.ts` allows null).

## Validation — `schemas/feedRemoteStubs.ts` (new)

Joi, shaped like `schemas/feedMergeReview.ts`, with a type guard parser per schema:

- List query: `page` (integer ≥ 1, default 1), `limit` (1–100, default 25), `q` (trimmed string
  ≤ 255, optional, empty → absent), `sort` one of `title`, `provider_feed_id`, `item_stub_count`,
  `resolved_at`, `created_at` (default `created_at`), `order` `asc` or `desc` (default `desc`).
  `.unknown(false)`.
- Re-point body: `provider_feed_id`, a string of 1–15 digits with no leading zero
  (`/^[1-9]\d{0,14}$/`), required. Podcast Index is the only provider; when a second one exists,
  this schema picks the rule by the stub's `index_provider`.

## Data access — `lib/feed/feedRemoteStubsAppDb.ts` (new)

Raw SQL on `AppDbDataSourceRead` from `@management-api/orm/db/appDb.js`, with row type guards,
the way `feedMergeReviewAppDb.ts` reads `channel_merge`. Export the row types so routes and tests
share them.

```ts
export type RemoteStubPendingAction = 'recheck' | 'repoint' | 'promote';

export type RemoteStubListRow = {
  id: number;
  index_provider: string;
  provider_feed_id: string;
  title: string | null;
  author: string | null;
  feed_url: string | null;
  feed_guid: string | null;
  medium_value: string | null;
  alias_count: number;
  item_stub_count: number;
  pending_action: RemoteStubPendingAction | null;
  resolved_at: string;
  created_at: string;
};

export type RemoteStubDetail = RemoteStubListRow & {
  image_url: string | null;
  aliases: { key_kind: 'feed_guid' | 'feed_url'; key_value: string }[];
  item_stubs: {
    item_guid: string;
    title: string | null;
    pub_date: string | null;
    duration_seconds: number | null;
    resolved_at: string;
  }[];
  jobs: {
    job_type: string;
    status: string;
    attempts: number;
    max_attempts: number;
    last_error: string | null;
    run_after: string;
    updated_at: string;
  }[];
};

export async function listRemoteStubs(query: RemoteStubListQueryValidated): Promise<{
  rows: RemoteStubListRow[];
  total: number;
}>;
export async function getRemoteStub(id: number): Promise<RemoteStubDetail | null>;
```

- Use plan 11's column names; `LEFT JOIN medium m ON m.id = s.medium_id` and select `m.value AS
  medium_value`.
- `q` matches `title ILIKE`, `feed_url ILIKE`, `provider_feed_id =`, or `lower(feed_guid) =
  lower(q)`. Escape `\`, `%`, and `_` in `q` with a backslash in a small local helper and use
  `ILIKE $n ESCAPE '\'`; this app has no shared helper for it.
- Counts come from `COUNT(*)` subqueries on `remote_channel_stub_alias` and `remote_item_stub`.
  The sort column comes from a fixed map of allowed keys, never from the request string. Tie-break
  on `id DESC`.
- `pending_action`: `LEFT JOIN LATERAL` the newest `scheduled_job` with status `pending` or
  `running` whose `dedupe_key` is one of the three keys from plan 71's builders for this stub
  (recheck and repoint by stub id, promote by provider and provider feed id), mapped by
  `job_type`. Build the key prefixes from plan 71's `REMOTE_STUB_*_JOB_TYPE` constants.
- Detail: aliases ordered by `key_kind, key_value`; the 50 newest item stubs by
  `pub_date DESC NULLS LAST, id DESC`; up to 10 jobs for those dedupe keys by `updated_at DESC`.
- Timestamps go out as ISO strings.

## OpenAPI — `apps/management-api/openapi.yml`

Add the six operations after the `/feeds/merges/{id}/revert` block (around line 5182), under the
same tag, with `RemoteStubListRow`, `RemoteStubDetail`, `RemoteStubJob`, and the re-point body in
`components.schemas`. Document 400, 401, 403, 404, and 202.

## Requests — `packages/management-api-requests/src/feeds.ts`

After the merge review block, add the response types (same shapes as the lib types, plus
`pagination` like `FeedMergeListResponse`) and `listRemoteStubs(params)`, `getRemoteStub(id)`,
`recheckRemoteStub(id)`, `repointRemoteStub(id, body: { provider_feed_id: string })`,
`promoteRemoteStub(id)`, `deleteRemoteStub(id)`, written like `listFeedMerges` and
`postFeedMerge`. `apps/management-web/src/lib/requests/feeds.ts` is
`export * from '@podverse/management-api-requests'`, so it needs no edit.

## Tests

- `routes/feeds-remote-stubs.integration.test.ts`, modeled on `feeds-merges.integration.test.ts`
  (mock `AdminAccountService`, the lib functions, the `@podverse/orm` schedule functions and
  `RemoteChannelStubService`, and `AuditLogService`; JWT `adminAuthHeaders`):
  - 401 without auth; 403 for an admin lacking each CRUD op (read for GET, update for re-check and
    re-point, create for promote, delete for DELETE).
  - List passes validated query values through; rejects an unknown sort and a `limit` over 100.
  - Detail 404 and 200.
  - Re-check, re-point, promote: 404 for a missing stub; 202 with `job`; the right schedule
    function and arguments; one audit record with `operation: 'update'` and
    `scheduled_job_type`.
  - Re-point 400 for a missing, non-numeric, or leading-zero id and for the current id.
  - DELETE 204 with a `delete` audit; 404 when `deleteById` returns false.
- `lib/feed/feedRemoteStubsAppDb.integration.test.ts`, modeled on
  `feedFlagStatusAppDb.integration.test.ts` (real app DB): insert two stubs with aliases, item
  stubs, and one pending `remote-stub-recheck` job; assert search by title and by provider id,
  sort by `item_stub_count`, pagination `total`, `pending_action`, and the detail's aliases, item
  stubs, and jobs. Clean up the rows it inserts.

## Release scratchpad

```markdown
## Management API remote stub routes

- Surfaces: management-api
- Change: `GET /feeds/remote-stubs` (search, sort, pages), `GET /feeds/remote-stubs/:id`, and
  `POST …/:id/recheck`, `…/:id/repoint` (`{ provider_feed_id }`), `…/:id/promote`, plus
  `DELETE /feeds/remote-stubs/:id`. The POST routes queue a workers job and answer 202; every
  write is audit-logged. Permissions: feeds read, update (re-check, re-point), create (promote),
  delete.
- Who notices: admins and anyone scripting the management API
- Operator steps: none
```
