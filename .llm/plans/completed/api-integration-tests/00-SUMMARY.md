# API Integration Tests — Full Coverage Plan

## Overview

Add thorough, confident-level integration tests for every route in `apps/api` (~155 endpoints across 25 route files) and `apps/management-api` (5 endpoints across 2 route files). Tests use **mocked ORM services** (fast, focused on HTTP routing/auth/validation/error handling) except for auth flows where real DB interactions provide higher confidence.

## Current State

- **apps/api**: Broad integration coverage per plan (auth, account, devices, follows, settings, clip, playlist, queue, read routes, external/meta, PayPal, profile, stats, env smoke). See `apps/api/src/test/*.test.ts`.
- **apps/management-api**: `auth.integration.test.ts` and expanded `adminAccount.integration.test.ts`.

## Strategy

- **Mock ORM services** via `vi.mock('@podverse/orm')` with `vi.hoisted()` (matches existing pattern in `stats.track.test.ts`)
- **Real Express app** via `supertest` against the imported `app` + `startApp()`
- **Auth via JWT** using `jsonwebtoken.sign()` with the test secret from `setup.ts`
- **Priority order**: Auth/security first, then write operations, then read operations
- **Shared test utilities** extracted to `apps/api/src/test/helpers/` to reduce duplication across 10+ test files

## Execution Order

1. `01-test-helpers-and-shared-utilities.md` — shared auth helpers, mock factories, test bootstrap
2. `02-auth-routes.md` — login, logout, me, check-session
3. `03-account-crud-and-email.md` — create, update, delete, email verification, password reset
4. `04-account-devices.md` — FCM, WebPush, UP device CRUD
5. `05-account-follows-notifications.md` — follow/unfollow account, channel, playlist, notification channels
6. `06-account-settings.md` — locale, notification type settings
7. `07-clip-crud.md` — create, update, delete, ownership, public/private lists
8. `08-playlist-crud.md` — create, update, delete, ownership, resources, items/clips/soundbites
9. `09-queue-crud.md` — now-playing, next, last, between, history, remove, active queue
10. `10-category-channel-item-read.md` — category, channel, item, liveItem, podroll, publisherFeed (read-only routes)
11. `11-external-services-and-meta.md` — externalServices, feed, medium, membership, membershipClaimToken, stats, metaboost, mq
12. `12-paypal.md` — PayPal order creation, webhook
13. `13-profile-content.md` — profile and my-profile routes
14. `14-management-api-auth-and-admin.md` — management-api login, logout, me, admin-account
15. `15-verification-and-archive.md` — full suite run, lint, archive

## File naming convention

All test files go in `apps/api/src/test/` (api) or `apps/management-api/src/routes/` (management-api).

| Route group | Test file |
|---|---|
| auth | `auth.test.ts` |
| account CRUD | `account.test.ts` |
| account devices | `account-devices.test.ts` |
| account follows/notifications | `account-follows-notifications.test.ts` |
| account settings | `account-settings.test.ts` |
| clips | `clip.test.ts` |
| playlists | `playlist.test.ts` |
| queues | `queue.test.ts` |
| category/channel/item | `category-channel-item-read.test.ts` |
| external/meta | `external-services-and-meta.test.ts` |
| paypal | `paypal.test.ts` |
| profile content | `profile-content.test.ts` |
| management-api auth | `adminAccount.integration.test.ts` (expand existing) + `auth.integration.test.ts` (new) |

## Verification

```bash
./scripts/nix/with-env npm run test:e2e:api
./scripts/nix/with-env npm run lint
```
