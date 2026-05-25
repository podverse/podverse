# Plan 03 — OTEL app SDK and adapters

## Objective

Add `@podverse/extension-sdk` (name final in implementation) so **all apps** emit metrics over OTLP without `prom-client`, using thin per-app adapters.

---

## 1. Package layout

```
packages/extension-sdk/
  package.json          # @podverse/extension-sdk
  src/
    index.ts
    init.ts               # initExtensions / shutdownExtensions
    config.ts             # parse EXT_* (no defaults for required when enabled)
    otel/
      meterProvider.ts
      resource.ts
    http/
      expressMiddleware.ts
      nextMiddleware.ts   # or instrumentation hook helper
    worker/
      commandTiming.ts
  vitest.config.ts
```

### Dependencies (package)

- `@opentelemetry/api`
- `@opentelemetry/sdk-metrics`
- `@opentelemetry/exporter-metrics-otlp-http` (or gRPC — match sidecar)
- `@opentelemetry/instrumentation-http` (optional auto-instrumentation for Express)

**Explicitly exclude:** `prom-client`

### Workspace consumers

- `apps/api`, `apps/management-api`
- `apps/web`, `apps/management-web`
- `apps/workers`

---

## 2. Initialization contract

```typescript
// Called early in app bootstrap (after env validation)
import { initExtensions, shutdownExtensions } from '@podverse/extension-sdk';

initExtensions({
  prometheusEnabled: config.extensions.prometheus.enabled,
  otlpEndpoint: config.extensions.otel.otlpEndpoint,
  serviceName: config.extensions.otel.serviceName,
});

// On SIGTERM (workers, api)
await shutdownExtensions();
```

When `prometheusEnabled === false`: **no-op**, no OTLP exporter started, zero network calls.

---

## 3. Per-app adapters

### API / management-api

| Change | File |
| ------ | ---- |
| Remove | `createPrometheusExporter`, `prometheusExporter.httpMiddleware` from [apps/api/src/app.ts](apps/api/src/app.ts) |
| Remove | [apps/api/src/lib/extensions/prometheus/prometheusExporter.ts](apps/api/src/lib/extensions/prometheus/prometheusExporter.ts) (after sidecar cutover) |
| Add | `app.use(getExtensionHttpMiddleware())` when enabled |
| Remove | `registerPrometheusRoutes` from app router — scrape is sidecar-only |
| Update | [apps/api/src/lib/extensions/registerExtensionRoutes.ts](apps/api/src/lib/extensions/registerExtensionRoutes.ts) — drop prometheus route registration |

Keep `prometheusPaths.ts` constants **or** move to SDK for docs parity.

### Web / management-web

| Change | File |
| ------ | ---- |
| Add | `src/middleware.ts` — Next middleware calling SDK (nodejs runtime) |
| Update | [apps/web/instrumentation.ts](apps/web/instrumentation.ts) — `initExtensions()` on server start |
| Add | path normalizer usage for `route` label |

Do **not** add prom-client to Next bundle. Add `serverExternalPackages` for OTEL packages if needed in `next.config.mjs`.

### Workers

| Change | File |
| ------ | ---- |
| Update | [apps/workers/src/index.ts](apps/workers/src/index.ts) — `initExtensions` after validation; wrap `command(args)` with `recordWorkerCommand` |
| Long-running only | Start OTLP only when command ∈ `longRunningCommands` **and** enabled |

---

## 4. Config + validation (each app)

Add to `config.extensions.otel` and startup validation category **Extensions** (last):

- `EXT_OTEL_EXPORTER_OTLP_ENDPOINT` — required when `EXT_PROMETHEUS_ENABLED=true`
- `EXT_OTEL_SERVICE_NAME` — required when enabled

Apps/workers `.env.example` — document localhost OTLP URL pointing at sidecar ports.

---

## 5. Migration from in-process Prometheus

| Step | Action |
| ---- | ------ |
| 1 | Introduce SDK behind feature flag (`EXT_PROMETHEUS_ENABLED`) |
| 2 | Deploy sidecar + SDK together in staging |
| 3 | Verify metric parity (request rate, latency histograms) |
| 4 | Remove `prom-client` from api/management-api `package.json` |
| 5 | Delete duplicate management-api prometheus exporter files |
| 6 | Update OpenAPI — remove `/extensions/prometheus/metrics` from api spec if only served by sidecar |

---

## 6. Tests

| Test | Location |
| ---- | -------- |
| SDK unit: disabled no-op | `packages/extension-sdk/src/init.test.ts` |
| SDK unit: route normalization | `normalizePath.test.ts` |
| API integration: metrics route 404 on **app** port when sidecar-only | update `health-ready.test.ts` / prometheus tests |
| Optional: testcontainers OTLP → scrape | extension-prometheus package |

---

## 7. Docker runtime parity

When adding `packages/extension-sdk`:

- Update Dockerfiles for api, management-api, web, workers per [docker-runtime-workspace-parity](.cursor/skills/docker-runtime-workspace-parity/SKILL.md)
- **Do not** copy `prom-client` into app runtime stages

---

## 8. Verification

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run test -w @podverse/extension-sdk
./scripts/nix/with-env npm run test -w apps/api
# Confirm prom-client not in app lockfile dependency tree for api:
./scripts/nix/with-env npm ls prom-client -w apps/api
```

---

## 9. Acceptance checklist

- [ ] `@podverse/extension-sdk` built and exported
- [ ] api/management-api/web/workers depend on SDK, not prom-client
- [ ] Express + Next + worker adapters implemented
- [ ] Disabled mode has no startup penalty
- [ ] Enabled mode exports OTLP to documented endpoint
