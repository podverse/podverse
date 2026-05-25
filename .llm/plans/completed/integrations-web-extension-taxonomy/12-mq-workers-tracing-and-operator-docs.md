# Plan 12 — MQ workers tracing and operator docs

## Objective

Continue trace context through **MQ → workers**; finalize [`docs/operations/TRACING.md`](../../../docs/operations/TRACING.md).

Depends on: [11-trace-export-and-sidecar-pipeline.md](./11-trace-export-and-sidecar-pipeline.md)

## Non-goals

- CronJob worker tracing
- Prometheus exemplars

---

## 1. MQ trace envelope

Extend [`packages/mq`](../../../packages/mq):

- Optional `traceContext?: { traceparent: string; tracestate?: string }` on envelope
- Publishers attach via `@podverse/observability`
- Workers extract and start consumer span

**Do not** replace Add-by-RSS `requestId`.

---

## 2. Worker spans

[`apps/workers/src/index.ts`](../../../apps/workers/src/index.ts):

- MQ commands: span per message
- Long-running: child span under process root

Coordinate with [`recordWorkerCommand`](../../../packages/extension-metrics-sdk/src/worker/commandTiming.ts) — **spans and metrics are complementary**.

---

## 3. Operator documentation — TRACING.md

Finalize [`docs/operations/TRACING.md`](../../../docs/operations/TRACING.md):

1. Three-pillar overview (Observability vs Integrations vs Extensions)
2. Core (always on) — W3C, log fields, `OTEL_SERVICE_NAME`
3. Export — `OTEL_TRACES_EXPORT`, sampling
4. Sidecar — traces pipeline, shared `:4318` with metrics
5. Backend examples — Tempo, Jaeger OTLP (documentation only; no external GitOps manifests in this plan set)
6. Local dev — default `none`; enable otlp + `make local_extensions_prometheus_up`
7. Links — EXTENSIONS-SIDECAR.md, INTEGRATIONS-WEB.md, PROMETHEUS-METRICS-ENDPOINTS.md, EXTENSIONS-ROLLOUT-CHECKLIST.md
8. Package table — `@podverse/observability`, `@podverse/extension-metrics-sdk`, `@podverse/integrations-web`

Update [`docs/QUICKSTART.md`](../../../docs/QUICKSTART.md) with one-line pointer if appropriate.

---

## 4. Verification

```bash
./scripts/nix/with-env npm run test -w apps/workers
./scripts/nix/with-env npm run test -w packages/mq
```

Manual: API action → MQ → worker logs share `trace_id`.

---

## Acceptance checklist

- [ ] MQ carries trace context when publisher has active span
- [ ] TRACING.md complete and linked from DOCS-OPERATIONS
- [ ] Worker spans + extension-metrics command timing coexist
