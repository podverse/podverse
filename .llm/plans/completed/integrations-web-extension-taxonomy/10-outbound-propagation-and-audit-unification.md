# Plan 10 — Outbound propagation and audit unification

## Objective

Propagate W3C trace context on outbound HTTP; unify management-api audit **`request_id`** with OTEL **`trace_id`**.

Depends on: [09-app-wiring-and-log-correlation.md](./09-app-wiring-and-log-correlation.md)

## Non-goals

- MQ envelope (plan 12)
- OTLP export (plan 11)

---

## 1. Outbound HTTP — `fetchWithTimeout`

Update [`packages/helpers-backend/src/fetchWithTimeout.ts`](../../../packages/helpers-backend/src/fetchWithTimeout.ts):

- Call `injectTraceContext(headers)` from `@podverse/observability` before `fetch`
- Optional client span (method + host)

Unit test: `traceparent` present when active span exists.

---

## 2. `@podverse/helpers-requests`

Ensure server-side paths use propagation-capable fetch wrapper.

---

## 3. Management-api audit `request_id`

Replace duplicated `getRequestId()` in database/feeds/product routes with shared
`apps/management-api/src/lib/getAuditRequestId.ts` preferring `getActiveTraceId()`.

---

## 4. Response headers

Observability middleware: set `traceparent` / optional `X-Trace-Id` on responses. Skip health paths (mirror extension-metrics skip list).

---

## 5. Verification

```bash
./scripts/nix/with-env npm run test -w @podverse/helpers-backend
./scripts/nix/with-env npm run test:e2e:api
./scripts/nix/with-env npm run test -w apps/management-api
```

---

## Acceptance checklist

- [ ] Outbound fetch injects W3C headers
- [ ] Shared audit request id helper
- [ ] Add-by-RSS domain `requestId` unchanged
