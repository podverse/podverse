# 06 — Web notifications UI

**Cursor model:** Codex 5.3
**Reasoning:** medium
**Ship bar:** Bell + badge in NavBar; `/notifications` page; expanded settings; mark-seen on load;
membership-expiry deep link; E2E screenshot report.

## Goal

Add global notifications inbox to web: unseen badge next to user menu, paginated feed with
New/Earlier sections, expanded per-category preference UI, and deep links (including renew).

## Context (read first)

- NavBar: `packages/ui/src/components/navigation/NavBar/NavBar.tsx` (`rightCluster`),
  `apps/web/src/components/NavBar/NavBar.tsx`
- No inbox today — greenfield page
- Pagination: `apps/web/src/components/Pagination/Pagination.tsx` + `@podverse/ui` `PaginatedSection`
- Settings: `apps/web/src/components/Settings/Panels/SettingsNotifications/SettingsNotifications.tsx`
- API phase 03 routes
- Skills: **web**, **ui-component-promotion**, **e2e-page-tests**, **ui-e2e-screenshot-report**

## NavBar bell

1. Extend `NavBarProps` in `@podverse/ui` with optional `trailingActions?: ReactNode` rendered in
   `rightCluster` **before** `accountMenu` (document in `PACKAGES-UI.md` if needed).
2. Add `NotificationBellButton` in `apps/web/src/components/NavBar/`:
   - `IconButton` + bell icon (`FaBell` or shared icon pattern)
   - Poll or fetch `GET /notifications/unseen-count` on mount + interval (60s) + on focus
   - Badge overlay when count > 0 (new shared `CountBadge` in `@podverse/ui` if no primitive exists —
     small circle with number, max "99+")
   - Link to `ROUTES.NOTIFICATIONS` (add constant `/notifications`)
3. Wire in `apps/web/src/components/NavBar/NavBar.tsx` when logged in only.

## `/notifications` page

`apps/web/src/app/notifications/page.tsx` + client component:

1. On mount: `POST /notifications/mark-seen` then fetch page 1.
2. Layout:
   - **New** section: items where `is_new` (from API)
   - **Earlier** section: remaining items on page (or fetch splits — simpler: single list with
     section headers when `is_new` flips false mid-list)
3. Pagination via existing `Pagination` component.
4. Each row: title, body snippet, category label (i18n), relative time, link (Next.js `Link` to
   `link_path`).
5. Empty state when no notifications.
6. Auth required — redirect to login if anonymous.

**Membership-expiry rows:** `link_path` `/membership/renew` — use existing membership routes.

## Expanded settings UI

Refactor `SettingsNotifications.tsx`:

- Replace simple global type toggles with **per-category** rows:
  - Label + description (i18n)
  - Sub-controls: In-app (switch), Push (switch, disabled if no push method registered)
- Categories: new-content, livestream, membership-expiry, product-update (with "disable product
  updates" copy), maintenance/tos/general (in-app locked on, push optional if applicable)
- `PUT /notification-preferences` on change (debounced or per-toggle)
- Keep Web Push / Unified Push registration sections above preferences.

Remove obsolete copy if any overlaps with mobile "default can be overridden" (web may have similar —
audit strings).

## Request client

Add to `packages/helpers-requests` or web API service:

- `reqNotificationsList`, `reqNotificationsUnseenCount`, `reqNotificationsMarkSeen`,
  `reqNotificationPreferencesGet`, `reqNotificationPreferencesUpdate`

## E2E

`apps/web/e2e/notifications-inbox.spec.ts`:

- Seed or API-setup: create notification via test helper or direct DB seed
- Logged-in user sees bell badge
- Open `/notifications` → mark seen → badge clears
- Screenshot report via make target

## Tasks

1. `@podverse/ui` NavBar `trailingActions` + optional `CountBadge`.
2. `ROUTES.NOTIFICATIONS` + page + components.
3. API client wrappers + hook `useNotificationsUnseenCount`.
4. Expanded `SettingsNotifications`.
5. i18n keys in `packages/i18n-catalog/consumer/originals/en-US.json` (+ `npm run i18n:all` note).
6. E2E spec.

## Out of scope

- Mobile (07).
- Real-time websocket updates (polling sufficient v1).
- Push permission changes (existing flow).

## Acceptance

- Badge reflects API count; opening page clears badge on refresh.
- Paginated list matches API.
- Settings persist per-category prefs.

## Verification (operator)

```bash
npm run build:packages
make e2e_test_web_report_spec SPEC=e2e/notifications-inbox.spec.ts
open .artifacts/e2e-reports/latest/web/index.html
```
