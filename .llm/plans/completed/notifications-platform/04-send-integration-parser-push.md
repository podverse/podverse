# 04 — Send integration (parser & push)

**Cursor model:** Codex 5.3
**Reasoning:** high
**Ship bar:** New item/livestream creates in-app rows for subscribers; expanded pref + membership
gating at send time; membership-expiry push path; unit tests.

## Goal

When content notifications fire today (parser → push), also create per-user `account_notification`
rows. Apply expanded per-category preferences and tighten push gating (`allow_notifications` at send
time).

## Context (read first)

- `packages/parser/src/lib/notifications/handleNewItemNotifications.ts`
- `packages/parser/src/lib/notifications/handleNewLiveItemNotifications.ts`
- `packages/parser/src/lib/notifications/sharedNotificationHelpers.ts` (`getDevicesForNotificationType`)
- `packages/notifications/src/services/notifications/notificationOrchestrator.ts`
- Phase 03: `createAccountNotificationWithOptionalPush` helper
- Legacy types: `AccountNotificationTypeEnum` (`new-item`, `livestream-scheduled`, `livestream-started`)
- New categories: `new-content`, `livestream` (map legacy → new for in-app rows)

## Recipient computation

Reuse `getDevicesForNotificationType` / `account_notification_channel` logic for **who** is a
subscriber. For in-app rows:

1. Same account ID set as push recipients **OR** slightly broader (locked: **mirror push gating** —
   only accounts with valid membership + channel subscription + category enabled).
2. Read `account_notification_preference` for category:
   - `new-content` ← enabled when legacy `new-item` type on channel OR global default
   - `livestream` ← enabled when `livestream-scheduled` or `livestream-started` on channel
3. If `in_app_enabled`: bulk insert notification row (title/body from same i18n as push).
4. If `push_enabled` AND `allow_notifications` entitlement AND devices: existing push path.

## Mapping legacy → new categories

| Legacy channel type | In-app category | Push (existing) |
| --- | --- | --- |
| `new-item` | `new-content` | unchanged message types |
| `livestream-scheduled` | `livestream` | unchanged |
| `livestream-started` | `livestream` | unchanged |

## Implementation steps

1. **Extract** `getAccountIdsForChannelNotification(channelId, legacyType)` from
   `sharedNotificationHelpers` (refactor without behavior change for push).
2. **Add** `createInAppNotificationsForAccounts({ accountIds, category, title, body, linkPath, payload })`
   calling ORM service bulk insert.
3. **Call** from `handleNewItemNotifications` / `handleNewLiveItemNotifications` after computing
   recipients (before or after push batch — order: in-app first so feed exists even if push fails).
4. **Push gating fix:** In `getDevicesForNotificationType`, skip accounts where
   `allow_notifications` is false on membership status (read entitlement helper from
   `@podverse/helpers` account trust). Align with API entitlement checks.
5. **Membership-expiry:** In phase 02 handler, call shared enqueue helper for push when prefs allow
   (complete push half deferred from 02).

## Link paths

Match `notificationOrchestrator` URL building:

- Episodes → `/episode/{id_text}`
- Livestream → `/podcast/livestream/{channel_id_text}` (verify existing orchestrator paths)
- Store `link_path` relative (no host) for mobile deep linking.

## Unit tests

- `packages/parser/src/lib/notifications/__tests__/`: mock ORM; given 3 subscribers, 1 without
  membership → 2 rows inserted.
- Pref off → no row for that account.
- `allow_notifications=false` → no push tokens returned (extend existing tests if any).

## Tasks

1. Refactor recipient helper.
2. Wire in-app bulk insert into new item + live item handlers.
3. Add `allow_notifications` check to push recipient filter.
4. Wire membership-expiry push via shared helper.
5. Unit tests.

## Out of scope

- Admin broadcast (05).
- Changing FCM/WebPush/UP transport.
- Mobile/web UI.

## Acceptance

- Parser integration tests or unit tests prove rows created for valid subscribers.
- Push recipient count ≤ in-app row count when push disabled per pref.
- No regression to existing push tests (if any).

## Verification (operator)

```bash
npm run build:packages
npm run test -w packages/parser
npm run test -w packages/helpers
```
