# Summary — pin admin session purge CronJob image

Issue: [podverse/podverse#377](https://github.com/podverse/podverse/issues/377).
Prompts: [COPY-PASTA.md](COPY-PASTA.md). Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## Why this set exists

On alpha, Job `management-api-admin-session-purge-29892165` has been Running since 2026-11-01
21:43 UTC. The pod booted the full Management API HTTP server and never exited. With
`concurrencyPolicy: Forbid`, every later daily run was skipped.

The purge exit branch in `apps/management-api/src/index.ts` and
`activeDeadlineSeconds: 3600` on the CronJob are already in tag `5.6.0-staging.6`. Alpha already
points the cron base at that ref. The remaining defect is that the cron overlay retags only
`ghcr.io/podverse/podverse/workers`, so the purge container still uses untagged
`ghcr.io/podverse/podverse/management-api` (`:latest`). A deadline on the CronJob template does
not apply to the Job that is already running; deleting that Job is an operator step after the
pin syncs.

## Requirement ledger

- **R1** (area A) "Deploy a current management-api image to alpha (and pin the CronJob image to a
  versioned tag or digest instead of an untagged image)." — Plan: 01
- **R2** (area A) "Delete the stuck Job `management-api-admin-session-purge-29892165` so the
  CronJob can schedule again." — Plan: 01 (operator step after sync; not agent-run `kubectl`)
- **R3** (area A) "Add `activeDeadlineSeconds` (for example 1800) and keep a small `backoffLimit`"
  — already on `5.6.0-staging.6` at 3600 / 0; Plan: 01 confirms no change
- **R4** (area A) Ticket reply for the people in the issue thread after the pin lands —
  Plan: 01 (`proposed-reply.md`)

## Areas

### Area A — Cron overlay image pin

- **Rows:** R1, R2, R3, R4
- **Plan number block:** 01–09
- **Starts from:** `infra/k8s/alpha/cron/kustomization.yaml`,
  `../k.podcastdj.com/apps/podverse-alpha/cron/kustomization.yaml`,
  `infra/k8s/scripts/check_cronjob_contract.sh`
- **Depends on:** no other area
- **Shared files with other areas:** none
