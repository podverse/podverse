# 03 - Users List Page

## Goal

Create a users list page at `/users` that shows a table of app users.

## Prerequisite

A `GET /api/v1/users` management API endpoint does **not** currently exist. This step requires either:
- **Option A**: Create a `GET /api/v1/users` endpoint in `apps/management-api/src/routes/users.ts` (superuser-only, returns a list of users with id, email, username, created_at)
- **Option B**: Create the list page with an empty state / "coming soon" message and defer the list endpoint

## Steps (Option A — full implementation)

1. Add `GET /api/v1/users` to `apps/management-api/src/routes/users.ts`:
   - `ensureAuthenticated`, `requireSuperuser` middleware
   - Query `account_credentials` joined with `account` for basic user info
   - Return `{ users: [{ id, email, username, created_at }] }`

2. Add `listUsers` to `apps/management-web/src/lib/requests/users.ts`

3. Create `apps/management-web/src/app/(management)/users/page.tsx`:
   - Server component, fetches users on the server side

4. Create `apps/management-web/src/app/(management)/users/UsersListPageClient.tsx`:
   - Table with columns: ID, Email, Username, Actions
   - "Create User" link/button pointing to `/users/new`
   - Empty state message

## Steps (Option B — placeholder)

1. Create `apps/management-web/src/app/(management)/users/page.tsx`:
   - Server component with title "Users"
   - Shows a "Create User" button/link to `/users/new`
   - Shows "User listing coming soon" message

2. Create `apps/management-web/src/app/(management)/users/UsersListPageClient.tsx`:
   - Minimal placeholder

## Notes

- The list page is lower priority than the create page. The primary admin need is creating users and getting invite links.
- Recommend **Option B** for now to unblock the create flow, with a follow-up for the full list endpoint.
