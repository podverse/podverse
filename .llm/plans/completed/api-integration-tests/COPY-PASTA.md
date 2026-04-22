# COPY-PASTA

**Status:** Completed. Plan markdown and prompts live under `.llm/plans/completed/api-integration-tests/`.

Use these prompts to implement each plan. Plan 01 (shared helpers) must be completed first. After that, plans within each phase are independent and can run in parallel.

## Phase 0 (must be first)

### Plan 01 - Shared Test Helpers and Utilities

```
Implement the plan in .llm/plans/completed/api-integration-tests/01-test-helpers-and-shared-utilities.md
Ensure apps/api/src/test/helpers/ exports: startTestApp, stopTestApp, authHeaders, adminAuthHeaders, createMockFn, getBaseApiUrl, defaultAccountGet / createDefaultAccountGet, IntegrationTestNoopCategoryService, plus mockAccount.ts and mockOrm.ts.
Follow the patterns in apps/api/src/test/stats.track.test.ts.
Refactor stats.track.test.ts to use the new helpers to validate they work.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/stats.track.test.ts
```

## Phase 1 (any order, after Plan 01)

### Plan 02 - Auth Routes

```
Implement the plan in .llm/plans/completed/api-integration-tests/02-auth-routes.md
Create apps/api/src/test/auth.test.ts with integration tests for POST /auth/login, POST /auth/logout, GET /auth/me, GET /auth/check-session.
Follow the patterns in apps/api/src/test/helpers/ and apps/api/src/test/stats.track.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/auth.test.ts
```

### Plan 03 - Account CRUD and Email Flows

```
Implement the plan in .llm/plans/completed/api-integration-tests/03-account-crud-and-email.md
Create apps/api/src/test/account.test.ts with integration tests for account create, update, delete, email verification, password reset, download-data, and get-by-id-text.
Follow the patterns in apps/api/src/test/helpers/ and apps/api/src/test/stats.track.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/account.test.ts
```

### Plan 06 - Account Settings

```
Implement the plan in .llm/plans/completed/api-integration-tests/06-account-settings.md
Create apps/api/src/test/account-settings.test.ts with integration tests for PATCH /locale, POST /notification-type, DELETE /notification-type.
Follow the patterns in apps/api/src/test/helpers/ and apps/api/src/test/stats.track.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/account-settings.test.ts
```

### Plan 14 - Management API Auth and Admin Account

```
Implement the plan in .llm/plans/completed/api-integration-tests/14-management-api-auth-and-admin.md
Create apps/management-api/src/routes/auth.integration.test.ts with tests for POST /auth/login, POST /auth/logout, GET /auth/me.
Expand apps/management-api/src/routes/adminAccount.integration.test.ts with 401 and 404 cases.
Follow the patterns in apps/management-api/src/routes/adminAccount.integration.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/management-api
```

## Phase 2 (any order, after Phase 1)

### Plan 04 - Account Devices

```
Implement the plan in .llm/plans/completed/api-integration-tests/04-account-devices.md
Create apps/api/src/test/account-devices.test.ts with integration tests for FCM, WebPush, and UP device CRUD (create, update, delete, list, update-locale, delete-all).
Follow the patterns in apps/api/src/test/helpers/ and apps/api/src/test/stats.track.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/account-devices.test.ts
```

### Plan 05 - Account Follows and Notifications

```
Implement the plan in .llm/plans/completed/api-integration-tests/05-account-follows-notifications.md
Create apps/api/src/test/account-follows-notifications.test.ts with integration tests for follow/unfollow (account, channel, playlist, add-by-rss), notification channels, add-by-rss parse, and account browse endpoints.
Follow the patterns in apps/api/src/test/helpers/ and apps/api/src/test/stats.track.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/account-follows-notifications.test.ts
```

### Plan 07 - Clip CRUD

```
Implement the plan in .llm/plans/completed/api-integration-tests/07-clip-crud.md
Create apps/api/src/test/clip.test.ts with integration tests for clip create, update, delete, ownership verification, private list, and public list endpoints.
Follow the patterns in apps/api/src/test/helpers/ and apps/api/src/test/stats.track.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/clip.test.ts
```

### Plan 08 - Playlist CRUD

```
Implement the plan in .llm/plans/completed/api-integration-tests/08-playlist-crud.md
Create apps/api/src/test/playlist.test.ts with integration tests for playlist CRUD, ownership, resources, and add/remove operations for clips, items, add-by-rss items, and soundbites.
Follow the patterns in apps/api/src/test/helpers/ and apps/api/src/test/stats.track.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/playlist.test.ts
```

### Plan 09 - Queue CRUD

```
Implement the plan in .llm/plans/completed/api-integration-tests/09-queue-crud.md
Create apps/api/src/test/queue.test.ts with integration tests for queue read endpoints, update-is-active, and add/remove operations for clips, items, add-by-rss items, and soundbites (now-playing, next, last, between, history).
Follow the patterns in apps/api/src/test/helpers/ and apps/api/src/test/stats.track.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/queue.test.ts
```

## Phase 3 (any order, after Phase 2)

### Plan 10 - Category, Channel, Item, LiveItem Read Routes

```
Implement the plan in .llm/plans/completed/api-integration-tests/10-category-channel-item-read.md
Create apps/api/src/test/category-channel-item-read.test.ts with integration tests for category, channel, item, itemChapter, itemSoundbite, itemTranscript, liveItem, podroll, and publisherFeed GET endpoints.
Follow the patterns in apps/api/src/test/helpers/ and apps/api/src/test/stats.track.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/category-channel-item-read.test.ts
```

### Plan 11 - External Services and Meta Routes

```
Implement the plan in .llm/plans/completed/api-integration-tests/11-external-services-and-meta.md
Create apps/api/src/test/external-services-and-meta.test.ts with integration tests for PodcastIndex search/feed, feed, medium-value, membership pricing, membership claim token, metaboost mint, and MQ endpoints.
Follow the patterns in apps/api/src/test/helpers/ and apps/api/src/test/stats.track.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/external-services-and-meta.test.ts
```

### Plan 12 - PayPal Routes

```
Implement the plan in .llm/plans/completed/api-integration-tests/12-paypal.md
Create apps/api/src/test/paypal.test.ts with integration tests for PayPal order create, order get, and webhook payment-completed.
Follow the patterns in apps/api/src/test/helpers/ and apps/api/src/test/stats.track.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/paypal.test.ts
```

### Plan 13 - Profile Content Routes

```
Implement the plan in .llm/plans/completed/api-integration-tests/13-profile-content.md
Create apps/api/src/test/profile-content.test.ts with integration tests for public profile (/:account_id_text/podcasts|albums|playlists|clips) and authenticated my-profile routes.
Follow the patterns in apps/api/src/test/helpers/ and apps/api/src/test/stats.track.test.ts.
Run: ./scripts/nix/with-env npm run test -w apps/api -- src/test/profile-content.test.ts
```

## Final

### Plan 15 - Verification and Archive

```
Implement the plan in .llm/plans/completed/api-integration-tests/15-verification-and-archive.md
Run the full API test suite and lint to verify all tests pass together.
Run: ./scripts/nix/with-env npm run test:e2e:api
Run: ./scripts/nix/with-env npm run lint
(When first completing the set, move .llm/plans/active/api-integration-tests/ to .llm/plans/completed/api-integration-tests/ — this copy already lives under completed/.)
```
