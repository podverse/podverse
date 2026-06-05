# Optional extension metrics (GitOps checklist)

Podverse can emit Prometheus metrics via the **extension-prometheus** sidecar. The monorepo ships
base manifests and alpha **commented** examples; committed alpha overlays keep extensions **disabled
by default**. Prometheus, Grafana, and dashboard JSON live in **your GitOps repository**, not here.

## Checklist

### 1. GitOps — common overlay

1. Uncomment `base/extensions` in [`common/kustomization.yaml`](/infra/k8s/alpha/common/kustomization.yaml)
   `resources:` (remote Kustomize URL).
2. Remove or comment the stub `podverse-extensions-config` `configMapGenerator` entry that points at
   `source/extensions.env` only.
3. Merge env into `podverse-extensions-config`:
   - [`extensions.env`](/infra/k8s/base/common/source/extensions/extensions.env) — set
     `PROMETHEUS_ENABLED=true` and `OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318`
   - Copy [`extension-prometheus.env.example`](/infra/k8s/alpha/common/source/extension-prometheus.env.example)
     → `extension-prometheus.env` in GitOps
   - Copy [`extension-sidecar-otel.env.example`](/infra/k8s/alpha/common/source/extension-sidecar-otel.env.example)
     → `extension-sidecar-otel.env` in GitOps

Canonical keys: [`infra/k8s/base/common/source/extensions/`](/infra/k8s/base/common/source/extensions/).

### 2. GitOps — workloads

On **api**, **web**, **management-api**, **management-web**, and **workers** (not cron):

1. Uncomment `extension-prometheus` in `images:`.
2. Uncomment `prometheus-sidecar` under `components:`.

See commented blocks in each workload [`kustomization.yaml`](/infra/k8s/alpha/api/kustomization.yaml) under
`infra/k8s/alpha/<component>/`.

### 3. GitOps — Prometheus

Deploy Prometheus in your GitOps repo. Scrape extension sidecars:

| Setting | Value                                |
| ------- | ------------------------------------ |
| Port    | **9464**                             |
| Path    | `/extensions/prometheus/metrics`     |
| Relabel | pod label `app` → **`podverse_app`** |

Full scrape examples: [PROMETHEUS-METRICS-ENDPOINTS.md](/docs/operations/extensions/PROMETHEUS-METRICS-ENDPOINTS.md).

Optional **node-exporter** DaemonSet on port **9100** for host CPU, memory, disk, and network.

### 4. GitOps — Grafana (optional)

1. Datasource → in-cluster Prometheus.
2. Provision dashboards for `podverse_extension_prometheus_*` metrics.

Typical dashboard types (JSON in **your** GitOps repo):

| Dashboard     | Focus                                             |
| ------------- | ------------------------------------------------- |
| Overview      | Scrape health, HTTP/worker summary                |
| HTTP          | `http_request_method`, `http_route`, status codes |
| Workers       | `command`, `status` labels                        |
| Node-exporter | Host metrics (`node_*` series)                    |

**Dashboard JSON does not live in the Podverse monorepo.**

### 5. Verify in Grafana Explore

Replace `<namespace>` with your Podverse namespace:

```promql
sum(rate(podverse_extension_prometheus_http_server_request_duration_count{k8s_namespace="<namespace>"}[5m]))
```

```promql
sum by (podverse_app) (rate(podverse_extension_prometheus_http_server_request_duration_count{k8s_namespace="<namespace>"}[5m]))
```

## Reference layout

A complete GitOps tree often mirrors:

- `apps/<namespace>/common/` — extensions ConfigMap merge
- `apps/prometheus/manifests/` — scrape config and Deployment
- `apps/grafana/manifests/` — provisioning and dashboard ConfigMaps
- `docs/k8s/podverse/PODVERSE-ALPHA.md` — operator runbook

Remote deploy checklist: [REMOTE-K8S-GITOPS.md](/docs/development/k8s/REMOTE-K8S-GITOPS.md).
