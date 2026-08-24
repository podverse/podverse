# 01 — Foundation DB & domain

**Cursor model:** Codex 5.3
**Reasoning:** high
**Ship bar:** New tables + entities + services + DTOs + linear SQL + unit tests. No API routes, no UI.

## Goal

Add the persistence and shared types for in-app notifications, expanded per-category preferences,
global seen timestamp, scheduled jobs, and 1-month retention cleanup.

## Context (read first)

- Linear SQL (authoritative): `infra/k8s/base/ops/source/database/linear-migrations/app/0001_app_schema.sql`
- Skill: **linear-sql-greenfield-only** — edit forward SQL only; run `make db_regen_linear_baseline`
- Existing push subscription types (unchanged for now): `AccountNotificationTypeEnum` in
  `packages/helpers/src/lib/accountNotificationType.ts` (`new-item`, `livestream-*`)
- Membership: `account_membership_status`, `hasValidMembership` in
  `packages/helpers/src/lib/accountMembership.ts`
- ORM patterns: `packages/orm/src/entities/account/accountSettings/accountSettingsNotificationType.ts`
- Skills: **orm**, **database-schema-naming**, **unit-test-new-code-gate**

## Schema additions

### Enum `notification_category`

Values (varchar check or PG enum — match repo convention):

- `new-content`
- `livestream`
- `membership-expiry`
- `product-update`
- `maintenance`
- `terms-of-service`
- `general`

Export as `NotificationCategory` type + const array in `@podverse/helpers`.

### Table `account_notification`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial PK | |
| `account_id` | int FK → account | indexed |
| `category` | notification_category | |
| `title` | varchar | user-facing |
| `body` | text nullable | |
| `link_path` | varchar nullable | in-app deep link (e.g. `/membership/renew`) |
| `payload` | jsonb nullable | structured extras (channel id, item id, admin campaign id) |
| `created_at` | timestamptz | default now |
| `expires_at` | timestamptz | default `created_at + 1 month` for retention |

Indexes: `(account_id, created_at DESC)`, `(expires_at)` for cleanup cron.

No per-row `seen` flag — seen is account-level.

### Column on `account` (or `account_settings`)

`notifications_last_seen_at` timestamptz nullable on `account` (preferred for simple API) or
`account_settings`. Document choice in entity.

### Table `account_notification_preference`

Per-account, per-category delivery prefs (replaces boolean-only global toggles over time):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial PK | |
| `account_id` | int FK | |
| `category` | notification_category | |
| `in_app_enabled` | boolean | default true (except product-update: default true, user can disable) |
| `push_enabled` | boolean | default per category rules below |

Unique `(account_id, category)`.

**Defaults at account creation** (mirror locked delivery matrix):

| Category | in_app default | push default |
| --- | --- | --- |
| new-content | true | true (if legacy global types enabled — migration maps `new-item` → here) |
| livestream | true | true (maps livestream-scheduled/started) |
| membership-expiry | true | true |
| product-update | true | true (opt-in; user can disable both) |
| maintenance | true | false |
| terms-of-service | true | false |
| general | true | false |

Seed rows on account signup alongside existing `account_settings_notification_type` rows (keep
legacy table for backward compat during transition; document deprecation path in comments).

### Table `scheduled_job`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial PK | |
| `job_type` | varchar | e.g. `membership-expiry-reminder`, `admin-notification-send` |
| `dedupe_key` | varchar unique | e.g. `membership-expiry:account:{id}` |
| `run_after` | timestamptz | execute when `now >= run_after` |
| `status` | varchar | `pending`, `running`, `completed`, `cancelled`, `failed` |
| `attempts` | int | default 0 |
| `max_attempts` | int | default 5 |
| `locked_at` | timestamptz nullable | claim lease |
| `locked_by` | varchar nullable | worker instance id |
| `payload` | jsonb | job-specific |
| `last_error` | text nullable | |
| `created_at` / `updated_at` | timestamptz | |

Indexes: `(status, run_after)` where status = pending; unique on `dedupe_key`. Optional partial index
on `(updated_at)` where status in (`completed`, `cancelled`, `failed`) if purge queries need it at
scale — not required for v1.

## ORM & services

1. **Entities** under `packages/orm/src/entities/account/` (or `notification/` subfolder):
   `AccountNotification`, `AccountNotificationPreference`, `ScheduledJob`.
2. **Services** (static methods pattern):
   - `AccountNotificationService` — `createMany`, `listPaginatedForAccount`, `countUnseen`,
     `deleteExpiredBefore`
   - `AccountNotificationPreferenceService` — `getForAccount`, `upsert`, `seedDefaultsForAccount`
   - `ScheduledJobService` — `upsertByDedupeKey`, `cancelByDedupeKey`, `claimDueBatch`,
     `markCompleted`, `markFailed`, `requeueWithBackoff`, `deleteTerminalBefore`
3. **DTOs** in `packages/helpers/src/dtos/account/` for API responses (list item, preference row).
4. Export new types from `@podverse/helpers` and `@podverse/orm` per tier rules.

## Retention

**Notifications:** `AccountNotificationService.deleteExpiredBefore(cutoff)` — delete rows where
`expires_at < cutoff` (or `created_at < now - 1 month`). Called from worker cron in phase 02.

**Scheduled jobs (terminal history):** `ScheduledJobService.deleteTerminalBefore(cutoff)` — hard-delete
rows where `status` in (`completed`, `cancelled`, `failed`) and `updated_at < cutoff`. Never delete
`pending` or `running`. Use the same 1-month cutoff as notifications. Cancel/replace via dedupe key
handles obsolete *pending* work; this purge prevents unbounded growth of finished job rows.

If phase 01 already shipped without `deleteTerminalBefore`, implement the method in phase 02 alongside
the purge worker.

## Unit tests

- `packages/orm` or `packages/helpers`: preference defaults, unseen count query logic (mock or test DB
  if orm tests exist), dedupe upsert on `ScheduledJobService`, `deleteTerminalBefore` skips
  `pending`/`running`.
- Pagination helper: given `last_seen_at`, classify rows as new vs earlier (pure function in helpers).

## Tasks

1. Add SQL enum/tables/columns to linear migration `0001_app_schema.sql`.
2. Run `make db_regen_linear_baseline` (operator step — document in plan completion note).
3. Add entities, services, DTOs, exports.
4. Seed `account_notification_preference` on account create in `AccountService` (alongside playback
   settings).
5. Add unit tests for services and unseen-count helper.
6. Mark COPY-PASTA step 01 done when complete.

## Out of scope

- API routes, workers, parser changes, UI.
- Dropping `account_settings_notification_type` (keep; map in phase 03/04).
- Management DB (app DB only).

## Acceptance

- Migrations apply cleanly; entities match SQL.
- Can create notification rows and preferences via service in isolation tests.
- `notifications_last_seen_at` column exists on account (or documented alternate).
- `scheduled_job` supports upsert-by-dedupe-key and cancel.
- All new plan files' types compile after `npm run build:packages`.

## Verification (operator)

```bash
npm run build:packages
npm run test -w packages/helpers
npm run test -w packages/orm
```
