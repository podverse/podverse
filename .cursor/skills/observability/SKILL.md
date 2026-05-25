---
name: observability
description: Always-on tracing via @podverse/observability and config.observability.*. Use when adding trace context, log correlation, OTLP trace export, or Observability env — never config.extensions.tracing.
version: 1.0.0
---

# Observability (distributed tracing)

## When to use

- **`@podverse/observability`** package or app bootstrap (`initObservability`)
- **`config.observability.*`** in app configs
- **Observability** env subsection (`OTEL_SERVICE_NAME`, `OTEL_TRACES_EXPORT`, …)
- Log `trace_id` / `span_id` correlation
- W3C propagation on outbound HTTP or MQ

Authoritative doc: [docs/operations/observability/TRACING.md](../../docs/operations/observability/TRACING.md).

## Architecture

| Item                   | Rule                                                                     |
| ---------------------- | ------------------------------------------------------------------------ |
| Always on              | Trace context and spans in-process even when `OTEL_TRACES_EXPORT=none`   |
| Package                | `@podverse/observability`                                                |
| Config                 | `config.observability.*` only                                            |
| Not gated as extension | Do **not** use `PROMETHEUS_ENABLED` or `config.extensions.*` for tracing |

**Separate from metrics:** `@podverse/extension-metrics-sdk` exports OTEL **metrics** to the
sidecar when `PROMETHEUS_ENABLED=true`. Do not merge tracing into that package.

## Env vars (Observability subsection — first)

| Variable                      | Notes                                                                     |
| ----------------------------- | ------------------------------------------------------------------------- |
| `OTEL_SERVICE_NAME`           | Shared with `config.extensions.otel.serviceName` when metrics enabled     |
| `OTEL_TRACES_EXPORT`          | `none` or `otlp`                                                          |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Required when export is `otlp`; same `:4318` as metrics sidecar when used |
| `OTEL_TRACES_SAMPLER`         | Optional                                                                  |
| `OTEL_TRACES_SAMPLER_ARG`     | Optional                                                                  |

Template: `infra/config/env-templates/observability.env.example`.

K8s: per-workload app `source/*.env` — **not** in `extensions.env` or `integrations.env`.

## Middleware order (Express)

1. Standard middleware (cors, body, auth, …)
2. **`getObservabilityHttpMiddleware()`** — always
3. Extension metrics middleware — when `PROMETHEUS_ENABLED`

## Don't

- `config.extensions.tracing` or `EXT_TRACING_*`
- Gate W3C context behind extension toggles
- Put trace export logic in `@podverse/extension-metrics-sdk`

## References

- [extensions-env](../extensions-env/SKILL.md) — pillar order and shared `OTEL_SERVICE_NAME`
- [TRACING.md](../../docs/operations/observability/TRACING.md)
- [DOCS-OPERATIONS-PLATFORM.md](../../docs/operations/platform/DOCS-OPERATIONS-PLATFORM.md)
- [feature-implementation-testing](../feature-implementation-testing/SKILL.md)
