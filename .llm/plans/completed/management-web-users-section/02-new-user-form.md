# 02 - New User Form Page

## Goal

Create the "New User" page at `/users/new` where superuser admins can create app users.

## Steps

1. Create `apps/management-web/src/app/(management)/users/new/page.tsx`:
   - Server component that wraps `NewUserPageClient`
   - Breadcrumbs: Users / New

2. Create `apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx`:
   - `'use client'` component
   - Form fields: username (optional), email (optional), password (optional)
   - Validation: at least one of username or email must be provided
   - Username validation: 3-32 chars, `[a-zA-Z0-9_-]+` (no `@`)
   - Email validation: basic format check
   - Password validation: min 8 chars
   - On submit: calls `createUser` from request helper
   - **Two post-submit states**:
     - If response includes `set_password_url`: show the invite link in a read-only input with a Copy button
     - If response has no `set_password_url` (password was provided): show success message
   - Loading state on submit button
   - Error state from API response
   - Pattern after `apps/management-web/src/app/(management)/admins/new/NewAdminPageClient.tsx` for layout/styles

3. Style considerations:
   - Use `page.module.scss` from the admins section as a reference
   - Keep breadcrumb pattern consistent with existing pages

## Reference

- Metaboost `UserForm.tsx` (`metaboost/apps/management-web/src/components/users/UserForm.tsx`) shows the invite-link display pattern with `CopyButton`
- Podverse `NewAdminPageClient.tsx` shows the management-web form pattern
- Podverse management API `POST /api/v1/users` returns `{ message, set_password_url? }` on 201
