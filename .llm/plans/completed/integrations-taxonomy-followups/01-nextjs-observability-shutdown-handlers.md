# Plan 01 — Next.js observability shutdown handlers

## Objective

Parity with API/workers: **flush OTLP traces** on pod termination for `apps/web` and `apps/management-web`.

Depends on: completed [11-trace-export-and-sidecar-pipeline.md](../completed/integrations-web-extension-taxonomy/11-trace-export-and-sidecar-pipeline.md)

## Problem

Today:

- [`apps/web/instrumentation.ts`](../../../apps/web/instrumentation.ts) and [`apps/management-web/instrumentation.ts`](../../../apps/management-web/instrumentation.ts) call `initObservability()`.
- [`registerWebExtensionShutdownHandlers`](../../../apps/web/src/lib/extensions/bootstrapWebExtensions.ts) / management-web mirror only register when `PROMETHEUS_ENABLED=true` and only call `shutdownExtensions()` — **not** `shutdownObservability()`.
- [`apps/workers/src/index.ts`](../../../apps/workers/src/index.ts) always registers `shutdownObservability()` on SIGTERM/SIGINT (reference pattern).

## Non-goals

- Changing extension-metrics shutdown behavior beyond composing with observability shutdown
- Sidecar or runtime-config changes

---

## 1. Shared shutdown helper (per app)

Add `registerWebObservabilityShutdownHandlers()` in each app (or one shared pattern in bootstrap file next to extension handlers):

```typescript
import { shutdownObservability } from '@podverse/observability';

export const registerWebObservabilityShutdownHandlers = (): void => {
  const runShutdown = async (): Promise<void> => {
    await shutdownObservability();
  };
  process.on('SIGTERM', () => { void runShutdown(); });
  process.on('SIGINT', () => { void runShutdown(); });
};
```

Register **always** after `initObservability()` (observability is always on; export mode is internal to the package).

---

## 2. Compose with extension shutdown

When `PROMETHEUS_ENABLED=true`, a single SIGTERM handler should:

1. `await shutdownExtensions()`
2. `await shutdownObservability()`

Avoid duplicate `process.on('SIGTERM')` listeners that race — refactor `registerWebExtensionShutdownHandlers` to call a shared `runGracefulShutdown()` or merge into one registrar invoked from `instrumentation.ts`.

Order suggestion: extensions first (metrics meter provider), then observability (trace provider) — both share OTLP endpoint but separate providers.

---

## 3. instrumentation.ts

Both apps:

```typescript
initObservability(...);
registerNextHttpServerInstrumentation();
registerWebObservabilityShutdownHandlers(); // or combined registrar
bootstrapWebExtensions();
registerWebExtensionShutdownHandlers(); // only if not merged above
```

---

## 4. Tests

Add unit tests in each app (or observability integration test) asserting shutdown registrar is invoked / `shutdownObservability` is callable:

- Mock `process.on` and verify SIGTERM registration when instrumentation bootstrap runs, **or**
- Test the exported `runGracefulShutdown` helper directly.

Minimum: one test per app bootstrap module.

---

## 5. Verification

```bash
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run build -w apps/management-web
./scripts/nix/with-env npm run test -w @podverse/observability
```

Manual (optional): `OTEL_TRACES_EXPORT=otlp` + extensions profile; send SIGTERM to Next process; confirm no error and sidecar debug logs show span batch (when `OTEL_TRACES_EXPORTER_MODE=debug`).

---

## Acceptance checklist

- [ ] `shutdownObservability()` runs on SIGTERM/SIGINT for web and management-web
- [ ] Extension shutdown still runs when `PROMETHEUS_ENABLED=true`
- [ ] No duplicate conflicting signal handlers
- [ ] Builds pass
