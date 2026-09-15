# 727-notification-subscribe-defaults

**Master step:** P2.1.2 (cross-surface)
**Model (author + implement):** Opus 5
**Status:** done

## Scope

Make subscribe and notification defaults consistent on **API, web, and mobile**:

1. Subscribe / follow does **not** enable notifications by default.
2. Account setting **`auto_enable_on_subscribe`** (default **false**) — when true, a successful
   signed-in follow also creates the per-channel notification row.
3. User Settings UI (web + mobile) to edit:
   - the auto-enable flag
   - which notification **types** are copied when a channel is enabled
     (`new-item`, `livestream-scheduled`, `livestream-started`)

Server already copies `account_settings_notification_types` in
[`AccountNotificationChannelService.create`](packages/orm/src/services/account/accountNotificationChannel.ts).
Type create/delete APIs already exist (`reqAccountSettingsNotificationTypeCreate` /
`Delete`). What is missing is the **auto-enable column**, the **follow hook**, and the **Settings UI**.

### Schema

- Linear migration `0008_*.sql` (next after `0007_popularity_tracking_consent.sql`): add
  `auto_enable_on_subscribe boolean not null default false` on `account_settings_notification`.
- ORM entity + DTO widen
  [`DTOAccountSettingsNotification`](packages/helpers/src/dtos/account/accountSettings/accountSettingsNotification.ts).
- Seed / ensure-settings paths set the column to false for new rows.
- `account_snapshot` already stores `DTOAccount`; missing field on old phones reads as off — correct
  default. Document under [`dto-changes-are-device-data-migrations`](/.cursor/rules/dto-changes-are-device-data-migrations.mdc).
- After SQL: `make db_regen_linear_baseline` / verify (operator).

### Follow hook

In [`accountFollowingChannel.ts`](apps/api/src/controllers/account/accountFollowingChannel.ts)
(single **and** bulk follow): after a successful follow, if
`auto_enable_on_subscribe` is true and no notification channel exists for that channel, call
`AccountNotificationChannelService.create`. Failures on notification create must not roll back the
follow.

Web Subscribe and mobile signed-in follow both hit these endpoints — one server hook covers both.

### Settings UI

| Surface | Where                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| Web     | [`SettingsNotifications`](apps/web/src/components/Settings/Panels/SettingsNotifications/SettingsNotifications.tsx) |
| Mobile  | [`MoreSettingsNotificationsScreen`](apps/mobile/src/screens/more/MoreSettingsNotificationsScreen.tsx)              |

Add:

- Switch: auto-enable notifications when I subscribe (default off).
- Switches for the three type defaults (create/delete via existing account-settings notification-type
  APIs). Default seeded types today: `new-item` + `livestream-started`.

Category preferences (in-app / push per `NotificationCategoryEnum`) stay as they are — this detail
does not replace them.

### OpenAPI / tests

- Update `apps/api/openapi.yml` for the new field and any settings PATCH/GET shape change.
- API integration tests: follow with flag off → no channel; flag on → channel with expected types;
  bulk follow respects the flag.
- Do not run tests during agent work; operator runs them.

## Acceptance criteria

- New accounts get `auto_enable_on_subscribe = false`.
- Follow with flag off never creates a notification channel.
- Follow with flag on creates one channel (idempotent if already present) using account type defaults.
- Web and mobile Settings can toggle the flag and the three type defaults.
- DTO widen does not break older mobile snapshots (missing → off).
- OpenAPI and API tests cover the new behavior.

## Web parity references

- [`accountNotificationChannel.ts`](packages/orm/src/services/account/accountNotificationChannel.ts)
- [`account.ts`](packages/orm/src/services/account/account.ts) — default type seeding
- [`accountNotificationType.ts`](packages/helpers/src/lib/accountNotificationType.ts)
- [`ListChannelSettings.tsx`](apps/web/src/components/List/ListChannelSettings.tsx)
- Skill: **linear-sql-greenfield-only**, **openapi-sync**, **cross-surface-change-impact**

## Verification

```bash
# Root
make db_regen_linear_baseline
make db_verify_linear_baseline
npm run openapi:check
npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/settings-notifications.spec.ts

# Mobile Maestro (account defaults + podcast subscribe path)
npm run mobile:e2e:test -- notifications-inbox
npm run mobile:e2e:test -- podcast-episode
```
