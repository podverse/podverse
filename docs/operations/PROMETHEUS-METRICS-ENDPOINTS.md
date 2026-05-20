# Prometheus Metrics Endpoints

Podverse exposes Prometheus scrape endpoints but does not bundle, deploy, or manage Prometheus.
Deployers decide how Prometheus (and optional Grafana/Alertmanager) fits their architecture.
Current implementation note: this endpoint is currently powered by a baked-in `prom-client`
adapter under `lib/extensions/prometheus/` and registered via `registerExtensionRoutes`
(after feature routers). It is expected to migrate to extension-host wiring in a future phase.

## Scope

- Podverse API (`apps/api`) can expose `GET /api/v2/extensions/prometheus/metrics`.
- Podverse Management API (`apps/management-api`) can expose
  `GET /api/v2/extensions/prometheus/metrics`.
- Endpoints are disabled by default.

Extension routes use the pattern `{API_PREFIX}{API_VERSION}/extensions/{service}/{resource}`.
The **prometheus** extension exposes the **metrics** resource at `/extensions/prometheus/metrics`.
Prometheus only requires a GET that returns exposition format; configure scrape targets with
`metrics_path` (or equivalent).

## Enable Or Disable

Set this environment variable per service (last section in app env files; maps to
`config.extensions.prometheus.enabled`):

```bash
EXT_PROMETHEUS_ENABLED="true"
```

Behavior:

- `true`: service registers `GET /api/v2/extensions/prometheus/metrics`.
- unset or `false`: that route is not registered (returns 404).

## Prometheus scrape configuration

Example static scrape (adjust host/port per environment):

```yaml
scrape_configs:
  - job_name: podverse_api
    static_configs:
      - targets: ['api.example.internal:3000']
    metrics_path: /api/v2/extensions/prometheus/metrics
```

## Prometheus Model

- Pull model only: Prometheus scrapes Podverse endpoints.
- No custom POST ingestion endpoint in Podverse.
- No metrics persisted in Postgres.

## Data Exposed

When enabled, each API exports:

- process/runtime defaults from `prom-client`
- HTTP request totals (`*_http_requests_total`)
- HTTP request duration histogram (`*_http_request_duration_seconds`)
- in-flight request gauge (`*_http_requests_in_flight`)

Metric prefixes:

- `podverse_api_*` for API
- `podverse_management_api_*` for management-api

## Label Guardrails

To keep cardinality safe, HTTP metrics use a fixed label allowlist:

- `method`
- `route`
- `status_code`

Do not add user IDs, feed URLs, IP addresses, or other unbounded labels.

## Operator Note

Keep metrics endpoints private to trusted networks where possible (cluster-local or private ingress).
