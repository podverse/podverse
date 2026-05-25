# Plan 07 — API and management-api extension wiring

## Objective

Remove in-process `prom-client` from API apps; export metrics via OTEL to extension sidecar; preserve HTTP metric semantics (method, route, status_code).

**Migration policy (locked):** hard cutover for API metrics path — no compatibility proxy window.

---

## 1. Remove legacy in-process Prometheus

### Delete or gut

| Path | Action |
| ---- | ------ |
| [apps/api/src/lib/extensions/prometheus/prometheusExporter.ts](apps/api/src/lib/extensions/prometheus/prometheusExporter.ts) | Delete after SDK wired |
| [apps/management-api/src/lib/extensions/prometheus/prometheusExporter.ts](apps/management-api/src/lib/extensions/prometheus/prometheusExporter.ts) | Delete |
| [apps/api/src/lib/extensions/prometheus/registerPrometheusRoutes.ts](apps/api/src/lib/extensions/prometheus/registerPrometheusRoutes.ts) | Delete |
| management-api twin | Delete |

### Update bootstrap

[apps/api/src/app.ts](apps/api/src/app.ts) — replace block at lines 52–60:

```typescript
// Before: createPrometheusExporter + httpMiddleware
// After:
import { getExtensionHttpMiddleware, initExtensions } from '@podverse/extension-sdk';

initExtensions({ ... }); // after config loaded
if (config.extensions.prometheus.enabled) {
  app.use(getExtensionHttpMiddleware());
}
```

Remove `prometheus` from `registerExtensionRoutes` runtime (or remove prometheus branch entirely).

[apps/management-api/src/app.ts](apps/management-api/src/app.ts) — same pattern.

### package.json

Remove `"prom-client"` from:

- [apps/api/package.json](apps/api/package.json)
- [apps/management-api/package.json](apps/management-api/package.json)

Run `make sync_lockfile` after removal.

---

## 2. OpenAPI

Update [apps/api/openapi.yml](apps/api/openapi.yml) and [apps/management-api/openapi.yml](apps/management-api/openapi.yml):

- Remove `GET /extensions/prometheus/metrics` from app OpenAPI specs (sidecar endpoint is out-of-process and not part of app API surface).

```bash
./scripts/nix/with-env npm run openapi:check
```

---

## 3. Config + validation

| File | Change |
| ---- | ------ |
| `apps/api/src/config/index.ts` | Add `extensions.otel.*` |
| `apps/api/src/lib/startup/validation.ts` | Validate OTEL vars when prometheus enabled |
| `apps/api/.env.example` | Extensions section: EXT_* + OTLP localhost |
| `apps/management-api/*` | Mirror |

K8s: `EXT_OTEL_SERVICE_NAME` in api.env / management-api.env (plan 04).

---

## 4. K8s deployment

[infra/k8s/base/api/deployment.yaml](infra/k8s/base/api/deployment.yaml):

- Main container `envFrom` + `podverse-extensions-config`
- Add `extension-prometheus` sidecar
- Scrape **9464** not 3000 for metrics

Ingress must **not** expose 9464.

---

## 5. Tests to update

| Test | Expected change |
| ---- | --------------- |
| [apps/api/src/lib/extensions/registerExtensionRoutes.prometheus.test.ts](apps/api/src/lib/extensions/registerExtensionRoutes.prometheus.test.ts) | Remove or rewrite: app no longer registers route |
| [apps/api/src/test/health-ready.test.ts](apps/api/src/test/health-ready.test.ts) | `GET /api/v2/extensions/prometheus/metrics` on app → **404** always |
| management-api prometheus tests | Same |

Add integration test (optional): with mock OTLP server in vitest, assert middleware increments exported metric (SDK unit level may suffice).

---

## 6. Metric naming convention (locked)

Use **OTEL semantic conventions** for emitted instruments and publish a required dashboard/alert migration mapping.

Document mapping from legacy names to OTEL-semconv-derived Prometheus series in docs:

| Legacy | Target (semconv-based) |
| ------ | ---------------------- |
| `podverse_api_http_requests_total` | `http.server.request.count` translated series |
| `podverse_api_http_request_duration_seconds` | `http.server.request.duration` translated histogram series |
| `podverse_management_api_*` | matching semconv service-scoped series |

Operators must treat this as a hard-breaking metrics migration (no dual-run requirement).

---

## 7. Verification

```bash
./scripts/nix/with-env npm run build -w apps/api
./scripts/nix/with-env npm run build -w apps/management-api
./scripts/nix/with-env npm run test:e2e:api
./scripts/nix/with-env npm ls prom-client -w apps/api  # should be empty
```

---

## 8. Acceptance checklist

- [ ] No `prom-client` in api/management-api package.json
- [ ] App port 3000 does not serve `/extensions/prometheus/metrics`
- [ ] Sidecar serves metrics when enabled
- [ ] HTTP middleware labels unchanged allowlist
- [ ] OpenAPI check passes
- [ ] TODO(extensions-migration) comments removed or resolved
