# Plan 11 — Trace export and sidecar pipeline

## Objective

Enable OTLP **trace export** when `OTEL_TRACES_EXPORT=otlp` and add a **traces pipeline** to `extensions/prometheus` sidecar.

Depends on: [10-outbound-propagation-and-audit-unification.md](./10-outbound-propagation-and-audit-unification.md)

**Prerequisite:** In-repo `extensions/prometheus/` OTLP receiver on `:4318` from completed [extensions-prometheus-sidecar](../../completed/extensions-prometheus-sidecar/) work — no cluster deploy required.

## Non-goals

- Deploying Tempo/Jaeger in any cluster (documented as backend examples in TRACING.md only)
- Metrics pipeline changes in `@podverse/extension-metrics-sdk`

---

## 1. App-side OTLP export

[`packages/observability/src/otel/tracerProvider.ts`](../../../packages/observability/src/otel/tracerProvider.ts):

- When `tracesExport === 'otlp'`, register OTLP HTTP exporter
- Endpoint: `OTEL_EXPORTER_OTLP_ENDPOINT` (often `http://127.0.0.1:4318`)
- Flush on `shutdownObservability()`

`OTEL_TRACES_EXPORT=none` — no network.

---

## 2. Sidecar traces pipeline

Update [`extensions/prometheus/src/otelcolConfig.ts`](../../../extensions/prometheus/src/otelcolConfig.ts) — traces pipeline alongside metrics.

Extend [`extensions/prometheus/src/config.ts`](../../../extensions/prometheus/src/config.ts):

| Env var | Purpose |
| ------- | ------- |
| `OTEL_TRACES_EXPORTER_OTLP_ENDPOINT` | Forward to Tempo/Jaeger/vendor |
| `OTEL_TRACES_EXPORTER_OTLP_HEADERS` | Optional auth |
| `OTEL_TRACES_EXPORTER_MODE` | `debug` \| `otlp` \| `none` |

Document in **Extensions** subsection of [`infra/k8s/base/extensions/source/extensions.env`](../../../infra/k8s/base/extensions/source/extensions.env) (sidecar-only keys; no `EXT_` prefix).

When both metrics extension and trace export enabled, apps share `http://127.0.0.1:4318`.

---

## 3. Local smoke scripts

**Extensions metrics (sidecar health + scrape endpoint):**

```bash
make local_extensions_prometheus_up
./scripts/development/extensions/verify-extension-prometheus-local.sh
```

Requires Docker for the compose profile. Full OTLP→scrape automation (`verify-extension-prometheus-otlp-smoke.sh`) remains **optional** — document in [`infra/docker/local/extensions/README.md`](../../../infra/docker/local/extensions/README.md) if added later.

**Trace export:**

Add `scripts/development/observability/verify-trace-otlp-local.sh` — run with `OTEL_TRACES_EXPORT=otlp` + extensions profile.

---

## 4. Verification

```bash
./scripts/nix/with-env npm run test -w @podverse/observability
./scripts/nix/with-env npm run test -w @podverse/extension-prometheus
make local_extensions_prometheus_up
./scripts/development/extensions/verify-extension-prometheus-local.sh
```

Local trace path: `OTEL_TRACES_EXPORT=otlp` + extensions profile + `verify-trace-otlp-local.sh` when implemented.

---

## Acceptance checklist

- [ ] Trace export when `OTEL_TRACES_EXPORT=otlp`
- [ ] Sidecar receives traces on OTLP receiver
- [ ] Metrics pipeline unchanged
- [ ] Local extensions verify script passes with compose profile up
- [ ] Smoke scripts documented in TRACING.md
