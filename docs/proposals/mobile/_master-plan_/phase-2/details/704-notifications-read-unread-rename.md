# 704-notifications-read-unread-rename

**Master step:** P2.4.5
**Model (author + implement):** Opus 5
**Status:** planned

## Scope

Notifications currently use **seen/unseen** vocabulary across the ORM, API, request helpers, and web.
Channel content is taking over "seen"
([703-channel-seen-state](/docs/proposals/mobile/_master-plan_/phase-2/details/703-channel-seen-state.md)),
so notifications move to **read/unread**.

This is a **breaking cross-surface rename**, not a copy change. It touches every layer.

### What exists today

| Layer             | Current name                                                                        |
| ----------------- | ----------------------------------------------------------------------------------- |
| ORM               | `Account.notifications_last_seen_at`                                                |
| API routes        | `GET /account/notifications/unseen-count`, `POST /account/notifications/mark-seen`  |
| API serialization | `countUnseen()`, `is_new` on `DTOAccountNotification`                               |
| Request helpers   | `reqNotificationsUnseenCount`, `reqNotificationsMarkSeen`                           |
| Web               | `useNotificationsUnseenCount`, `NotificationBellButton`, `NotificationsPageClient`  |
| Mobile            | `useNotificationsUnseenCount`, `notificationsRepository.getUnseenCount`, `markSeen` |
| i18n              | `settings.notifications.unseen_count_aria`, `notifications_page.new_section`        |
| Events            | `podverse:notifications-seen`                                                       |

### Rename

Every one of the above moves to read/unread — column, endpoints, DTO field, helpers, hooks,
components, i18n keys, and the browser event name. Coordinate the API change with clients so an
older mobile build does not break: version or dual-serve the endpoints through one release, then
retire the old names.

### Retention — verify, do not rebuild

Retention **already exists** and does not need to be created:

- `AccountNotification.expires_at` defaults to one month after insert.
- `apps/workers` `platformPurge` calls `AccountNotificationService.deleteExpiredBefore(cutoff)`.

In scope here: confirm the window is right, make it **env-configurable** rather than hardcoded, with
startup validation and documentation in the relevant `.env.example`. Present the inbox as a **recent
activity** view so pruning is not perceived as data loss.

### Decoupling

Confirm and test that no unseen-content count reads notification rows. Unseen counts derive from
channel `last_seen_at` plus item publish dates, so notification retention is now purely a delivery-log
decision and can be shortened freely.

Notifications remain **membership** tier, inbox and push alike.

## Acceptance criteria

- No seen/unseen vocabulary remains in notification code paths on any surface; read/unread is used
  consistently in the column, endpoints, DTO, helpers, hooks, components, i18n, and events.
- A linear migration renames the column; the ORM entity and DTO match.
- The API transition does not break an older mobile client mid-rollout.
- Retention window is env-configured with startup validation and documented; no default in
  `config/index.ts`.
- The purge job still deletes expired rows and is safe to re-run.
- Opening the Notifications surface marks notifications **read** and leaves every channel's
  `last_seen_at` untouched; opening a channel does the reverse.
- A test fails if any unseen-content count starts reading notification rows.
- Integration tests cover the renamed endpoints and pruning.

## Web parity references

- `packages/orm/src/entities/account/account.ts`, `.../accountNotification.ts`
- `apps/api/src/routes/account.ts`, `apps/api/src/controllers/account/accountNotification.ts`,
  `apps/api/src/lib/accountNotificationApiSerialization.ts`
- `packages/helpers-requests/src/api/account/notification/notifications.ts`
- `apps/web/src/app/notifications/`, `apps/web/src/hooks/useNotificationsUnseenCount.ts`,
  `apps/web/src/components/NavBar/NotificationBellButton.tsx`
- `apps/workers/src/commands/orm/notifications/platformPurge.ts`
- Skills: **linear-db-migrations**, **swagger-openapi**, **i18n**

## Verification

```bash
npm run lint
npm run test:unit
npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/notifications.spec.ts
npm run mobile:e2e:test -- push
```
