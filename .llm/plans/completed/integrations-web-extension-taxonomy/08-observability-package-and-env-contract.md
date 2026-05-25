# Plan 08 — Observability package and env contract

## Objective

Create **`@podverse/observability`** for in-process tracing (always on) and define **`config.observability`** + Observability env subsection. Tracing must **not** live under `config.extensions` or use extension toggles.

Depends on: [02-ext-env-rename.md](./02-ext-env-rename.md) (no `EXT_*`; `OTEL_SERVICE_NAME` in Observability section).

## Non-goals

- OTLP trace export (plan 11)
- App wiring (plan 09)
- Changes to `@podverse/extension-metrics-sdk` metrics behavior

---

## 1. Package layout

```
packages/observability/
  package.json              # @podverse/observability
  tsconfig.json
  vitest.config.ts
  src/
    index.ts
    init.ts
    config.ts
    requestContext.ts
    propagation.ts
    otel/
      tracerProvider.ts
      resource.ts
    http/
      expressMiddleware.ts
      nextHttpServerInstrumentation.ts
      types.ts
    worker/
      spanHelpers.ts
```

Add to root `build:packages` **after** `helpers`, alongside `extension-metrics-sdk`.

**Do not** depend on `@podverse/extension-metrics-sdk`.

---

## 2. Initialization contract

```typescript
import { initObservability, shutdownObservability } from '@podverse/observability';

initObservability({
  serviceName: config.observability.serviceName,
  tracesExport: config.observability.tracesExport, // 'none' | 'otlp'
  otlpEndpoint: config.observability.otlpEndpoint,
  sampler: config.observability.sampler,
  samplerArg: config.observability.samplerArg,
});
```

| `OTEL_TRACES_EXPORT` | Behavior |
| -------------------- | -------- |
| `none` | Spans + context + logs; no exporter |
| `otlp` | OTLP HTTP export (plan 11) |

Always register W3C propagator.

---

## 3. Environment variables

**Observability** section — **first** subsection in app env files (before Integrations, before Extensions).

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `OTEL_SERVICE_NAME` | Yes | Shared identity; also used by `config.extensions.otel` when metrics enabled |
| `OTEL_TRACES_EXPORT` | Yes | `none` or `otlp` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | When export=otlp | Same port as metrics OTLP when using sidecar (`:4318`) |
| `OTEL_TRACES_SAMPLER` | Optional | |
| `OTEL_TRACES_SAMPLER_ARG` | Optional | |

Template: `infra/config/env-templates/observability.env.example`

```typescript
observability: {
  serviceName: process.env.OTEL_SERVICE_NAME!,
  tracesExport: process.env.OTEL_TRACES_EXPORT!,
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  sampler: process.env.OTEL_TRACES_SAMPLER,
  samplerArg: process.env.OTEL_TRACES_SAMPLER_ARG,
},
```

Startup validation category **Observability** — **before** Integrations and Extensions.

K8s: per-workload `source/*.env`; **not** in `extensions.env` or `integrations.env`.

---

## 4. Public API

| Export | Purpose |
| ------ | ------- |
| `initObservability` / `shutdownObservability` | Bootstrap |
| `getObservabilityHttpMiddleware` | Express |
| `registerNextHttpServerInstrumentation` | Next.js |
| `getActiveTraceId` / `getActiveSpanId` | Logger + audit |
| `injectTraceContext` / `extractTraceContext` | Outbound HTTP (plan 10) |

---

## 5. Tests and verification

```bash
./scripts/nix/with-env npm run build -w @podverse/observability
./scripts/nix/with-env npm run test -w @podverse/observability
```

Docker runtime parity for api, management-api, web, workers.

---

## Acceptance checklist

- [ ] `@podverse/observability` builds; no `EXT_*` tracing keys
- [ ] `config.observability` in all five app configs + validation
- [ ] Observability section before Integrations/Extensions in `.env.example`
