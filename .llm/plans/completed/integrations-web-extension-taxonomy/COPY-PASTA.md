# Platform taxonomy — COPY-PASTA prompts

**Plan set:** `.llm/plans/active/integrations-web-extension-taxonomy/`

## CRITICAL: Execution rules

**SEQUENTIAL PHASES** — complete each phase before the next (see [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md)).

**Podverse repo only** — no external GitOps, Argo, or cluster deploy steps in this plan set.

After each completed prompt: mark ✅ below; move completed plan file to `.llm/plans/completed/integrations-web-extension-taxonomy/` per plan-completion skill.

**Do not** edit Cursor plan files under `.cursor/plans/`.

---

## Phase 1 — Docs and skills

### Step 1.1 ✅

```
Read and execute .llm/plans/active/integrations-web-extension-taxonomy/01-docs-skills-and-taxonomy.md

Three-pillar ops docs; TRACING.md stub; skills/rules. No app code.

Verify: INTEGRATIONS-WEB.md, EXTENSIONS-SIDECAR.md, TRACING.md exist; DOCS-OPERATIONS index updated.
```

---

## Phase 2 — EXT_* removal + extension-metrics-sdk rename

### Step 2.1 ✅

```
Read and execute .llm/plans/active/integrations-web-extension-taxonomy/02-ext-env-rename.md

Rename EXT_* env keys; git mv packages/extension-sdk → packages/extension-metrics-sdk; update all importers.

Verify:
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run test -w @podverse/extension-metrics-sdk
rg 'EXT_PROMETHEUS|EXT_OTEL_|@podverse/extension-sdk' --glob '!package-lock.json' --glob '!.llm/history/**'
```

---

## Phase 3 — K8s integrations ConfigMap

### Step 3.1 ✅

```
Read and execute .llm/plans/active/integrations-web-extension-taxonomy/03-k8s-integrations-config.md

Verify: kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/common/
```

---

## Phase 4 — Integrations (Cloudflare)

### Step 4.1 ✅

```
Read and execute .llm/plans/active/integrations-web-extension-taxonomy/04-integrations-web-package-and-cloudflare.md

Verify: ./scripts/nix/with-env npm run test -w @podverse/integrations-web
```

### Step 4.2 ✅

```
Read and execute .llm/plans/active/integrations-web-extension-taxonomy/05-runtime-config-wiring.md

Verify: ./scripts/nix/with-env npm run build -w @podverse/web-sidecar && npm run build -w @podverse/web
```

### Step 4.3 ✅

```
Read and execute .llm/plans/active/integrations-web-extension-taxonomy/06-env-templates-and-local.md
```

---

## Phase 5 — Observability package

### Step 5.1 ✅

```
Read and execute .llm/plans/active/integrations-web-extension-taxonomy/08-observability-package-and-env-contract.md

Verify:
./scripts/nix/with-env npm run build -w @podverse/observability
./scripts/nix/with-env npm run test -w @podverse/observability
```

---

## Phase 6 — App wiring + logs

### Step 6.1 ✅

```
Read and execute .llm/plans/active/integrations-web-extension-taxonomy/09-app-wiring-and-log-correlation.md

Verify: ./scripts/nix/with-env npm run test:e2e:api
Manual: API log line contains trace_id with OTEL_TRACES_EXPORT=none
```

---

## Phase 7 — Outbound propagation

### Step 7.1 ✅

```
Read and execute .llm/plans/active/integrations-web-extension-taxonomy/10-outbound-propagation-and-audit-unification.md

Verify: ./scripts/nix/with-env npm run test -w @podverse/helpers-backend
```

---

## Phase 8 — Trace export + sidecar pipeline

### Step 8.1 ✅

```
Read and execute .llm/plans/active/integrations-web-extension-taxonomy/11-trace-export-and-sidecar-pipeline.md

Prerequisite: Phase 7 complete; in-repo extensions/prometheus/ sidecar (OTLP :4318).

Verify:
./scripts/nix/with-env npm run test -w @podverse/extension-prometheus
make local_extensions_prometheus_up
./scripts/development/extensions/verify-extension-prometheus-local.sh
```

---

## Phase 9 — MQ + TRACING.md

### Step 9.1 ✅

```
Read and execute .llm/plans/active/integrations-web-extension-taxonomy/12-mq-workers-tracing-and-operator-docs.md

Verify: ./scripts/nix/with-env npm run test -w apps/workers
```

---

## Phase 10 — Final verification

### Step 10.1 ✅

```
Read and execute .llm/plans/active/integrations-web-extension-taxonomy/13-tests-and-verification.md

Verify:
./scripts/nix/with-env npm run lint && npm run test:unit
make local_extensions_prometheus_up
./scripts/development/extensions/verify-extension-prometheus-local.sh
```

User E2E:

```bash
make e2e_test_web_report_spec SPEC=e2e/cloudflare-web-analytics-integration.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/cloudflare-web-analytics-integration.spec.ts
```

---

## Completion checklist

- [x] 01-docs-skills-and-taxonomy.md
- [x] 02-ext-env-rename.md
- [x] 03-k8s-integrations-config.md
- [x] 04-integrations-web-package-and-cloudflare.md
- [x] 05-runtime-config-wiring.md
- [x] 06-env-templates-and-local.md
- [x] 08-observability-package-and-env-contract.md
- [x] 09-app-wiring-and-log-correlation.md
- [x] 10-outbound-propagation-and-audit-unification.md
- [x] 11-trace-export-and-sidecar-pipeline.md
- [x] 12-mq-workers-tracing-and-operator-docs.md
- [x] 13-tests-and-verification.md

When all checked, move plan directory to `.llm/plans/completed/integrations-web-extension-taxonomy/`.

**Merged:** content from `.llm/plans/active/distributed-tracing/` lives in plans 08–12; that folder is removed (no separate active tracing plan set).
