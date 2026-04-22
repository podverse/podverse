# 06 — Account Settings

## Goal

Integration tests for account settings routes (locale, notification types).

## Routes under test

All routes are under `/api/v1/account-settings/` and require authentication.

| Method | Path | Auth | Membership | Notes |
|--------|------|------|------------|-------|
| PATCH | `/locale` | Required | Skipped | Update account locale |
| POST | `/notification-type` | Required | Required | Create notification type setting |
| DELETE | `/notification-type` | Required | Skipped | Delete notification type setting |

## File

`apps/api/src/test/account-settings.test.ts`

## Test cases

### PATCH /locale

- **200 with valid locale** — authenticated, mocks `AccountSettingsLocaleService.update`, verifies response
- **401 without auth** — no auth header
- **400 with invalid locale** — sends non-locale string (if validation exists)

### POST /notification-type

- **200 with valid data** — authenticated + active membership, mocks `AccountSettingsNotificationTypeService.create`
- **401 without auth**
- **403 with expired membership** — mocks expired membership since this route requires membership check

### DELETE /notification-type

- **200 with valid data** — authenticated (membership not checked for delete), mocks service delete
- **401 without auth**

## Mocking strategy

- Mock `AccountSettingsLocaleService` and `AccountSettingsNotificationTypeService` from `@podverse/orm`
- Use shared helpers

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/account-settings.test.ts
```
