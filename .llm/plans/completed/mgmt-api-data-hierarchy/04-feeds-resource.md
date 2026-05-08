# Phase 04 — Feeds resource (was feed-operations)

Renames `/feed-operations/*` to `/feeds/*` and converts the verb-style policy
update into a RESTful patch on the feed.

## Scope

- API path renames (hard break):
  - `GET /feed-operations/options` -> `GET /feeds/options`
  - `GET /feed-operations/list` -> `GET /feeds`
  - `GET /feed-operations/lookup` -> `GET /feeds/lookup`
  - `POST /feed-operations/update-policy-state` (with `feed_id` in body) ->
    `PATCH /feeds/:id/policy-state` (id in path).
- Web page rename: `/feed-operations/flag-status` -> `/feeds/flag-status`.

## Steps

1. Rename `apps/management-api/src/routes/feedFlagStatus.ts` ->
   `apps/management-api/src/routes/feeds.ts`. Mount at `/feeds`.
2. Rewrite `update-policy-state` handler as `PATCH /:id/policy-state`. Read
   `feed_id` from `req.params.id`; remove the body field; keep the rest of the
   body schema in `apps/management-api/src/schemas/feedOperationsPolicy.ts`.
3. Update `apps/management-api/src/app.ts` import
   (`feedFlagStatusRouter` -> `feedsRouter`).
4. Rename test file
   `apps/management-api/src/routes/feedFlagStatus.integration.test.ts` ->
   `feeds.integration.test.ts`; update all paths.
5. Rename `apps/management-web/src/lib/requests/feedFlagStatus.ts` ->
   `feeds.ts`; update `path:` strings; rewrite
   `applyFeedOperationsPolicyState` to call
   `` PATCH /feeds/${body.feed_id}/policy-state `` with the rest of the body.
6. Move web page directory
   `apps/management-web/src/app/(management)/feed-operations/flag-status/` ->
   `apps/management-web/src/app/(management)/feeds/flag-status/`.
   - Delete the empty `feed-operations` directory.
   - Update navbar/sidebar links and any deep links.
7. Rename e2e spec
   `apps/management-web/e2e/feed-operations-flag-status.spec.ts` ->
   `feeds-flag-status.spec.ts`; update URL assertions.
8. Update `makefiles/local/e2e-spec-order-management-web.txt` if it lists the
   spec.

## Key files

- `apps/management-api/src/routes/feeds.ts` (renamed)
- `apps/management-api/src/routes/feeds.integration.test.ts` (renamed)
- `apps/management-api/src/app.ts`
- `apps/management-api/src/schemas/feedOperationsPolicy.ts`
- `apps/management-web/src/lib/requests/feeds.ts` (renamed)
- `apps/management-web/src/app/(management)/feeds/flag-status/` (new)
- `apps/management-web/e2e/feeds-flag-status.spec.ts` (renamed)
- `makefiles/local/e2e-spec-order-management-web.txt`

## Verification

- `npm run test:e2e:api` covers all feed paths (200/400/401/403/404).
- `make e2e_test_management_web_report_spec SPEC=e2e/feeds-flag-status.spec.ts`
  passes.
