**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 01 — Every CronJob gets a deadline, a schedule label, and fails fast on bad config

## Rows

R5, R6, R7

## Runs after

none

## Problem

- A Job that never exits blocks a `concurrencyPolicy: Forbid` CronJob forever. On alpha,
  `management-api-admin-session-purge` was blocked for a week by one Running pod.
- Alert rules (plan 02) must tell CronJobs that are suspended on purpose in git (manual-only ops
  jobs) from scheduled jobs someone suspended by hand. kube-state-metrics exposes CronJob labels
  only through an allowlist, so the distinction must be a label.
- A Job pod that exits 78 (bad startup config, see the `feed-poller-catchup` set) should fail the
  Job at once, without retries, with a reason an alert can match. kube-state-metrics only reports
  exit codes of restarted containers, and these Job pods use `restartPolicy: Never`.
- Nothing stops a new CronJob from shipping without these.

## Decisions

1. **Label.** Add `metadata.labels.podverse-schedule` to every CronJob in `infra/k8s/base/cron/`
   and `infra/k8s/base/ops/`: `manual` when the base manifest sets `suspend: true`, else
   `scheduled`. Do **not** add or change `spec.suspend` anywhere.
2. **Deadline.** Add `spec.jobTemplate.spec.activeDeadlineSeconds` to every CronJob that lacks it.
   Keep existing values (`worker-recent-feeds` 600, the two `worker-stats-recommendations-refresh*`
   jobs). When a manifest comment documents a longer expected runtime, use the larger value and say
   so in the final message.

   | CronJob | Seconds |
   | --- | --- |
   | management-api-admin-session-purge | 3600 |
   | worker-account-content-log-purge | 3600 |
   | worker-account-session-purge | 3600 |
   | worker-archive-all | 10800 |
   | worker-billing-reconcile | 1500 |
   | worker-dead-feeds-merge | 3000 |
   | worker-delete-outdated | 7200 |
   | worker-generate-reports | 7200 |
   | worker-image-shrink-backfill | 14400 |
   | worker-image-shrink-orphan-cleanup | 14400 |
   | worker-image-shrink-source-prune | 14400 |
   | worker-image-shrink-reset-shrunken | 14400 |
   | worker-image-shrink-reset-shrunken-dry-run | 14400 |
   | worker-notifications-purge | 3600 |
   | worker-scheduled-jobs | 3600 |
   | worker-stats-event-partitions | 3600 |
   | worker-stats-popularity-refresh | 3000 |
   | worker-stats-popularity-refresh-full | 14400 |
   | worker-verified-publisher-links-backfill | 14400 |
   | ops: db-migrate-app, db-migrate-management, db-drop-everything, db-rebootstrap-roles, db-verify-* | 3600 |
   | ops: management-superuser-create/update, billing-setup, notifications-test-push | 900 |
   | ops: seed-embed-demo-showcase-feeds, mq-rss-add-trending-podcast-index-50/1000 | 3600 |

3. **Fail fast on exit 78.** For every CronJob whose job pod runs the workers or management-api
   image with `restartPolicy: Never`, add to `spec.jobTemplate.spec`:

   ```yaml
   podFailurePolicy:
     rules:
       - action: FailJob
         onExitCodes:
           containerName: <main container name>
           operator: In
           values: [78]
   ```

   Some manifests contain both `OnFailure` and `Never` (for example an init container or a second
   template). Read each one; `podFailurePolicy` requires the pod template's `restartPolicy: Never`.
   Skip and list any CronJob where that does not hold. Ops jobs that run `psql` or shell scripts do
   not emit 78; skip them.
4. **Contract check script** `infra/k8s/scripts/check_cronjob_contract.sh`, in the style of
   `check_argocd_app_contract.sh` (bash, `set -euo pipefail`, plain output, non-zero exit on
   failure). For every `kind: CronJob` under `infra/k8s/base/`, fail when:
   - `metadata.labels.podverse-schedule` is missing or not `scheduled`/`manual`;
   - `manual` does not match `spec.suspend: true`, or `scheduled` has `spec.suspend: true`;
   - `spec.jobTemplate.spec.activeDeadlineSeconds` is missing;
   - `spec.concurrencyPolicy` is missing.
   Use a YAML-aware tool already available in CI (`yq` if the runner has it; otherwise Python
   with PyYAML, or Node with the `yaml` package from the root lockfile). Check what
   `check_argocd_app_contract.sh` uses and match it.
5. **CI.** Add a step to `.github/workflows/ci.yml` next to the other bash checks that run before
   Node setup (for example after "Enforce no runtime CREATE EXTENSION"):
   `bash infra/k8s/scripts/check_cronjob_contract.sh`. If the script needs Node, place it after
   "Install dependencies" instead.
6. Comments in touched manifests follow **comments-future-forward**.
7. Put a short paragraph for `infra/k8s/INFRA-K8S.md` (label contract, deadline rule, exit-78
   policy, the check script) in your final message under "Docs for 06". Do not edit docs here.

## Files

- `infra/k8s/base/cron/*.cronjob.yaml`
- `infra/k8s/base/ops/*.cronjob.yaml`
- `infra/k8s/scripts/check_cronjob_contract.sh` (new)
- `infra/k8s/scripts/INFRA-K8S-SCRIPTS.md` (one line for the new script)
- `.github/workflows/ci.yml`

## Tests

- The script is the test. Its final message lists
  `bash infra/k8s/scripts/check_cronjob_contract.sh` and
  `kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/cron` (and `…/base/ops`)
  for the closing verification block.

## Release scratchpad

Surfaces: k8s, ops. Every CronJob has `activeDeadlineSeconds`, so a hung run is stopped instead of
blocking later runs, and a `podverse-schedule: scheduled | manual` label for alert rules. Worker
and management-api CronJobs fail immediately, without retries, when the container exits 78
(startup config missing). CI rejects a CronJob without the label, deadline, or concurrency policy.
Operators: delete any Job that has been Running for days before syncing.
