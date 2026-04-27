# 01 - Management API User Request Helpers and Nav

## Goal

Add the API request helper for `POST /users` and register the "Users" nav section so the sidebar/dashboard card appears.

## Steps

1. Create `apps/management-web/src/lib/requests/users.ts`:
   - `createUser(params: { username?: string; email?: string; password?: string }, jwt?: string)` — calls `POST /api/v1/users`, returns `{ message, set_password_url? }`
   - Follow the `ManagementApiRequestService` pattern from `admins.ts`

2. Update `apps/management-web/src/lib/managementNavRoutes.ts`:
   - Add `'users'` to `ManagementNavSection` union type
   - Add a `ROUTES` entry: `{ section: 'users', href: '/users', visible: (user) => user.role === 'superuser' }`
   - Add `'users'` to `titleKeys` and `descriptionKeys` maps
   - Add `DashboardI18nTitleKey` and `DashboardI18nDescriptionKey` union values for users

3. Update `apps/management-web/i18n/originals/en-US.json`:
   - Add `dashboard.users.title` and `dashboard.users.description`
   - Add top-level `users` section with keys for:
     - `title`, `createUser`, `failedToCreate`, `createdSuccessfully`, `createdWithLink`
     - `inviteLinkLabel`, `copyLink`, `linkCopied`, `backToList`
     - `usernameOptional`, `emailOptional`, `passwordOptional`
     - `emailOrUsernameHint`, `emailOrUsernameRequired`
     - `tableHeaders.id`, `tableHeaders.email`, `tableHeaders.username`, `tableHeaders.actions`

## Notes

- The management API route `POST /api/v1/users` already exists in `apps/management-api/src/routes/users.ts`.
- Visibility is superuser-only to match the `requireSuperuser` middleware on the API route.
- There is no `GET /api/v1/users` list endpoint yet; the list page will be a placeholder or empty state until one is added. Consider whether to add a list endpoint as part of this plan or defer it.
