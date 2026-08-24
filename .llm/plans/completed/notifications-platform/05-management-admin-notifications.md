# 05 — Management admin notifications

**Cursor model:** Codex 5.3
**Reasoning:** medium
**Ship bar:** Admin compose/send/schedule notifications; list campaigns; permissions; management-web
CRUD pages; integration + E2E.

## Goal

Allow operators to compose notifications (title, body, link, category), choose audience, send
immediately or schedule for future, and list sent/scheduled campaigns.

## Context (read first)

- Admin CRUD pattern: `apps/management-api/src/routes/admins.ts`,
  `apps/management-web/src/app/(management)/admins/`
- Authz: `requireCrud`, `PermissionResource` in `apps/management-api/src/lib/crud.ts`
- Request client: `packages/management-api-requests/src/admins.ts`
- Phase 02: `scheduled_job` type `admin-notification-send`
- Phase 03: bulk `createAccountNotificationWithOptionalPush`
- Skills: **management-api**, **e2e-page-tests**, **swagger-openapi**, **crud-tables-resources**

## Data model extension (optional)

If campaign metadata needed beyond `scheduled_job.payload`, add `admin_notification_campaign`:

| Column | Notes |
| --- | --- |
| `id`, `id_text` | |
| `title`, `body`, `link_path`, `category` | |
| `audience` | jsonb: `{ type: 'all' }` or `{ type: 'membership', tiers: ['premium'] }` v1 |
| `send_push` | boolean (admin chooses for maintenance/tos/general) |
| `scheduled_at` | nullable |
| `status` | draft, scheduled, sending, sent, cancelled |
| `created_by_admin_id` | |
| `created_at` | |

Alternatively store everything in `scheduled_job.payload` for v1 — prefer **campaign table** for
management list UI.

## Management API routes

Prefix `/api/v1/admin/notifications` (or `/notification-campaigns`):

| Method | Path | Authz |
| --- | --- | --- |
| GET | `/` | `notifications` read — paginated list |
| GET | `/:id_text` | read |
| POST | `/` | create — body: title, body, link_path, category, audience, send_push, send_at (null = now) |
| POST | `/:id_text/cancel` | cancel scheduled |
| DELETE | `/:id_text` | delete draft only |

**POST create flow:**

- `send_at` null or ≤ now → resolve audience account IDs → bulk in-app + optional push → mark sent.
- `send_at` future → create `scheduled_job` + campaign row `status=scheduled`, payload =
  `{ campaignId }`.

**Handler** (complete 02 stub): load campaign, resolve audience at **send time** (not schedule time
for "all users" — fresh list), bulk create rows, push if `send_push`.

### Audience v1

- `all` — all accounts with valid membership (or all accounts — **locked: valid membership only**
  to match content notifications volume control).
- Future: segment by tier, locale.

Add `notifications` to `PermissionResource` enum + seed super-admin permissions.

## Management-web pages

Under `apps/management-web/src/app/(management)/notifications/`:

| Route | UI |
| --- | --- |
| `/notifications` | `ResourceTableWithFilter` — status, category, scheduled_at, sent_at |
| `/notifications/new` | Form: title, body, link, category dropdown, audience (all), send_push checkbox, send now vs datetime picker |
| `/notifications/[id]` | Detail + cancel button if scheduled |

Follow `AdminsListPageClient` / `NewAdminPageClient` patterns.

## Request client

`packages/management-api-requests/src/notificationCampaigns.ts` — list, get, create, cancel, delete.

## Integration tests

`apps/management-api/src/routes/notificationCampaigns.integration.test.ts`:

- Super-admin creates immediate send → app DB has rows for test users.
- Scheduled → `scheduled_job` pending with correct `run_after`.
- Cancel → job `cancelled`.

## E2E

`apps/management-web/e2e/admin-notifications.spec.ts` — create draft/scheduled, screenshot report.

## Tasks

1. SQL + entity for campaign (if used).
2. Management-api routes, schemas, services.
3. Complete `admin-notification-send` job handler.
4. management-api-requests + permissions + nav route.
5. management-web pages.
6. OpenAPI update.
7. Integration + E2E spec.

## Out of scope

- Audience segmentation beyond all/valid-membership.
- Email notifications.
- Mobile/web consumer inbox (06/07).

## Dual environments (scheduled sends)

- **Local:** After “Schedule”, due work does **not** auto-fire. Operator runs
  `npm run scheduled_jobs_run_due -w apps/workers` (**Workers** tab) so
  `admin-notification-send` jobs execute. Document this in UI help or ops note (phase 08).
- **K8s:** CronJob `worker-scheduled-jobs` (`*/5`) claims due jobs — same command as local CLI.

## Acceptance

- Operator can schedule maintenance notice for +1 hour; job fires and creates rows (local: after
  manual `scheduledJobsRunDue`; K8s: within ~5m of Cron).
- Permission denied for read-only admin role.

## Verification (operator)

```bash
npm run build:packages
make test_deps
npm run test:e2e:api
make e2e_test_management_web_report_spec SPEC=e2e/admin-notifications.spec.ts
```

Optional local schedule smoke (**Workers**):

```bash
npm run scheduled_jobs_run_due -w apps/workers
```
