# Management Web Users Section

## Problem

The management API route `POST /api/v1/users` exists and can create app users (optionally returning a `set_password_url` invite link). The web app's `/set-password` page handles the user-facing password-set flow. However, there is **no management-web UI** for admins to:

1. List app users
2. Create new app users (with or without a password)
3. See/copy the invite link when a user is created without a password
4. Edit existing users
5. Change a user's password

The Metaboost management-web already has a fully implemented Users section (`apps/management-web/src/components/users/UserForm.tsx`, `apps/management-web/src/app/(main)/users/`) that can serve as a reference pattern.

## Scope

Build a Users section in `podverse/apps/management-web` that provides:

- A "Users" nav entry in the management sidebar/dashboard (superuser-only)
- A users list page with a table
- A "New User" form page that:
  - Accepts optional username, optional email, optional password
  - Enforces "at least one of username or email"
  - If password is provided: creates user directly, shows success
  - If password is omitted: creates user, displays and allows copying the invite link (`set_password_url`)
  - Uses the existing `POST /api/v1/users` management API endpoint
- i18n keys in `en-US.json`

## Files Involved

### New files
- `apps/management-web/src/app/(management)/users/page.tsx` — users list page
- `apps/management-web/src/app/(management)/users/UsersListPageClient.tsx` — client-side list component
- `apps/management-web/src/app/(management)/users/new/page.tsx` — new user page
- `apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx` — client-side create form
- `apps/management-web/src/lib/requests/users.ts` — API request helpers for users

### Modified files
- `apps/management-web/src/lib/managementNavRoutes.ts` — add `users` section
- `apps/management-web/i18n/originals/en-US.json` — add `users` translation keys
- `apps/management-web/src/app/(management)/dashboard/DashboardPageClient.tsx` — add users dashboard card (if applicable)

### Reference (Metaboost, read-only)
- `metaboost/apps/management-web/src/components/users/UserForm.tsx`
- `metaboost/apps/management-web/src/app/(main)/users/page.tsx`
