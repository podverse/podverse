# Distributed tracing and observability

**Observability** is always-on **in-process** tracing: W3C trace context, spans, and `trace_id` /
`span_id` in logs. Configuration uses `config.observability.*` only.

Platform overview: [DOCS-OPERATIONS-PLATFORM.md](../platform/DOCS-OPERATIONS-PLATFORM.md).

## Package roles

| Package                           | Role                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `@podverse/observability`         | Tracer init, W3C propagation, HTTP middleware, worker spans, OTLP export                    |
| `@podverse/extension-metrics-sdk` | Prometheus metrics and worker command timing (complements spans)                            |
| `@podverse/integrations-web`      | Built-in web integrations                                                                   |
| `@podverse/mq`                    | Optional `traceContext` envelope on MQ messages; consumer spans in `ActiveMQArtemisService` |

## Environment variables (Observability)

| Variable                      | Required    | Notes                                                                       |
| ----------------------------- | ----------- | --------------------------------------------------------------------------- |
| `OTEL_SERVICE_NAME`           | Yes         | Shared identity; also used by `config.extensions.otel` when metrics enabled |
| `OTEL_TRACES_EXPORT`          | Yes         | `none` (default local) or `otlp`                                            |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | When `otlp` | Same `:4318` sidecar port as metrics when using extension sidecar           |
| `OTEL_TRACES_SAMPLER`         | Optional    | e.g. `parentbased_traceidratio`, `always_on`                                |
| `OTEL_TRACES_SAMPLER_ARG`     | Optional    | Ratio for `traceidratio` samplers (0.0–1.0)                                 |

Template: [infra/config/env-templates/observability.env.example](../../../infra/config/env-templates/observability.env.example).

Default local: `OTEL_TRACES_EXPORT=none` — spans exist in-process and in logs; no OTLP network traffic.

## Core behavior (always on)

- W3C `traceparent` / `tracestate` on inbound HTTP and outbound `fetchWithTimeout` / shared request helpers
- Express and Next.js HTTP server instrumentation
- Log correlation: `trace_id`, `span_id` on JSON logs via `@podverse/helpers-backend`
- API responses may include `traceparent` and `X-Trace-Id` when observability middleware is active
- MQ → worker: optional `traceContext` on message JSON; consumer span per message in `@podverse/mq`
- Add-by-RSS keeps its existing `requestId` field; trace context is additive

## MQ and workers

Publishers call `attachMqTraceContext` in `ActiveMQArtemisService.sendMessage` when a span is active.
Consumers run each message handler inside `withMqConsumerSpan`, linking to the publisher trace when
`traceContext` is present.

Worker CLI commands are wrapped in a process root span via `withWorkerSpan` in
`apps/workers/src/index.ts`. MQ consumer spans are children of the linked publisher trace (or standalone
when no envelope is present). Extension-metrics `recordWorkerCommand` timing runs alongside spans.

## OTLP trace export

When `OTEL_TRACES_EXPORT=otlp`, apps export spans to the in-repo extension sidecar OTLP receiver
(`extensions/prometheus/`, port `4318`). The sidecar may forward traces to a backend (Tempo,
Jaeger, vendor OTLP) via sidecar-only `OTEL_TRACES_EXPORTER_*` env vars.

### Sampling

Configure via `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG`. Parent-based samplers respect
upstream `traceparent` (useful for always tracing requests that already carry a trace). Ratio
samplers reduce export volume in production. Local dev typically leaves sampling unset or uses
`always_on` with `OTEL_TRACES_EXPORT=none`.

## Sidecar traces pipeline

Metrics and traces can share `http://127.0.0.1:4318` when both `PROMETHEUS_ENABLED` and
`OTEL_TRACES_EXPORT=otlp` are set. See [EXTENSIONS-SIDECAR.md](../extensions/EXTENSIONS-SIDECAR.md).

Sidecar-only env (not app env):

- `OTEL_TRACES_EXPORTER_MODE` — `none`, `debug` (log spans locally), or `otlp` (forward)
- `OTEL_TRACES_EXPORTER_OTLP_ENDPOINT` — backend URL when mode is `otlp`

## Backend examples (documentation only)

Operators may forward sidecar OTLP to:

- Grafana Tempo (`OTEL_TRACES_EXPORTER_OTLP_ENDPOINT`)
- Jaeger OTLP HTTP ingest
- Any OTLP-compatible vendor

Manifests for those backends live in **your GitOps repo**, not in the Podverse monorepo.

## Local development

```bash
# Default: no export
OTEL_TRACES_EXPORT=none

# Optional: export to extension sidecar OTLP receiver (:4318)
make local_extensions_prometheus_up
# App env: OTEL_TRACES_EXPORT=otlp and OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
# Sidecar env (infra/config/local/extension-sidecar-otel.env): OTEL_TRACES_EXPORTER_MODE=debug (local logs)
./scripts/development/extensions/verify-extension-prometheus-local.sh
./scripts/development/observability/verify-trace-otlp-local.sh
```

When both `PROMETHEUS_ENABLED=true` (metrics) and `OTEL_TRACES_EXPORT=otlp` (traces) are set, apps
share `http://127.0.0.1:4318` for OTLP HTTP. The sidecar metrics pipeline is unchanged; traces use
a separate collector pipeline controlled by sidecar-only `OTEL_TRACES_EXPORTER_*` env vars.

Manual check: trigger an API action that enqueues MQ work; API, publisher, and worker logs should
share the same `trace_id` when export is enabled or when inspecting in-process span context.

## Related docs

- [DOCS-OPERATIONS-PLATFORM.md](../platform/DOCS-OPERATIONS-PLATFORM.md) — platform capabilities index
- [EXTENSIONS-SIDECAR.md](../extensions/EXTENSIONS-SIDECAR.md) — metrics and OTLP sidecar
- [INTEGRATIONS-WEB.md](../integrations/INTEGRATIONS-WEB.md) — built-in web integrations
- [PROMETHEUS-METRICS-ENDPOINTS.md](../extensions/PROMETHEUS-METRICS-ENDPOINTS.md)
- `.cursor/skills/observability/SKILL.md` — authoring rules
