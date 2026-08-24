# 03 — API notifications & preferences

**Cursor model:** Codex 5.3
**Reasoning:** medium
**Ship bar:** Feed/unseen/mark-seen + expanded preference CRUD + shared enqueue helpers + OpenAPI +
integration tests.

## Goal

Expose in-app notification feed and global seen state to clients; expand preference APIs; provide
server helpers to create notification rows and optional push; schedule membership-expiry jobs on
membership mutations (if not fully wired in 02).

## Context (read first)

- Phase 01 services: `AccountNotificationService`, `AccountNotificationPreferenceService`
- Phase 02: `MembershipExpiryReminderScheduler`
- API patterns: `apps/api/src/routes/accountSettings.ts`,
  `apps/api/src/controllers/account/accountSettings/accountSettingsPlayback.ts`
- Auth: `apps/api/src/lib/auth/index.ts` (membership gate on protected routes)
- Request types: `packages/helpers-requests/src/api/`
- Skills: **api**, **api-testing**, **swagger-openapi**

## Routes (apps/api)

Mount under `/api/v1/account` (authenticated unless noted):

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/notifications` | Paginated feed for `req.user` |
| GET | `/notifications/unseen-count` | Integer badge count |
| POST | `/notifications/mark-seen` | Set `notifications_last_seen_at = now()` |
| GET | `/notification-preferences` | All category rows for account |
| PUT | `/notification-preferences` | Bulk upsert `{ preferences: [{ category, in_app_enabled, push_enabled }] }` |

Keep existing `/account-settings/notification-type` POST/DELETE for backward compat; document mapping
to new categories in controller comments.

### GET `/notifications`

Query params (match web pagination conventions):

- `page` (1-based) or `cursor` + `limit` (pick one; prefer **page/limit** to match
  `ListEpisodes` pattern, or offset/limit like management users list)
- `limit` default 20, max 50

Response:

```typescript
{
  data: {
    last_seen_at: string | null;
    items: AccountNotificationDto[];
    pagination: { page, total_pages, total_count };
    sections: { new_count: number }; // optional hint for UI
  }
}
```

Server computes `is_new: created_at > last_seen_at` per item for client convenience (derived, not
stored).

### POST `/notifications/mark-seen`

Idempotent. Updates account row. Returns `{ data: { last_seen_at } }`.

### Preferences

Validate categories against `NotificationCategory` enum. Enforce `allow_notifications` entitlement
on **push_enabled** changes (mirror `AccountNotificationChannelTypeController`).

**Product-update:** user may disable; **maintenance/tos/general:** in_app always true (push toggles
allowed where applicable).

## Shared enqueue helper (api or orm package)

`createAccountNotificationWithOptionalPush` in `packages/orm` or `apps/api/src/lib/`:

1. Insert `account_notification` row(s).
2. For each account, if `push_enabled` + `hasValidMembership` + `allow_notifications` + devices:
   call existing `notificationOrchestrator` path (phase 04 may move parser-side; API uses same helper).

Bulk insert for N accounts (admin/management later).

## Membership job scheduling

Ensure API paths that change `membership_expires_at` call `MembershipExpiryReminderScheduler` (if 02
hooks missed any entry points, add here):

- PayPal complete controller
- Any account settings that touch membership (unlikely)

## Integration tests (`apps/api/src/test/`)

1. Authenticated user: empty feed → create row via service → GET returns item.
2. `unseen-count` increases; `mark-seen` zeros it; second device would see same (single account).
3. Pagination: 25 rows → page 1 and 2.
4. Preference PUT toggles `push_enabled`; 403 when entitlement missing.
5. Legacy notification-type create still works.

## OpenAPI

Update `apps/api` OpenAPI spec / swagger for new routes (repo convention).

## Tasks

1. Controllers + Joi schemas + routes.
2. DTO serializers (`accountNotificationToJson`).
3. Enqueue helper (in-app row; push stub or delegate to notifications package).
4. Wire membership scheduler on any gap from 02.
5. Integration tests.
6. OpenAPI sync.

## Out of scope

- Parser bulk insert (04).
- Management-api routes (05).
- Web/mobile UI (06/07).

## Acceptance

- All integration tests pass with `make test_deps` + `npm run test:e2e:api`.
- Mobile/web can call feed + mark-seen with bearer auth.

## Verification (operator)

```bash
npm run build:packages
npm run build -w apps/api
make test_deps
npm run test:e2e:api
npm run test -w apps/api -- src/test/notifications.test.ts
```
