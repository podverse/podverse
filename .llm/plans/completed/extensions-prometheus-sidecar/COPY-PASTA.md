# Extensions + Prometheus sidecar — COPY-PASTA prompts

**Status: all phases complete.** Plan set lives in `.llm/plans/completed/extensions-prometheus-sidecar/`.

## CRITICAL: Execution rules

**SEQUENTIAL PHASES** — complete each phase before the next:

- Phase 1 → **WAIT** → Phase 2 → **WAIT** → Phase 3 (parallel) → **WAIT** → Phase 4 → **WAIT** → Phase 5

**DO NOT** run phases simultaneously.

**Phase 3** may use up to **3 agents** in parallel (workers / APIs / web).

---

## Phase 1 — Foundation (1 agent, sequential steps) ✅

### Step 1.1 — Extension contract ✅

```
Read and execute .llm/plans/completed/extensions-prometheus-sidecar/01-extension-runtime-contract.md

Create docs/operations/extensions/EXTENSIONS.md and env templates per plan. Do not edit the Cursor plan file at .cursor/plans/.

Verify: EXTENSIONS.md documents OTEL + sidecar paths; extensions.env.example exists.
```

### Step 1.2 — OTEL SDK package ✅

```
Read and execute .llm/plans/completed/extensions-prometheus-sidecar/03-otel-app-sdk-and-adapters.md

Implement @podverse/extension-sdk only (no prom-client). Stop after package scaffold + unit tests unless plan 02 sidecar is required for integration.

Verify: ./scripts/nix/with-env npm run test -w @podverse/extension-sdk
```

### Step 1.3 — Prometheus extension sidecar image ✅

```
Read and execute .llm/plans/completed/extensions-prometheus-sidecar/02-prometheus-extension-sidecar-image.md

Implement apps/extension-prometheus and local Dockerfile. Do not edit the Cursor plan file.

Verify: docker build + curl health and metrics endpoints on localhost:9464
```

---

## Phase 2 — K8s platform ✅

```
Read and execute .llm/plans/completed/extensions-prometheus-sidecar/04-k8s-shared-extension-config-and-wiring.md

Add infra/k8s/base/extensions and alpha/common wiring. Do not edit the Cursor plan file.

Verify: kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/common/
```

---

## Phase 3 — App integrations (3 agents in parallel) ✅

### Agent 3A — Workers ✅

```
Read and execute .llm/plans/completed/extensions-prometheus-sidecar/05-workers-longrunning-extension-wiring.md

Long-running Deployments only; no CronJobs. Use @podverse/extension-sdk.

Verify: ./scripts/nix/with-env npm run build -w apps/workers
```

### Agent 3B — APIs ✅

```
Read and execute .llm/plans/completed/extensions-prometheus-sidecar/07-api-and-management-api-extension-wiring.md

Remove prom-client from api and management-api; sidecar-only scrape with hard cutover (no app-path alias).

Verify: ./scripts/nix/with-env npm run test:e2e:api && ./scripts/nix/with-env npm ls prom-client -w apps/api
```

### Agent 3C — Web apps ✅

```
Read and execute .llm/plans/completed/extensions-prometheus-sidecar/06-web-and-management-web-extension-wiring.md

Use server-instrumentation-primary approach and do not add prom-client to runtime-config sidecars.

Verify: ./scripts/nix/with-env npm run build -w apps/web && ./scripts/nix/with-env npm run build -w apps/management-web
```

**WAIT for all three agents before Phase 4.**

---

## Phase 4 — Local Docker (1 agent) ✅

```
Read and execute .llm/plans/completed/extensions-prometheus-sidecar/08-local-docker-compose-extension-profiles.md

Add Compose profiles extensions and extensions-prometheus. Update QUICKSTART.

Verify: make local_extensions_prometheus_up && curl -fsS http://127.0.0.1:9464/extensions/prometheus/health
```

---

## Phase 5 — Rollout and cleanup (1 agent) ✅

```
Read and execute .llm/plans/completed/extensions-prometheus-sidecar/09-testing-and-rollout-strategy.md

Complete tests, doc updates, legacy removal, and rollout checklist.

Verify: ./scripts/nix/with-env npm run lint && ./scripts/nix/with-env npm run test:unit
```

---

## After all phases ✅

- [x] All numbered plan files moved from `.llm/plans/active/extensions-prometheus-sidecar/` to `.llm/plans/completed/extensions-prometheus-sidecar/`
- [x] COPY-PASTA checkboxes updated (this file)
- [ ] **You:** Push `infra/k8s/` (and related extension image pins) to the Argo CD–tracked branch (e.g. `develop`) so clusters can sync. Enable sidecar Kustomize components per workload when ready — see [docs/operations/extensions/EXTENSIONS-ROLLOUT-CHECKLIST.md](../../../docs/operations/extensions/EXTENSIONS-ROLLOUT-CHECKLIST.md).
