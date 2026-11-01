# Optional alerting (GitOps checklist)

Copy these manifests into your GitOps repo and adapt them. Prometheus and Alertmanager
**deployments** stay in GitOps. This folder is the copy-and-adapt example. Podverse alert rules
live in [`infra/k8s/base/monitoring`](/infra/k8s/base/monitoring) and ship as ConfigMap
`podverse-prometheus-rules`.

Remote deploy checklist:
[REMOTE-K8S-GITOPS.md](/docs/development/k8s/REMOTE-K8S-GITOPS.md).

## Prerequisites

Use hosted [ntfy.sh](https://ntfy.sh) on the **free tier, with no account**.

One long random topic per environment (Podverse alpha, Metaboost alpha):

```bash
openssl rand -hex 16
```

The topic name is the secret. Anyone who has it can read and post, so it lives only in the SOPS
Secrets, never in git. The bearer token is optional on the free tier.

Subscribe each topic on a phone through the ntfy iPhone app, and on a Mac through the ntfy.sh web
app with browser notifications granted.

## Free-tier daily limit

Hosted ntfy.sh allows **250 messages per day per visitor**
([limitations](https://docs.ntfy.sh/publish/#limitations)). Alertmanager and Argo CD notifications
share that quota, because both post from the cluster.

HTTP 429 means alerts are being dropped. That is the point to move to ntfy Pro.

## What goes where

Alertmanager posts every firing and resolved alert to the environment topic. Argo CD posts deploy
live, sync failed, and health degraded events to the same topic. `namespace="metaboost-alpha"`
uses the Metaboost topic. Everything else, including cluster alerts, uses the Podverse alpha
topic.

`Watchdog` (`severity="none"`) does not go to ntfy. It stays on the external dead-man check.

| Event                             | ntfy priority |
| --------------------------------- | ------------- |
| Alert firing, `severity=critical` | 5             |
| Alert firing, `severity=warning`  | 3             |
| Any alert resolved                | 2             |
| Argo CD sync failed               | 5             |
| Argo CD app Degraded              | 4             |
| Argo CD deploy live               | 2             |

Priority for alerts is inline ntfy templating: `?template=yes` with `title`, `message`, and
`priority` on each environment topic URL (`podverse-alpha-url`, `metaboost-alpha-url` in Secret
`ntfy-alerts`). To change a priority, edit the `priority=` expression in those URL values
(`create_ntfy_alerts_secret.sh`) and re-apply the Secret.

## Why ntfy is hosted

An outage alert cannot come from the cluster it is about. Self-hosting is fine when ntfy runs
outside that cluster.

## Checklist

### 1. Secrets

Copy the generators into the GitOps repo, then run them from that repo root (next to `.sops.yaml`).
They are optional and are not part of `create_all_secrets_auto_gen.sh`.

```bash
bash ./scripts/secret-generators/create_ntfy_alerts_secret.sh
bash ./scripts/secret-generators/create_argocd_notifications_secret.sh
```

- `create_ntfy_alerts_secret.sh` writes `ntfy-alerts` (namespace `monitoring`): per-environment
  topic URLs, optional `token`, optional `watchdog-url`. Default file
  `./secrets/ntfy-alerts.enc.yaml`.
- `create_argocd_notifications_secret.sh` writes `argocd-notifications-secret` (namespace
  `argocd`): `ntfy-<env>-url` keys and optional `ntfy-token`. Default file
  `./secrets/argocd-notifications-secret.enc.yaml`.

Paste each `openssl rand -hex 16` topic into the URL prompt. Leave the token empty on the free
tier.

### 2. kube-state-metrics

Apply [`kube-state-metrics.yaml`](kube-state-metrics.yaml) in namespace `monitoring`. It creates
ServiceAccount, ClusterRole, ClusterRoleBinding, Deployment, and Service `kube-state-metrics`.

Image `registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.20.0`. The process runs as uid
65534, with a read-only root filesystem, dropped capabilities, and a RuntimeDefault seccomp
profile. Requests are 10m CPU and 64Mi memory; limits are 100m CPU and 256Mi memory. Metrics are
on Service port **8080**, telemetry on **8081**. Scrape
`kube-state-metrics.monitoring.svc.cluster.local:8080`.

`--resources` is
`cronjobs,jobs,deployments,statefulsets,daemonsets,pods,nodes,namespaces,persistentvolumeclaims`.
The ClusterRole grants `list` and `watch` on those resources only. It does not grant Secrets or
ConfigMaps. A cluster that already runs kube-state-metrics should add the allowlist flag to that
process instead of replacing a broader ClusterRole with this one.

`--metric-labels-allowlist=cronjobs=[podverse-schedule]` publishes that CronJob label on
`kube_cronjob_labels` as `label_podverse_schedule`.

### 3. Rules and the Prometheus snippet

Uncomment the remote base in [`kustomization.yaml`](kustomization.yaml) and pin `?ref=` with the
other Podverse bases:

`https://github.com/podverse/podverse//infra/k8s/base/monitoring?ref=X.Y.Z-staging.N`

That base emits ConfigMap `podverse-prometheus-rules` (no namespace of its own; this overlay sets
`monitoring`). Mount it and include both files in Prometheus `rule_files`.

[`cluster.rules.yaml`](cluster.rules.yaml) is ConfigMap `cluster-prometheus-rules` in namespace
`monitoring`. The rules file is data key `cluster.rules.yaml`.

| Alert                      | Pending                                 | Severity |
| -------------------------- | --------------------------------------- | -------- |
| `NodeFilesystemAlmostFull` | 15m, more than 85% used                 | warning  |
| `NodeFilesystemAlmostFull` | 15m, more than 95% used                 | critical |
| `NodeMemoryLow`            | 15m, under 10% available                | warning  |
| `NodeExporterDown`         | 5m, `up{job="node-exporter"} == 0`      | critical |
| `KubeStateMetricsDown`     | 5m, `up{job="kube-state-metrics"} == 0` | critical |
| `ArgoAppDegraded`          | 15m, `health_status="Degraded"`         | critical |
| `ArgoAppOutOfSync`         | 30m, `sync_status="OutOfSync"`          | warning  |

Disk rules ignore tmpfs, devtmpfs, overlay, squashfs, aufs, ramfs, and iso9660. `ArgoAppDegraded`
and `ArgoAppOutOfSync` set `namespace` from the Application's `dest_namespace` label.
`ArgoAppDegraded` and `ArgoAppOutOfSync` need the optional `argocd-metrics` scrape. Read the
Application with `kubectl -n argocd get applications.argoproj.io <name>`.

[`prometheus-alerting.snippet.yaml`](prometheus-alerting.snippet.yaml) is a fragment to merge into
the Prometheus config GitOps already runs. It is not a Kustomize resource.

- Append the `kube-state-metrics` scrape job. `honor_labels: true` keeps each series' `namespace`
  label as the object's namespace. The job name must stay `kube-state-metrics`.
- The `argocd-metrics` job is commented. A standard Argo CD install serves `argocd_app_info` on
  Service `argocd-metrics` in namespace `argocd`, port **8082**. Append that job under
  `scrape_configs` to enable the Argo CD alerts.
- Append the two `rule_files` globs, and merge the commented volume and volumeMount patch into the
  existing Prometheus Deployment. Mount paths match the globs. Rename the container in the patch
  if it is not called `prometheus`.
- Append the `alerting.alertmanagers` block. The target is
  `alertmanager.monitoring.svc.cluster.local:9093`.
- Disk and memory alerts expect an existing scrape job named `node-exporter` (port 9100).

Check the rules from the monorepo root:

```bash
nix shell nixpkgs#prometheus.cli -c promtool check rules infra/k8s/base/monitoring/podverse.rules.yaml infra/k8s/base/monitoring/workloads.rules.yaml
nix shell nixpkgs#prometheus.cli -c promtool test rules infra/k8s/base/monitoring/rules.test.yaml
python3 -c 'from pathlib import Path; import yaml; src = Path("infra/k8s/alpha/examples/optional-alerting/cluster.rules.yaml"); doc = yaml.safe_load(src.read_text()); Path("/tmp/cluster.rules.yaml").write_text(doc["data"]["cluster.rules.yaml"])'
nix shell nixpkgs#prometheus.cli -c promtool check rules /tmp/cluster.rules.yaml
```

### 4. Alertmanager

Apply [`alertmanager.yaml`](alertmanager.yaml) in namespace `monitoring` after Secret `ntfy-alerts`
exists. The Service is cluster-internal on port **9093**. Open the silences UI with:

```bash
kubectl -n monitoring port-forward svc/alertmanager 9093:9093
```

Check the config from the monorepo root:

```bash
python3 -c 'from pathlib import Path; import yaml; src = Path("infra/k8s/alpha/examples/optional-alerting/alertmanager.yaml"); docs = yaml.safe_load_all(src.read_text()); doc = next(item for item in docs if isinstance(item, dict) and item.get("kind") == "ConfigMap"); Path("/tmp/alertmanager.yaml").write_text(doc["data"]["alertmanager.yaml"])'
nix shell nixpkgs#prometheus-alertmanager -c amtool check-config /tmp/alertmanager.yaml
```

### 5. Argo CD notifications

Apply [`argocd-notifications-cm.yaml`](argocd-notifications-cm.yaml) in namespace `argocd`, and
apply `argocd-notifications-secret`. Keep a single owner for `argocd-notifications-cm`. Set
`argocdUrl` in that ConfigMap to the external Argo CD URL.

Triggers:

- sync failed, priority **5**, title `Argo CD Sync Failed`
- app Degraded, priority **4**, title `Argo CD Health Degraded`
- deploy live, priority **2**, title `Argo CD Deploy Live`

The `Authorization` header is commented. Leave it commented while `ntfy-token` is unset.

### 6. Watchdog external check

`Watchdog` routes to the null receiver until `watchdog-url` is set in `ntfy-alerts`. Point that
URL at an external dead-man check (Healthchecks.io notifying ntfy). Confirm the ntfy integration
on that check is active, then switch the Watchdog receiver from `watchdog-null` to the commented
webhook receiver.

### 7. Test delivery

With the port-forward from step 4 still up, add one alert per severity and confirm it on the phone
and on the Mac. A resolved notification (priority 2) arrives when the alert ends.

```bash
amtool --alertmanager.url=http://127.0.0.1:9093 alert add alertname=ManualDeliveryTest severity=critical namespace=podverse-alpha summary="Manual test alert" description="Verify ntfy delivery"
amtool --alertmanager.url=http://127.0.0.1:9093 alert add alertname=ManualDeliveryTest severity=warning namespace=podverse-alpha summary="Manual test alert" description="Verify ntfy delivery"
amtool --alertmanager.url=http://127.0.0.1:9093 alert add alertname=ManualDeliveryTest severity=critical namespace=metaboost-alpha summary="Manual test alert" description="Verify ntfy delivery"
```

The Metaboost alert should land on the Metaboost topic. The other two should land on the Podverse
alpha topic, at priorities 5 and 3.

## Pausing a job on purpose

Create an Alertmanager silence with an end time that covers the planned window. Match the
CronJob's alert name and namespace. When the silence ends, alerting resumes.

## What each piece can see

Alertmanager and Argo CD hold only ntfy topic URLs and an optional token. kube-state-metrics
cannot list Secrets or ConfigMaps. Nothing in this example reads Kubernetes Secrets beyond those
two notification Secrets.

## Rotating a topic name

Generate a new topic with `openssl rand -hex 16`, update the URL in the Secret, apply the Secret,
and resubscribe each phone and the Mac. To rotate the optional token, update `token` and
`ntfy-token` and apply both Secrets.

## Pinning

When you bump other `?ref=` pins, bump the monitoring base
`?ref=X.Y.Z-staging.N` in the same change.
