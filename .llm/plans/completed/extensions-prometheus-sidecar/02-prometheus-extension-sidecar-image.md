# Plan 02 — Prometheus extension sidecar image

## Objective

Build a **dedicated extension container image** that owns `prom-client`, receives OTLP from the co-located app, and exposes `GET /extensions/prometheus/metrics`.

## Recommended location

```
apps/extension-prometheus/
  package.json
  src/
    server.ts           # HTTP: health + metrics
    otlpReceiver.ts       # OTLP HTTP listener → metric bridge
    prometheusRegistry.ts # prom-client registry + exposition
  Dockerfile
  .env.example
```

Alternative: `infra/extensions/prometheus/` if team prefers infra-adjacent layout; keep publish name `extension-prometheus`.

---

## 1. Runtime behavior

### Startup sequence

1. Validate env (`EXT_PROMETHEUS_METRICS_PORT`, OTLP listen port, etc.).
2. Start OTLP HTTP receiver (default `:4318` on `0.0.0.0` — pod-internal only).
3. Bridge OTEL cumulative/histogram instruments into Prometheus registry (see §3).
4. `collectDefaultMetrics` with prefix `podverse_extension_prometheus_` (sidecar process only).
5. Listen on `EXT_PROMETHEUS_METRICS_PORT` (default `9464`).

### Routes

| Method | Path | Response |
| ------ | ---- | -------- |
| GET | `/extensions/prometheus/health` | `200` JSON `{ status: 'ok' }` |
| GET | `/extensions/prometheus/metrics` | Prometheus text exposition |
| * | other | `404` |

When parent pod has `EXT_PROMETHEUS_ENABLED=false`, this container is **not scheduled** (not started-with-crash).

---

## 2. OTEL → Prometheus bridge (locked)

Use **OpenTelemetry Collector contrib in the extension sidecar**.

Why this is locked for v1:

- battle-tested OTLP ingestion and Prometheus export path
- fewer custom translation edge cases (temporality, histogram handling)
- clearer future compatibility with broader OTEL adoption

Implementation note: image size can be optimized later, but correctness and operator reliability take priority in this rollout.

Sidecar image **must** include `prom-client` (or collector’s Prometheus exporter). Main app images **must not**.

---

## 3. Docker image

### Dockerfile pattern

Follow [apps/web/sidecar/Dockerfile](apps/web/sidecar/Dockerfile) / local docker patterns:

- Multi-stage build from monorepo root
- `npm ci` scoped to extension workspace + required packages
- Non-root user (uid 1000)
- `readOnlyRootFilesystem: true` where feasible

### Publish

Add to publish docs / Jenkins / GH workflow alongside `web-runtime-config`:

| Image | Tag example |
| ----- | ----------- |
| `ghcr.io/podverse/podverse/extension-prometheus` | release tag |

Update [docs/operations/deploy/PUBLISH.md](docs/operations/deploy/PUBLISH.md).

---

## 4. Dependencies (sidecar only)

```json
{
  "dependencies": {
    "prom-client": "^15.1.3",
    "@opentelemetry/otlp-transformer": "...",
    "@opentelemetry/sdk-metrics": "..."
  }
}
```

No dependency on `@podverse/orm`, Express apps, or Next.

---

## 5. Security

- Bind metrics and OTLP to `0.0.0.0` **inside pod only**; not exposed via Ingress.
- NetworkPolicy (ops repo): allow Prometheus scraper → pod:9464; deny ingress from public networks.
- No PII in metric labels (enforce in bridge + app SDK).

---

## 6. Health probes (K8s)

```yaml
livenessProbe:
  httpGet:
    path: /extensions/prometheus/health
    port: metrics
readinessProbe:
  httpGet:
    path: /extensions/prometheus/health
    port: metrics
```

---

## 7. Files to create

| Path | Notes |
| ---- | ----- |
| `apps/extension-prometheus/package.json` | workspace member |
| Root `package.json` workspaces entry | |
| `apps/extension-prometheus/src/server.ts` | |
| `infra/docker/local/extensions/prometheus/Dockerfile` | local build |
| `infra/docker/local/extensions/prometheus/docker-compose.yml` | profile service |
| `makefiles/local/Makefile.local.extensions.mk` | optional `local_build_extension_prometheus` |

---

## 8. Verification

```bash
./scripts/nix/with-env npm run build -w @podverse/extension-prometheus
docker build -f infra/docker/local/extensions/prometheus/Dockerfile -t podverse-extension-prometheus:dev .
docker run --rm -p 9464:9464 -p 4318:4318 \
  -e EXT_PROMETHEUS_METRICS_PORT=9464 \
  podverse-extension-prometheus:dev
curl -s localhost:9464/extensions/prometheus/health
curl -s localhost:9464/extensions/prometheus/metrics | head
```

Send test OTLP payload from SDK integration test or `otelcol` debug tool.

---

## 9. Acceptance checklist

- [ ] Image builds in CI/local
- [ ] Metrics endpoint returns valid Prometheus text
- [ ] OTLP received from localhost results in new series on scrape
- [ ] Image size and startup time acceptable (<30s cold start)
- [ ] Documented in PUBLISH.md
