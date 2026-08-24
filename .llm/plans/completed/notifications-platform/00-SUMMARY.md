# Notifications platform & scheduling

In-app notification feed (global unseen badge), expanded per-category preferences, generic
`scheduled_job` system, membership-expiry reminders (7 days), admin compose/schedule notifications,
and mobile nav rework (RSS → My Library; new Notifications tab).

## Locked decisions

| Topic | Decision |
| --- | --- |
| Storage | Per-user rows in `account_notification`; 1-month retention |
| Seen state | Single `notifications_last_seen_at` per account (global across devices) |
| Badge | Count where `created_at > notifications_last_seen_at` |
| Mark seen | Opening notifications page/tab sets `last_seen_at = now` |
| Scheduling | Generic `scheduled_job` table + worker CronJob (~5m poll) |
| Job retention | Purge terminal rows (`completed`, `cancelled`, `failed`) with `updated_at` older than 1 month; never delete `pending` / `running` |
| Purge cadence | Daily worker command deletes expired notifications + stale terminal jobs (same cron) |
| Push | In-app row always; push when category enabled + valid membership + `allow_notifications` |
| Categories | `new-content`, `livestream`, `membership-expiry`, `product-update`, `maintenance`, `terms-of-service`, `general` |
| Dual environments | Every ops surface (SQL, workers, cron) must work **locally** and in **K8s** — see matrix below |

## Local vs K8s (locked)

Same worker **command names** and SQL migration files in both environments. Cadence differs:

| Concern | Local (contributor) | K8s (alpha / deployed) |
| --- | --- | --- |
| Schema | Additive `NNNN_*.sql` under linear-migrations; apply with `bash scripts/database/run-linear-migrations.sh --database app` against `make local_db_up` / `local_setup` | Same SQL; ops migrate Job/CronJob + regenerated `0004_app_linear_baseline.sql.gz` for fresh PVC init; readiness marker `API_EXPECTED_MIGRATION_FILENAME` |
| Job runner | Manual / on-demand: `npm run scheduled_jobs_run_due -w apps/workers` (optional `-limit`, `-dry-run`) from **Workers** tab after `build:packages` + workers build | CronJob `worker-scheduled-jobs` `*/5 * * * *` → `scheduledJobsRunDue` in `infra/k8s/base/cron/` (alpha overlay pulls base via remote ref + workers image tag) |
| Retention purge | Manual: `npm run notifications_platform_purge -w apps/workers` | CronJob `worker-notifications-purge` `0 4 * * *` → `notificationsPlatformPurge` |
| Env | `apps/workers/.env` via `make local_env_setup` (Base + ORM categories) | ConfigMap `podverse-workers-config` + `podverse-db-opaque` (same pattern as billing renewals) |
| Docs | `apps/workers/APPS-WORKERS.md` + `ENV.md` command groups | `infra/k8s/K8S.md` / cron skill; GitOps tag bump picks up new base CronJobs |

Do **not** require a local Docker Cron loop for day-to-day; operators run worker CLI when exercising scheduling. Do **not** ship K8s manifests without matching npm scripts + contributor docs for local.

## Scope split

| # | File | Primary surfaces |
| --- | --- | --- |
| 01 | Foundation DB/domain | helpers, orm, linear SQL (local apply + K8s baseline) |
| 02 | Scheduling workers | workers commands, k8s cron |
| 03 | API + prefs | apps/api |
| 04 | Send integration | parser, notifications |
| 05 | Management admin | management-api, management-web |
| 06 | Web UI | apps/web, packages/ui |
| 07 | Mobile tabs + inbox | apps/mobile |
| 08 | Ops local + K8s | contributor docs, dual-env smoke checklist, GitOps notes |

## Prerequisites

- Existing push stack (`packages/notifications`, parser notification helpers) stays; this plan
  **adds** in-app rows and scheduling — does not replace FCM/WebPush/UP.
- Linear SQL changes in `infra/k8s/base/ops/source/database/linear-migrations/app/`; regen
  baselines via `make db_regen_linear_baseline` before merge.

## Related code today

- Push recipients: `packages/parser/src/lib/notifications/sharedNotificationHelpers.ts`
- Membership gate: `packages/helpers/src/lib/accountMembership.ts` (`hasValidMembership`)
- Billing cron precedent: `infra/k8s/base/cron/worker-billing-renewals.cronjob.yaml` +
  `npm run billing_process_due_renewals -w apps/workers`
- Mobile settings: `apps/mobile/src/screens/more/MoreSettingsScreen.tsx`
- Web settings: `apps/web/src/components/Settings/Panels/SettingsNotifications/`
