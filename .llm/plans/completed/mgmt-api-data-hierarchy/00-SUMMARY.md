# mgmt-api-data-hierarchy — summary

Reorganize all management-api routes and management-web URL paths under a
single resource-first data hierarchy that mirrors how `apps/api` mounts its
routers, eliminating overlapping concerns like the `admin-account` / `admins`
split.

## Why

- The management API has overlapping resources for the same concept
  (`/admin-account/:id` vs `/admins/:id`).
- Public token flows live in their own top-level resources
  (`/admin-account/set-password`, page `/set-admin-password`) that are
  conceptually children of `/admins`.
- Each router file repeats `${baseUrl}/<segment>/...` in every handler instead
  of mounting the router at its base path. `apps/api` already uses the cleaner
  `router.use(\`${prefix}/<segment>\`, router)` pattern.
- Several feature-area paths (`/feed-operations`, `/worker-commands`) and
  verb-style endpoints (`update-policy-state`, `change-password`) drift from a
  resource-rooted hierarchy.

## Decisions (override here before executing the plan)

- **D1** Public redeem flow lives under `/admins/...`
  - Page: `/admins/redeem-invite-link?token=...` (public, exempt from the
    management auth gate)
  - API: `POST /admins/invite-link/redeem`
- **D2** Full feature renames:
  - `/feed-operations/*` -> `/feeds/*`
  - `POST /feed-operations/update-policy-state` (body.feed_id) ->
    `PATCH /feeds/:id/policy-state`
  - `/worker-commands` -> `/workers/commands`
  - `/product/*` -> `/products/*`
  - `GET /stats/top/:type`, `/stats/detail/:type/:id`, `/stats/search/:type` ->
    `GET /stats/:type/top`, `GET /stats/:type/:id`, `GET /stats/:type/search`
  - `POST /users/:id/change-password` -> `POST /users/:id/password`
- **D3** Mount-style routers: every file becomes
  `router.use(\`${config.api.prefix}${config.api.version}/<segment>\`, router);`
  with relative paths in the handlers below.
- **D4** Hard break — no URL aliases, no legacy redirects, no deprecation copy.
- **D5** Web page paths mirror API resource roots wherever a renaming applies.

## Resource map (proposed)

- `/auth/*` — login, logout, me (no URL changes)
- `/admins/*` — list, CRUD, invite-link CRUD per admin, public redeem-invite-link
- `/users/*` — list, CRUD, password subresource, invite-link CRUD per user
- `/feeds/*` — list/lookup/options, `PATCH :id/policy-state`
- `/products/*` — `membership` (settings), `pricing` (active/schedule/:id/activate, ...)
- `/stats/:entityType/*` — `top`, `search`, `:id`
- `/storage/*` — feature info + `/storage/objects/*` (no URL change)
- `/database/*` — meta + `/:table/*` (no URL change)
- `/workers/*` — `commands` (registry); namespace ready for future trigger
  endpoints

## Files in this plan set

- `00-EXECUTION-ORDER.md` (sequence)
- `01-principles-and-conventions.md` (locks contract)
- `02-admins-consolidation.md`
- `03-users-resource.md`
- `04-feeds-resource.md`
- `05-products-pluralization.md`
- `06-stats-hierarchy.md`
- `07-workers-resource.md`
- `08-storage-and-database-tidy.md`
- `09-auth-tidy.md`
- `10-verify-and-docs.md`
- `COPY-PASTA.md`

## Out of scope

- `apps/api` (main API) routes — only used as the reference convention.
- Permission/CRUD model (`feeds_crud`, `admins_crud`, etc.).
- Database schema — no migrations needed, URL-only refactor.
- Auth/session mechanics — cookie/JWT shape unchanged.
