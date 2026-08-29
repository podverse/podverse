# 14 — Notifications read/unread rename

**Cursor model:** Opus 5
**Reasoning:** extra high
**Detail:** [704-notifications-read-unread-rename](/docs/proposals/mobile/_master-plan_/phase-2/details/704-notifications-read-unread-rename.md)
**Master step:** P2.4.5
**Depends on:** 04
**May run parallel with:** 06–09

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 19 and 24 before starting.

## Goal

Notifications move from **seen/unseen** to **read/unread**, freeing "seen" for channel content, and
their existing retention is verified and made configurable.

## This is a breaking cross-surface rename

Notifications ship today using seen/unseen across the ORM, API, request helpers, **web**, and mobile.
This is not a copy change. Every layer below moves:

| Layer             | Current                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| ORM               | `Account.notifications_last_seen_at`                                             |
| API routes        | `GET /account/notifications/unseen-count`, `POST /account/notifications/mark-seen` |
| API serialization | `countUnseen()`, `is_new` on `DTOAccountNotification`                            |
| Request helpers   | `reqNotificationsUnseenCount`, `reqNotificationsMarkSeen`                        |
| Web               | `useNotificationsUnseenCount`, `NotificationBellButton`, `NotificationsPageClient` |
| Mobile            | `useNotificationsUnseenCount`, `notificationsRepository`                          |
| i18n              | `settings.notifications.unseen_count_aria`, `notifications_page.new_section`      |
| Browser event     | `podverse:notifications-seen`                                                    |

## Work

1. Rename every item above to read/unread — column, endpoints, DTO field, helpers, hooks,
   components, i18n keys, and the event name.
2. **Linear migration** for the column rename under
   `infra/k8s/base/ops/source/database/linear-migrations/` per **linear-db-migrations**.
3. **Do not break an older mobile build mid-rollout.** Version or dual-serve the endpoints for one
   release, then retire the old names. State the transition approach in the implementation.
4. Update OpenAPI per **swagger-openapi**.
5. **Retention already exists — verify, do not rebuild.** `AccountNotification.expires_at` defaults
   to one month and `apps/workers` `platformPurge` deletes expired rows. Confirm the window, make it
   **env-configurable** with startup validation and `.env.example` documentation, and keep the purge
   idempotent. No default in `config/index.ts`.
6. Present the inbox as a **recent activity** view so pruning is not perceived as data loss, on both
   web and mobile, through i18n.
7. Audit every path producing an unseen-content count and confirm none reads notification rows. Add
   a test that fails if that coupling returns.
8. Opening Notifications marks them **read** and must leave every channel's `last_seen_at`
   untouched; opening a channel does the reverse.
9. Confirm notifications remain **membership** tier on mobile through the seam from prompt 01.
10. Integration tests for the renamed endpoints and pruning; a unit test asserting read state and
    seen state are independent.

## Constraints

- Env vars follow **env-file-formatting** and **startup-validation-env-order**.
- Do not change push providers, notification categories, or the registration flow.
- Web must behave identically after the rename — same bell badge, same inbox sections.
- Do not run tests during implementation.

## Done when

No seen/unseen vocabulary remains in notification code on any surface, the migration and API
transition are safe, retention is configurable and verified, and read state and seen state provably
do not affect each other.
