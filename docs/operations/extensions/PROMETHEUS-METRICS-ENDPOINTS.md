# Prometheus Metrics Endpoints

Podverse exposes Prometheus scrape endpoints via the **Prometheus extension sidecar** but does
not bundle, deploy, or manage Prometheus. Deployers choose how Prometheus (and optional
Grafana/Alertmanager) fits their architecture.

**Contract:** [DOCS-OPERATIONS-PLATFORM.md](../platform/DOCS-OPERATIONS-PLATFORM.md)  
**Sidecar architecture:** [EXTENSIONS-SIDECAR.md](EXTENSIONS-SIDECAR.md)

## Implementation status

Main apps export metrics via **OTLP** to the **extension-prometheus** sidecar. Prometheus scrapes
the sidecar only. The API and management-api processes do **not** expose Prometheus metrics on the
main HTTP port.

## Scope

| Workload             | Scrape target                      | App port (not for metrics) |
| -------------------- | ---------------------------------- | -------------------------- |
| API                  | Extension sidecar `:9464`          | `3000`                     |
| Management API       | Extension sidecar `:9464`          | management-api port        |
| Web                  | Extension sidecar `:9464`          | `3002` (Next)              |
| Management web       | Extension sidecar `:9464`          | `3102`                     |
| Long-running workers | Extension sidecar `:9464` (pod IP) | N/A (no Service)           |

Runtime-config sidecars (`:3001` / `:3101`) do **not** expose Prometheus metrics.

## Enable or disable

Shared configuration: [extensions.env.example](../../../infra/config/env-templates/extensions.env.example)
(app toggle + OTLP endpoint) and [extension-prometheus.env.example](../../../infra/config/env-templates/extension-prometheus.env.example)
(sidecar scrape) → Kubernetes ConfigMap `podverse-extensions-config` (merged with
[extension-sidecar-otel.env.example](../../../infra/config/env-templates/extension-sidecar-otel.env.example)).

```bash
PROMETHEUS_ENABLED="true"
OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318"
```

Kubernetes enablement is **component-based**:

1. Set `PROMETHEUS_ENABLED=true` in shared extensions env.
2. Apply the prometheus sidecar Kustomize component on each eligible workload.

Per-app: set `OTEL_SERVICE_NAME` (see [DOCS-OPERATIONS-PLATFORM.md](../platform/DOCS-OPERATIONS-PLATFORM.md)).

When disabled: no extension sidecar scheduled; apps do not start OTLP export.

## Canonical scrape paths

| Path                             | Purpose                             |
| -------------------------------- | ----------------------------------- |
| `/extensions/prometheus/metrics` | Prometheus exposition (text format) |
| `/extensions/prometheus/health`  | Sidecar health probes               |

## Prometheus scrape configuration

Prometheus runs in **your GitOps repo** (not the Podverse monorepo). Discover extension sidecars on
container port **9464** with Kubernetes pod service discovery or a **PodMonitor** (Prometheus
Operator). Do not use `prometheus.io/*` pod annotations.

### Kubernetes pod SD (all workloads including workers)

Filter pods by the extension sidecar port and scrape path:

```yaml
scrape_configs:
  - job_name: podverse-extension-metrics
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - podverse-alpha
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_container_port_number]
        regex: '9464'
        action: keep
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container
    metrics_path: /extensions/prometheus/metrics
    scheme: http
```

Workers have no Service; pod SD on port **9464** covers them the same as API/web sidecars.

### PodMonitor (Prometheus Operator)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: podverse-extension-prometheus
  namespace: podverse-alpha
spec:
  selector:
    matchExpressions:
      - key: app
        operator: Exists
  podMetricsEndpoints:
    - port: metrics
      path: /extensions/prometheus/metrics
      interval: 30s
```

Requires the sidecar container port name `metrics` (from `prometheus-sidecar` component).

## Prometheus model

- Pull model: Prometheus scrapes the extension sidecar.
- Apps push metrics to the sidecar via **OTLP over HTTP** (localhost inside the pod).
- No custom POST metrics ingestion on the main app.
- No metrics persisted in Postgres.

## Data exposed

- HTTP server metrics from apps (OTEL semantic conventions).
- Worker command duration for long-running commands (`command`, `status` labels).
- Collector / sidecar process metrics when enabled.

Metric naming follows **OpenTelemetry HTTP semantic conventions** (for example
`http.server.request.duration`).

## Label guardrails

HTTP metrics use a bounded label set (semconv):

- `http.request.method`
- `http.route` (normalized; no raw UUID paths)
- `http.response.status_code`

Do not add user IDs, feed URLs, IP addresses, or other unbounded labels.

## Operator note

Keep metrics endpoints on cluster-internal networks only. Do not expose port **9464** via
public Ingress.
