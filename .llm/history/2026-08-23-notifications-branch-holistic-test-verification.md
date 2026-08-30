# Holistic test verification — notifications platform branch (2026-08-23)

Holistic "run every test" pass after completing plans 01–08 (notifications platform). This
records what was run, the failures found + fixed, and the two E2E tiers that could not be
executed in this environment (with recommended operator follow-ups).

## Result summary

All automated code-level test tiers pass after the fixes below:

- `npm run build:packages` — pass
- `npm run lint` (type-check + eslint + prettier, all workspaces incl. Next apps) — pass
- `npm run test:unit` (all packages + apps/web + apps/workers + apps/management-web + extensions) — pass
- `make test_deps` (migrations apply cleanly) — pass
- `npm run test:e2e:api` (apps/api 417 + apps/management-api 241) — pass
- Mobile (standalone install): `npm --prefix apps/mobile run test` (123), `type-check`, `npm run mobile:lint` — pass
- `npm run openapi:check` — pass (2 pre-existing non-error warnings only)

## Failures found and fixed

1. **App DB migration used a non-existent domain type** (real schema bug)
   - `infra/k8s/base/ops/source/database/linear-migrations/app/0004_admin_notification_campaign.sql`
   - `id_text public.varchar_id` → the `varchar_id` domain does not exist. All other `id_text`
     columns use `public.nano_id_v2` (matches the entity's `NANO_ID_V2_MAX_LENGTH`).
   - Fixed to `id_text public.nano_id_v2 NOT NULL`. `make test_deps` now applies 0004 cleanly.
   - NOTE for operator: the generated linear baseline archives may need regeneration:
     `make db_regen_linear_baseline` then commit the updated `.gz` files.

2. **apps/workers unit test — stale `@podverse/orm` mock**
   - `apps/workers/src/commands/orm/scheduledJob/runDue.test.ts`
   - `runDue.ts` now imports `ADMIN_NOTIFICATION_SEND_JOB_TYPE`, `AdminNotificationCampaignService`,
     `createAccountNotificationWithOptionalPush`, `dispatchAdminNotificationCampaign`,
     `parseAdminNotificationSendPayload` and no longer uses `AccountNotificationService.createMany`.
   - Updated the mock to export those symbols and assert on
     `createAccountNotificationWithOptionalPush` instead of `createMany`.

3. **apps/api test env pollution** (order-dependent flake)
   - `apps/api/src/test/opml-import.test.ts` deleted `PODVERSE_E2E_FIXTURES` in `afterAll` instead
     of restoring the base-env value (`'1'`). When `health-ready.test.ts` ran later in the same
     worker, its server (rebuilt via `vi.resetModules`) read `fixturesEnabled: false`, mismatching.
   - Fixed to save/restore the previous value (same pattern as `e2e-unparsed-search-fixture.test.ts`).

4. **apps/api unseen-count test mock**
   - `apps/api/src/test/account-notifications.test.ts`
   - `ensureAuthenticated` fetches the account once, then the controller fetches it again. The test
     only queued one `mockResolvedValueOnce` (consumed by auth), so the controller read the default
     mock (`notifications_last_seen_at: null`) → count 25 instead of 4.
   - Fixed by queuing the account for both `.get` calls.

5. **apps/management-api scheduled-campaign test — time-based flake**
   - `apps/management-api/src/routes/notificationCampaigns.integration.test.ts`
   - Hardcoded `send_at: '2026-08-24T00:00:00.000Z'` is now in the past vs the real wall clock, so
     the route treated the campaign as immediate and 500'd on an unstubbed `markSent` mock.
   - Fixed to compute `send_at` dynamically (`Date.now() + 24h`) so it never rots.

## E2E tiers NOT run here (operator follow-up)

### Web / management-web Playwright E2E — previously blocked by a seed dependency gap

`make e2e_test_report_scoped WEB_SPEC=... MGMT_SPEC=...` fails at the seed step:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'ioredis' imported from
/Users/.../podverse/tools/web/seed-e2e.mjs
```

- Root cause: `tools/web/seed-e2e.mjs` imports `ioredis`, but `tools/web` is **not** an npm
  workspace (no `package.json`) and `ioredis` is only installed nested under
  `apps/api/node_modules` / `apps/workers/node_modules` — it is **not hoisted** to the root
  `node_modules`, so `node tools/web/seed-e2e.mjs` (run from repo root) cannot resolve it.
- `npm install` reports "up to date" (lockfile keeps `ioredis` nested), so it does not self-heal.
- This is **independent of the notifications work**: the `ioredis` import was added in an older
  commit (`b780b76b`, OPML work), not on the notifications branch.
- Resolution: `tools/web/package.json` declares the seeder's direct dependencies (`bcrypt`, `ioredis`,
  and `pg`), and the Linux-canonical root lockfile records the new workspace. The seeder no longer
  depends on application dependency hoisting.

After fixing, run (E2E test deps already provided by `make test_deps`):

```bash
make e2e_test_report_scoped WEB_SPEC=e2e/notifications-inbox.spec.ts MGMT_SPEC=e2e/admin-notifications.spec.ts
```

Other notification-related web spec: `apps/web/e2e/bucket-notifications-webpush-bucket-owner.spec.ts`.

### Mobile Maestro E2E — requires simulators + leave-running services (not automatable in this sandbox)

`apps/mobile/e2e/notifications-inbox.yaml` (and the updated `add-by-rss.yaml`) need a booted
iOS/Android simulator plus Metro and the E2E API. Run with the named terminal tabs
(see `apps/mobile/e2e/HOW-TO-RUN.md` and vscode-terminals-commands):

- Mobile Metro: `npm run mobile:dev:e2e`
- Mobile E2E API: `npm run mobile:e2e:api`
- Mobile iOS / Mobile Android: `npm run mobile:e2e:ios` / `npm run mobile:e2e:android`
- Mobile Maestro:

```bash
npm run mobile:e2e:test -- notifications-inbox
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
