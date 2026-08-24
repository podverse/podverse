# 08 — Ops: local + K8s dual environments

**Cursor model:** Codex 5.3
**Reasoning:** medium
**Ship bar:** Contributor docs + smoke checklist so schema apply, scheduling, and purge work the same
way locally and in deployed K8s. **Do not revise completed plans 01–02** — remaining dual-env work
lives only in this plan (plus locked matrix in `00-SUMMARY.md`).

## Goal

Make the dual-env matrix in [`00-SUMMARY.md`](./00-SUMMARY.md) **actionable**: every operator and
contributor can apply schema, run due jobs, and purge retention both on a laptop and in-cluster —
without inventing a second local Cron stack or duplicating K8s-only code paths.

## Context (read first)

- Locked matrix: [`00-SUMMARY.md`](./00-SUMMARY.md) § Local vs K8s
- Phases 01–02 already implemented (SQL, worker commands, base CronJobs) — treat as done
- Precedents: billing renewals (`billingProcessDueRenewals` + `worker-billing-renewals.cronjob.yaml`)
- Skills: **workers**, **k8s**, **documentation-conventions**, **vscode-terminals-commands**
- Linear apply: `docs/operations/database/LINEAR-MIGRATIONS.md`,
  `docs/operations/database/DB-MIGRATIONS.md`

## Schema (local vs K8s)

| Step | Local | K8s |
| --- | --- | --- |
| Author SQL | Additive `NNNN_*.sql` (e.g. `0003_notifications_foundation.sql`) | Same file in repo |
| Existing DB | `bash scripts/database/run-linear-migrations.sh --database app` (`local_db_up` + migrator creds / `infra/config/local/db.env`) | Ops migrate Job/CronJob after image/tag with new SQL |
| Fresh DB | `make local_db_init` / bootstrap loads regenerated baseline | PVC init: `0003_apply_linear_baselines.sh` + `0004_app_linear_baseline.sql.gz` |
| Baseline | `make db_regen_linear_baseline` + `make db_verify_linear_baseline`; commit `0004` | Same artifacts under `infra/k8s/base/db/source/bootstrap/` |
| Readiness | Schema present for local API | `API_EXPECTED_MIGRATION_FILENAME` + ops kustomization bundle (already set in 01) |

## Workers (local vs K8s)

Same command names; different invocation:

### Local (on-demand CLI)

Prerequisites: `make local_env_setup`, DB migrated, `npm run build:packages`,
`npm run build -w apps/workers`. Use **Workers** tab.

```bash
npm run scheduled_jobs_run_due -w apps/workers -- -dry-run
npm run scheduled_jobs_run_due -w apps/workers -- -limit 50
npm run notifications_platform_purge -w apps/workers
```

No local always-on Cron required.

### K8s (CronJobs)

Already added in phase 02 (verify; do not re-author unless missing):

- `worker-scheduled-jobs` → `scheduledJobsRunDue` (`*/5 * * * *`)
- `worker-notifications-purge` → `notificationsPlatformPurge` (`0 4 * * *`)
- Listed in `infra/k8s/base/cron/kustomization.yaml`
- Alpha / GitOps overlays that remote-ref `infra/k8s/base/cron` pick them up on the next publish tag

## Tasks

### 1. Local contributor docs

1. Update `apps/workers/APPS-WORKERS.md` Available Commands table with both scripts + flags.
2. Confirm `ENV.md` Base + ORM group lists both commands.
3. Short “Notifications platform scheduling” note: local = CLI; K8s = CronJobs; prerequisites.
4. Label verify commands with **Workers** / **Root** tabs.

### 2. Local smoke checklist (document)

```bash
npm run build:packages
npm run build -w apps/workers
bash scripts/database/run-linear-migrations.sh --database app
npm run scheduled_jobs_run_due -w apps/workers -- -dry-run
npm run notifications_platform_purge -w apps/workers
```

Optional: seed a due `scheduled_job`, run without `-dry-run`, confirm `completed` / notification row.

### 3. K8s / GitOps checklist (document)

1. Confirm CronJob manifests + kustomization membership.
2. Confirm overlays need only image/`?ref=` bump (no duplicate CronJob YAML).
3. After publish/sync: CronJobs in Argo cron app; first Job succeeds.
4. Existing clusters: migrate Job applies `0003`; fresh PVC uses regenerated `0004`.

### 4. Cross-feature notes

- **03 / 06 / 07:** local API/UI with schema applied; no Cron needed for feed/prefs.
- **05 admin schedule:** Local — run `scheduled_jobs_run_due` after Schedule. K8s — 5m Cron picks up
  jobs. Document in management help or ops note (also noted in plan 05).

## Out of scope

- Revising completed plan files 01–02.
- Local systemd/launchd/Docker Cron for workers.
- Changing Cron schedules without product reason.
- Operator publish / remote GitOps tag bumps.

## Acceptance

- APPS-WORKERS lists both commands with monorepo-root examples.
- SUMMARY dual-env matrix matches docs.
- One documented local smoke path and one K8s verify path.
- Admin schedule local-vs-Cron behavior is documented.

## Verification (operator)

**Workers:**

```bash
npm run build -w apps/workers
npm run scheduled_jobs_run_due -w apps/workers -- -dry-run
npm run notifications_platform_purge -w apps/workers
```

**Root** (after deploy tag sync; adjust namespace):

```bash
kubectl get cronjobs -n podverse-alpha | grep -E 'scheduled-jobs|notifications-purge'
```
