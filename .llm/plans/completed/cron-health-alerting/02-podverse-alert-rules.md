**Cursor model:** Codex 5.3 · **Reasoning:** high

# 02 — Prometheus alert rules in the Podverse base

## Rows

R3, R5, R6, R7

## Runs after

01 (rules join on `podverse-schedule` and match the `podFailurePolicy` failure reason)

## Goal

Ship Prometheus rules with the Podverse k8s base so any cluster running Podverse can load them by
remote Kustomize URL. Delivery (Alertmanager, ntfy) is in the example folder (plans 03–05, 07).

## Decisions

1. **Format:** plain Prometheus rules (`groups:`), not a prometheus-operator `PrometheusRule`. The
   reference cluster runs plain Prometheus configured by ConfigMap.
2. **Layout:** `infra/k8s/base/monitoring/kustomization.yaml` with a `configMapGenerator` named
   `podverse-prometheus-rules` (`disableNameSuffixHash: true`) holding two files. No namespace in
   the base; the consumer sets it.
   - `podverse.rules.yaml` — alerts that depend on Podverse contracts (the `podverse-schedule`
     label, the poller's name, exit code 78).
   - `workloads.rules.yaml` — generic Kubernetes workload alerts for any namespace, so a cluster
     that also runs Metaboost gets the same coverage there. Alert names have no `Podverse` prefix.
3. **Metrics source:** kube-state-metrics v2 with
   `--metric-labels-allowlist=cronjobs=[podverse-schedule]` (plan 03's example). Confirm every
   metric and label name against the kube-state-metrics docs for the version plan 03 pins
   (look it up; do not guess). Do not assume Argo CD or app metrics here.
4. **Every alert keeps `namespace`** (routing uses it), sets `severity` (`critical` or `warning`),
   and has `summary` and `description` written for a person reading a chat message: what stopped,
   since when, and the first `kubectl` command to look (with `{{ $labels.namespace }}`).
5. **`podverse.rules.yaml`:**

   | Alert | Intent | For | Severity |
   | --- | --- | --- | --- |
   | PodverseScheduledCronJobSuspended | a `scheduled` CronJob has `spec.suspend` true | 2h | warning |
   | PodverseRecentFeedsPollerStale | `worker-recent-feeds` last success older than 20 min and not suspended | 5m | critical |
   | PodverseScheduledCronJobNeverSucceeds | a `scheduled` CronJob has no success in 26 h but was scheduled in that window | 15m | critical |
   | PodverseStartupConfigInvalid | a Job failed by `podFailurePolicy` (exit 78), or a Deployment container's last termination exit code is 78 | 0m | critical |

   For the Job half of `PodverseStartupConfigInvalid`, find how kube-state-metrics exposes a Job
   failed by a pod failure policy (for example a `reason` label on `kube_job_status_failed` or
   `kube_job_status_condition`). If the pinned version exposes no such reason, say so in the final
   message, keep the Deployment half (`kube_pod_container_status_last_terminated_exitcode == 78`),
   and make the description of `JobFailed` (below) tell the reader to check logs for a startup
   config error.
6. **`workloads.rules.yaml`:**

   | Alert | Intent | For | Severity |
   | --- | --- | --- | --- |
   | CronJobLastRunFailed | the newest Job owned by a CronJob failed (any reason) | 0m | warning |
   | JobDeadlineExceeded | a Job failed with reason `DeadlineExceeded` (a hung run was stopped) | 0m | warning |
   | JobRunningTooLong | a Job has been active longer than 6 h (backstop for jobs without a deadline) | 0m | warning |
   | DeploymentUnavailable | available replicas below desired | 15m | critical |
   | DeploymentScaledToZero | desired replicas 0 | 2h | warning |
   | ContainerRestarting | more than 3 restarts in 30 min | 0m | warning |

   Make `CronJobLastRunFailed` resolve when a later run of the same CronJob succeeds, so one bad
   night does not page forever.
7. **Intentional pauses** use Alertmanager silences, not rule exceptions.
8. Put a short section for `infra/k8s/INFRA-K8S.md` (what the rules cover, the allowlist flag, how
   to load the ConfigMap, `promtool` commands) in your final message under "Docs for 06".

## Files

- `infra/k8s/base/monitoring/kustomization.yaml` (new)
- `infra/k8s/base/monitoring/podverse.rules.yaml` (new)
- `infra/k8s/base/monitoring/workloads.rules.yaml` (new)
- `infra/k8s/base/monitoring/rules.test.yaml` (new, `promtool test rules`)

## Tests

`rules.test.yaml` with synthetic series covering at least: suspended scheduled CronJob (and a
suspended `manual` one that must **not** fire), stale poller, startup config invalid, last run
failed then resolved by a success, and deadline exceeded.

## Release scratchpad

Surfaces: k8s, ops. New `infra/k8s/base/monitoring` base with Prometheus alert rules for
suspended, failing, misconfigured (exit 78), or hung CronJobs, the stale Podcast Index poller,
unavailable or zero-replica Deployments, and restarting containers. Operators: deploy
kube-state-metrics with `--metric-labels-allowlist=cronjobs=[podverse-schedule]`, load the
`podverse-prometheus-rules` ConfigMap into Prometheus, and route by `namespace`.
