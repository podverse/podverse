# 04 — Account Devices

## Goal

Integration tests for FCM, WebPush, and UP device management routes.

## Routes under test

All routes are under `/api/v1/account/` and require authentication.

### FCM Devices

| Method | Path | Notes |
|--------|------|-------|
| POST | `/fcm-device/create` | Create FCM device token |
| PUT | `/fcm-device/update` | Update FCM device token |
| DELETE | `/fcm-device/delete` | Delete FCM device token |
| GET | `/fcm-device/all-for-account` | List all FCM devices |
| PUT | `/fcm-device/update-locale` | Update device locale |

### WebPush Devices

| Method | Path | Notes |
|--------|------|-------|
| POST | `/webpush-device/create` | Create WebPush device |
| PUT | `/webpush-device/update` | Update WebPush device |
| DELETE | `/webpush-device/delete` | Delete WebPush device |
| GET | `/webpush-device/all-for-account` | List all WebPush devices |
| PUT | `/webpush-device/update-locale` | Update device locale |

### UP Devices

| Method | Path | Notes |
|--------|------|-------|
| POST | `/up-device/create` | Create UP device |
| PUT | `/up-device/update` | Update UP device |
| DELETE | `/up-device/delete` | Delete UP device |
| GET | `/up-device/for-account` | Get UP device for account |
| PUT | `/up-device/update-locale` | Update device locale |
| DELETE | `/up-device/delete-all` | Delete all UP devices |

## File

`apps/api/src/test/account-devices.test.ts`

## Test cases (per device type)

For each device type (FCM, WebPush, UP), test:

### Create

- **200/201 with valid data** — authenticated, mocks device service create, verifies response
- **401 without auth** — no auth header

### Update

- **200 with valid data** — authenticated, mocks device service update
- **401 without auth**

### Delete

- **200 with valid device** — authenticated, mocks device service delete
- **401 without auth**

### List (all-for-account / for-account)

- **200 with auth** — returns array of devices
- **401 without auth**

### Update locale

- **200 with valid locale** — authenticated, mocks update
- **401 without auth**

### Delete all (UP only)

- **200 with auth** — mocks delete all
- **401 without auth**

## Mocking strategy

- Mock `FCMDeviceService`, `WebPushDeviceService`, `UPDeviceService` from `@podverse/orm`
- Use shared helpers for auth and app startup

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/account-devices.test.ts
```
