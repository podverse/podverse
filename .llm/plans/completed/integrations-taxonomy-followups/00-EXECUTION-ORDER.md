# Execution order — Taxonomy follow-ups

Run prompts from [COPY-PASTA.md](./COPY-PASTA.md).

## Phase 1 — Observability shutdown (required)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 1.1 | [01-nextjs-observability-shutdown-handlers.md](./01-nextjs-observability-shutdown-handlers.md) | Web + management-web flush traces on SIGTERM/SIGINT |

**Gate:** Unit tests for shutdown registration; `npm run build -w apps/web` and `management-web` pass.

## Phase 2 — Test parity (optional)

| Step | Plan | Outcome |
| ---- | ---- | ------- |
| 2.1 | [02-test-parity-and-e2e-dx.md](./02-test-parity-and-e2e-dx.md) | Web runtime-config-store tests; Cloudflare enabled E2E npm scripts |

**Gate:** `npm run test:unit` includes new web store tests; enabled Cloudflare config runnable via npm script.

Phase 2 can ship after Phase 1 or be deferred.
