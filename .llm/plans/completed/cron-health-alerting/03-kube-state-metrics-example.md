**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 03 — Example: kube-state-metrics, Prometheus alerting snippet, cluster rules

## Rows

R3, R9

## Runs after

none

## Goal

Copy-and-adapt starter files a GitOps repo uses to give its existing Prometheus the metrics and
rules plan 02 needs. Folder: `infra/k8s/alpha/examples/optional-alerting/` (new, beside
`optional-extension-metrics/`). Read that README and
`docs/development/k8s/REMOTE-K8S-GITOPS.md` § "Optional cluster metrics" first and match their
conventions. Prometheus itself stays in the GitOps repo; do not add a Prometheus Deployment.

## Decisions

1. **Placeholders only.** Namespace `monitoring`. No real hostnames, room ids, or tokens.
2. `kube-state-metrics.yaml`: ServiceAccount, ClusterRole, ClusterRoleBinding, Deployment, Service.
   - Image `registry.k8s.io/kube-state-metrics/kube-state-metrics` pinned to the latest v2 release
     (look it up; state the tag and date in the final message).
   - `--resources=cronjobs,jobs,deployments,statefulsets,daemonsets,pods,nodes,namespaces,persistentvolumeclaims`
     and `--metric-labels-allowlist=cronjobs=[podverse-schedule]`.
   - ClusterRole: `list` and `watch` on exactly those resources. **No** `secrets` or `configmaps`.
   - Non-root, read-only root filesystem, dropped capabilities, small requests and limits.
3. `prometheus-alerting.snippet.yaml`: a commented fragment to merge into an existing
   `prometheus.yml`, not a full config:
   - `scrape_configs` job `kube-state-metrics` with `honor_labels: true` (so `namespace` is the
     object's namespace).
   - Optional job `argocd-metrics` for the Argo CD application controller metrics service
     (`argocd_app_info`), commented, with the default service name and port for a standard Argo CD
     install.
   - `rule_files:` covering the mounted `podverse-prometheus-rules` and `cluster-prometheus-rules`
     ConfigMaps, plus the matching `volumes`/`volumeMounts` as a commented Deployment patch.
   Plan 04 adds the `alerting:` block to this file.
4. `cluster.rules.yaml`: a ConfigMap `cluster-prometheus-rules` with a plain rules file:
   - `NodeFilesystemAlmostFull` (> 85% used for 15m warning; > 95% critical)
   - `NodeMemoryLow` (< 10% available, 15m, warning)
   - `NodeExporterDown` (`up{job="node-exporter"} == 0`, 5m, critical)
   - `KubeStateMetricsDown` (5m, critical: without it every workload alert goes quiet)
   - `ArgoAppDegraded` (health Degraded 15m, critical) and `ArgoAppOutOfSync` (30m, warning),
     setting `namespace` from the app's destination namespace label so routing works; mark both as
     requiring the optional Argo CD scrape.
   Every alert has `severity`, `summary`, `description`. Plan 04 adds `Watchdog` here.
5. Put the README text for these three files in your final message under "Docs for 06".

## Files

- `infra/k8s/alpha/examples/optional-alerting/kube-state-metrics.yaml` (new)
- `infra/k8s/alpha/examples/optional-alerting/prometheus-alerting.snippet.yaml` (new)
- `infra/k8s/alpha/examples/optional-alerting/cluster.rules.yaml` (new)

## Tests

Closing block runs `promtool check rules` on the rules in `cluster.rules.yaml` (extract the data
key to a temp file; give the exact command in the final message).

## Release scratchpad

Surfaces: k8s, ops. New example `infra/k8s/alpha/examples/optional-alerting/` with
kube-state-metrics (no access to Secrets or ConfigMaps), a Prometheus scrape and rule-loading
snippet, and cluster alerts for disk, memory, exporters, and Argo CD app health.
