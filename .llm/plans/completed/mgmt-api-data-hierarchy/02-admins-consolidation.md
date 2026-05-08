# Phase 02 — Admins consolidation

Eliminates the `/admin-account/*` namespace and merges the public token-redeem
flow under `/admins`.

## Scope

- Remove `apps/management-api/src/routes/adminAccount.ts` and
  `apps/management-api/src/routes/adminSetPassword.ts`.
- Remove `apps/management-api/src/routes/adminAccount.integration.test.ts`.
- Add public sub-route `POST /admins/invite-link/redeem` inside `admins.ts`.
- Move public web page from `apps/management-web/src/app/set-admin-password/`
  to a public route group at `/admins/redeem-invite-link/` (e.g.
  `apps/management-web/src/app/(public)/admins/redeem-invite-link/`).
- Rewrite `submitAdminSetPassword` request to `redeemAdminInviteLink`
  (path `/admins/invite-link/redeem`).

## Steps

1. Move `POST /admin-account/set-password` handler logic from
   `adminSetPassword.ts` into `admins.ts` as
   `router.post('/invite-link/redeem', ...)` (no auth middleware — public).
2. Convert `admins.ts` to mount-style per Phase 01.
3. Delete `adminAccount.ts` (no live caller; only tests reference it).
4. Update `apps/management-api/src/app.ts`: remove imports/uses of
   `adminAccountRouter` and `adminSetPasswordRouter`.
5. Replace `apps/management-api/src/routes/adminAccount.integration.test.ts`
   with coverage merged into `admins.integration.test.ts`
   (delete the standalone file).
6. Update `apps/management-web/src/lib/requests/admins.ts`:
   - Rename `submitAdminSetPassword` -> `redeemAdminInviteLink`,
     path `'/admins/invite-link/redeem'`.
   - Confirm all other `path: '/admins/...'` entries already match.
7. Move web page `app/set-admin-password/page.tsx`,
   `SetAdminPasswordPageClient.tsx` to public
   `app/(public)/admins/redeem-invite-link/`.
   - Adjust the `(management)` route group layout (or use a sibling
     `(public)` group) so `/admins/redeem-invite-link` does NOT require auth.
   - Update `adminInviteUrl` in `admins.ts` server route to point at
     `${web}/admins/redeem-invite-link?token=...`.
8. Update e2e spec `admins-detail-invite.spec.ts` to use the new page URL.

## Key files

- `apps/management-api/src/routes/admins.ts`
- `apps/management-api/src/routes/admins.integration.test.ts`
- `apps/management-api/src/routes/adminAccount.ts` (delete)
- `apps/management-api/src/routes/adminAccount.integration.test.ts` (delete)
- `apps/management-api/src/routes/adminSetPassword.ts` (delete)
- `apps/management-api/src/app.ts`
- `apps/management-web/src/lib/requests/admins.ts`
- `apps/management-web/src/app/set-admin-password/` (delete)
- `apps/management-web/src/app/(public)/admins/redeem-invite-link/` (new)
- `apps/management-web/e2e/admins-detail-invite.spec.ts`

## Verification

- `npm run lint` and `npm run build:packages` pass.
- `npm run test:e2e:api` covers list/get/create/update/delete admin, invite-link
  CRUD, and public redeem (200 valid token, 400 invalid/expired token).
- `make e2e_test_management_web_report_spec SPEC=e2e/admins-detail-invite.spec.ts,e2e/admins-list.spec.ts`
  passes against the renamed page URL.
