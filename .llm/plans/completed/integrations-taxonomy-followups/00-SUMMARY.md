# Integrations / observability taxonomy — follow-ups

Created: 2026-05-23  
Scope: Podverse monorepo only.

## Context

Post-review of completed plan set [integrations-web-extension-taxonomy](../completed/integrations-web-extension-taxonomy/). All 15 files (plans 01–13 + index docs) are in `completed/`; no active copy remains. `distributed-tracing/` active folder is absent (merged into plans 08–12).

## Why this follow-up set exists

The taxonomy rollout is **merge-ready** for its stated scope. One **production-relevant gap** remains:

**Next.js apps (`web`, `management-web`) call `initObservability()` but never `shutdownObservability()` on SIGTERM/SIGINT.** Extension shutdown handlers only run when `PROMETHEUS_ENABLED=true` and only call `shutdownExtensions()` — not trace flush. API, management-api, and workers all flush traces on shutdown (workers always; Express apps in `index.ts`).

Impact: with `OTEL_TRACES_EXPORT=otlp`, Kubernetes pod termination can drop the last OTLP trace batch for Next workloads. This undermines plan 11 acceptance (“flush on `shutdownObservability()`”).

## Non-goals

- Re-opening completed taxonomy plans
- External GitOps / cluster deploy
- New features beyond shutdown parity and optional test hardening

## Plan files

| File | Focus |
| ---- | ----- |
| [01-nextjs-observability-shutdown-handlers.md](./01-nextjs-observability-shutdown-handlers.md) | Register observability shutdown on web + management-web |
| [02-test-parity-and-e2e-dx.md](./02-test-parity-and-e2e-dx.md) | Optional: web runtime-config tests, Cloudflare enabled E2E scripts, lockfile hygiene |

Execute via [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) and [COPY-PASTA.md](./COPY-PASTA.md).

## Review notes (no plan required)

These were checked and are **not** blocking:

- `EXT_*` / `@podverse/extension-sdk` absent from source (lockfile has extraneous stale `packages/extension-sdk` entry — fix in plan 02 or next `npm install`)
- K8s `podverse-integrations-config` wired in alpha/common
- MQ trace envelope, TRACING.md, Cloudflare E2E (disabled path), unit tests for observability/helpers-backend/management-api audit
- API trace response headers covered at package unit level (`@podverse/observability`); no dedicated API integration test (acceptable for v1)
