# Phase 03 — Users resource

`change-password` becomes a `password` subresource and the router moves to
mount-style.

## Scope

- `POST /users/:id/change-password` -> `POST /users/:id/password`.
- Convert `users.ts` to mount-style.
- No other URL changes.

## Steps

1. In `apps/management-api/src/routes/users.ts` mount the router at
   `${prefix}${version}/users` and rewrite all handlers as relative paths
   (`/`, `/:id`, `/:id/password`, `/:id/invite-link`).
2. Rename the `change-password` handler path to `/:id/password`.
3. Update `apps/management-api/src/routes/users.integration.test.ts`:
   - All `${prefix}${version}/users/...` paths verified against new shape.
   - Replace `change-password` test paths with `/password`.
4. Update `apps/management-web/src/lib/requests/users.ts`:
   - `changeUserPassword` -> path `/users/:id/password` (function name may
     stay).
5. Update any management-web client that calls `changeUserPassword` (search the
   tree; current detail/edit clients call this helper directly).
6. Update e2e specs only if they touch the API path.

## Key files

- `apps/management-api/src/routes/users.ts`
- `apps/management-api/src/routes/users.integration.test.ts`
- `apps/management-web/src/lib/requests/users.ts`
- `apps/management-web/src/app/(management)/users/[id]/UserDetailPageClient.tsx`
- `apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx`

## Verification

- Integration tests cover `/users/:id/password` (200, 401, 403, 400 invalid pwd).
- `make e2e_test_management_web_report_spec SPEC=e2e/users-list.spec.ts,e2e/users-new-create-username-only.spec.ts`
  passes.
