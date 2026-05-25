# Extensions + Prometheus Sidecar — Summary

Created: 2026-05-21  
**Status: implemented and archived** (all plan phases complete).  
Scope: Podverse monorepo — extensions platform (OTEL-first) with Prometheus as first extension.

## Goal

Deliver a **real extensions system** (not only env/route placeholders) where:

- **`prom-client` is not in default images** for `api`, `management-api`, `web`, `management-web`, long-running `workers`.
- Prometheus scrape is served by an **optional extension sidecar** per workload.
- Apps emit metrics via **OpenTelemetry** to a localhost OTLP receiver in the extension sidecar.
- **K8s enablement is centralized** (one shared extension ConfigMap; toggle once for all eligible apps).
- **Local testing** uses Docker Compose **extension profiles** (separate from core stack images).

## Locked decisions

| Decision | Choice |
| -------- | ------ |
| App → extension transport | **OTEL (OTLP over HTTP/gRPC to localhost)** |
| OTEL→Prometheus bridge | **OpenTelemetry Collector contrib in extension sidecar** |
| First extension | **Prometheus** (sidecar converts OTEL → Prometheus exposition) |
| Local dev | **Docker Compose profiles** (`extensions`, `extensions-prometheus`) |
| K8s enablement model | **Component-based** (`EXT_PROMETHEUS_ENABLED` + per-app component/overlay activation) |
| CronJob workers | **Out of scope** for extension sidecars in v1 (document Pushgateway path later) |
| Runtime-config sidecars | **Remain config-only** — do not add `prom-client` there |
| API metrics path migration | **Hard cutover** (remove app-served `/api/v2/extensions/prometheus/metrics`) |
| Metric naming | **OTEL semantic conventions** with explicit dashboard migration mapping |

## Delivered state

| Area | Behavior |
| ---- | -------- |
| API / management-api | OTEL SDK + sidecar scrape; app metrics route returns 404 |
| Web / management-web | OTEL SDK + Node HTTP instrumentation; runtime-config unchanged |
| Workers | OTEL for long-running commands only |
| K8s | `infra/k8s/base/extensions/` + components; `podverse-extensions-config` in alpha/common |
| Local | Compose profiles + `make local_extensions_prometheus_up` |

## Target inventory (new / moved)

### New packages / apps

| Item | Purpose |
| ---- | ------- |
| `packages/extension-sdk` (name TBD) | OTEL bootstrap, extension client, no `prom-client` |
| `apps/extension-prometheus` (or `infra/extensions/prometheus/`) | Extension sidecar image source; owns `prom-client` + OTLP collector bridge |

### K8s

| Item | Purpose |
| ---- | ------- |
| `infra/k8s/base/extensions/` | Shared `podverse-extensions-config` ConfigMap |
| Patches to 8 worker Deployments, api, management-api, web, management-web | Extension sidecar + `envFrom` |

### Docker (local)

| Item | Purpose |
| ---- | ------- |
| `infra/docker/local/extensions/` | Compose profile(s), Dockerfiles, env templates |
| Make targets (optional) | `local_extensions_up`, `local_extensions_prometheus_up` |

### Docs

| Item | Purpose |
| ---- | ------- |
| `docs/operations/extensions/EXTENSIONS.md` | Operator + developer contract |
| Update `docs/operations/extensions/PROMETHEUS-METRICS-ENDPOINTS.md` | Sidecar scrape paths, ports, toggles |

## Apps in scope

| App | Extension sidecar in pod? | OTEL in main container? | Remove `prom-client` from main? |
| --- | --------------------------- | ------------------------ | ------------------------------- |
| api | Yes (when enabled) | Yes | Yes |
| management-api | Yes | Yes | Yes |
| web (Next) | Yes | Yes | Yes (Next image) |
| management-web | Yes | Yes | Yes |
| workers (8 Deployments) | Yes | Yes | Yes |
| workers CronJobs | No (v1) | No | N/A |

Long-running worker commands (from `apps/workers/src/index.ts`): `mqRSSRunParser`, `mqAddByRSSRunParser`, `mqRSSRunLiveItemListener`, `mqRSSRunDlqConsumer`, `imageShrinkRunConsumer`.

## Success criteria

1. With `EXT_PROMETHEUS_ENABLED=false` (default): no extension sidecar scheduled; apps start without OTLP dependency failures.
2. With `EXT_PROMETHEUS_ENABLED=true` plus extension component enabled: sidecar healthy; `GET .../extensions/prometheus/metrics` returns 200; app HTTP/command metrics visible in scrape output.
3. `npm ls prom-client` in api/management-api/web/workers main package trees shows **no** direct app dependency (only extension image).
4. Local: `docker compose --profile extensions-prometheus up` brings extension stack testably.
5. Legacy in-process Prometheus routes removed from api/management-api after hard cutover.
6. OTEL semantic-convention metric names are published with a migration map for dashboards/alerts.

## Plan set files

| File | Focus |
| ---- | ----- |
| [01-extension-runtime-contract.md](./01-extension-runtime-contract.md) | Platform contract |
| [02-prometheus-extension-sidecar-image.md](./02-prometheus-extension-sidecar-image.md) | Sidecar image |
| [03-otel-app-sdk-and-adapters.md](./03-otel-app-sdk-and-adapters.md) | Shared SDK + adapters |
| [04-k8s-shared-extension-config-and-wiring.md](./04-k8s-shared-extension-config-and-wiring.md) | K8s base + alpha |
| [05-workers-longrunning-extension-wiring.md](./05-workers-longrunning-extension-wiring.md) | Workers |
| [06-web-and-management-web-extension-wiring.md](./06-web-and-management-web-extension-wiring.md) | Web apps |
| [07-api-and-management-api-extension-wiring.md](./07-api-and-management-api-extension-wiring.md) | APIs |
| [08-local-docker-compose-extension-profiles.md](./08-local-docker-compose-extension-profiles.md) | Local Docker |
| [09-testing-and-rollout-strategy.md](./09-testing-and-rollout-strategy.md) | Tests + rollout |

Execute via [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) and [COPY-PASTA.md](./COPY-PASTA.md).
