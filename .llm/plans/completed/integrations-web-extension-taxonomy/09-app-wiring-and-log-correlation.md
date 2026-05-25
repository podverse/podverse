# Plan 09 — App wiring and log correlation

## Objective

Wire **`initObservability()`** into all workloads; inject **`trace_id` / `span_id`** into logs. Migrate **management-api** critical paths to **`LoggerService`**.

Depends on: [08-observability-package-and-env-contract.md](./08-observability-package-and-env-contract.md)

## Non-goals

- Outbound propagation (plan 10)
- OTLP export (plan 11)
- MQ envelope (plan 12)

---

## 1. Logger correlation (`@podverse/helpers-backend`)

Update [`packages/helpers-backend/src/logger.ts`](../../../packages/helpers-backend/src/logger.ts):

- Winston format reads `getActiveTraceId()` / `getActiveSpanId()` from `@podverse/observability`
- JSON logs: `trace_id`, `span_id`, `service.name`

`helpers-backend` depends on `@podverse/observability` for context reads only.

---

## 2. API (`apps/api`)

| Change | Location |
| ------ | -------- |
| `initObservability` | [`apps/api/src/index.ts`](../../../apps/api/src/index.ts) after validation |
| `shutdownObservability` | SIGTERM alongside `shutdownExtensions` |
| HTTP middleware | [`apps/api/src/app.ts`](../../../apps/api/src/app.ts) — **before** metrics middleware |

**Middleware order in `app.ts`:**

1. cors, body, cookies, passport
2. **`getObservabilityHttpMiddleware()`** (always)
3. `bootstrapApiExtensions(app)` — `@podverse/extension-metrics-sdk` when `PROMETHEUS_ENABLED`
4. routes

---

## 3. Management API

Same init/shutdown/middleware order as API. LoggerService factory + error handler off `console`.

---

## 4. Web + management-web

| Change | Location |
| ------ | -------- |
| `initObservability` | [`apps/web/instrumentation.ts`](../../../apps/web/instrumentation.ts) |
| Next HTTP instrumentation | `@podverse/observability` |
| OTLP shutdown handlers | See §4.1 below |

Do **not** add trace code to runtime-config sidecars.

### 4.1 Next.js OTLP shutdown handlers (verify or implement)

Without SIGTERM/SIGINT handlers, Kubernetes pod termination can drop the last OTLP metrics batch for Next apps. Api/management-api already flush via `index.ts`.

**Verify first** (typical post-implementation branch):

```bash
rg 'registerWebExtensionShutdownHandlers|registerManagementWebExtensionShutdownHandlers' apps/web apps/management-web
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run build -w apps/management-web
```

Expected locations:

- [`apps/web/src/lib/extensions/bootstrapWebExtensions.ts`](../../../apps/web/src/lib/extensions/bootstrapWebExtensions.ts) — `registerWebExtensionShutdownHandlers()`
- [`apps/management-web/src/lib/extensions/bootstrapManagementWebExtensions.ts`](../../../apps/management-web/src/lib/extensions/bootstrapManagementWebExtensions.ts) — `registerManagementWebExtensionShutdownHandlers()`
- Both [`apps/web/instrumentation.ts`](../../../apps/web/instrumentation.ts) and [`apps/management-web/instrumentation.ts`](../../../apps/management-web/instrumentation.ts) call the register helper after `bootstrap*Extensions()` when `NEXT_RUNTIME === 'nodejs'`

**Implement only if missing:**

- Register `SIGTERM` / `SIGINT` only when `PROMETHEUS_ENABLED === 'true'`
- Handler calls `shutdownExtensions()` via existing `shutdownWebExtensions` / `shutdownManagementWebExtensions`
- Do **not** call `process.exit()` in the handler

---

## 5. Workers

`initObservability` in [`apps/workers/src/index.ts`](../../../apps/workers/src/index.ts); root span before `recordWorkerCommand` from `@podverse/extension-metrics-sdk`.

---

## 6. Default local env

```bash
OTEL_SERVICE_NAME="podverse-api"
OTEL_TRACES_EXPORT="none"
```

---

## 7. Verification

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run test:unit
./scripts/nix/with-env npm run test:e2e:api
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run build -w apps/management-web
```

Manual: API request → log line contains `trace_id`.

---

## Acceptance checklist

- [ ] All five workloads init/shutdown observability
- [ ] Observability middleware before extension-metrics middleware (Express)
- [ ] Default `OTEL_TRACES_EXPORT=none` in templates
- [ ] Next.js OTLP shutdown handlers registered when `PROMETHEUS_ENABLED=true` (§4.1)
