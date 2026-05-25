# Platform taxonomy — Extensions, integrations, observability

Created: 2026-05-21  
Updated: 2026-05-23 (Podverse-only scope; merged distributed tracing + extension-metrics-sdk rename)  
Scope: Podverse monorepo — commit-ready code, env templates, K8s manifests, local Docker, docs, and tests.

## Goal

Deliver a **merge-ready Podverse branch** that:

1. **Taxonomy** — Extensions (sidecar) vs Integrations (built-in) vs Observability (always-on tracing).
2. **Cloudflare Web Analytics** — First integration via `@podverse/integrations-web`.
3. **Distributed tracing** — W3C trace context, log `trace_id`, optional OTLP export via `@podverse/observability`.
4. **Metrics client rename** — `@podverse/extension-sdk` → `@podverse/extension-metrics-sdk`.
5. **Env cleanup** — No `EXT_*` prefix; section order: **Observability → Integrations → Extensions**.
6. **Deploy readiness** — K8s base/alpha manifests build with `kustomize`; local Docker extensions profile works; a future GitOps repo can enable sidecars by uncommenting alpha components.

**Not in scope:** deploying to any cluster, external GitOps repos, Argo sync, or GHCR publish.

## Locked decisions

| Pillar | Ships in | Gated? | Config | Env subsection | K8s ConfigMap |
| ------ | -------- | ------ | ------ | -------------- | ------------- |
| **Observability** | Default image | Trace context always on; export via `OTEL_TRACES_EXPORT` | `config.observability.*` | Observability (first) | Per-app source env |
| **Integration** | Default image | Per integration | `config.integrations.<vendor>.<product>` | Integrations | `podverse-integrations-config` (runtime-config sidecar only) |
| **Extension** | Sidecar + metrics client | `PROMETHEUS_ENABLED` | `config.extensions.*` | Extensions (last) | `podverse-extensions-config` |

| Package | Role |
| ------- | ---- |
| `@podverse/observability` | W3C tracing, log correlation, optional OTLP trace export |
| `@podverse/integrations-web` | Built-in web/management-web integrations (Cloudflare first) |
| `@podverse/extension-metrics-sdk` | Optional OTEL **metrics** export to extension sidecar (renamed from `extension-sdk`) |
| `extensions/prometheus/` | Sidecar: OTLP ingest, Prometheus scrape, optional traces forward |

**Do not** merge tracing into `extension-metrics-sdk`. **Do not** use `config.extensions.tracing` or `EXT_TRACING_*`.

**Future umbrella `@podverse/extension-sdk`:** deferred until a second sidecar client shares bootstrap code.

## Plan set files

| File | Focus |
| ---- | ----- |
| [01-docs-skills-and-taxonomy.md](./01-docs-skills-and-taxonomy.md) | Ops docs + skills (three pillars) |
| [02-ext-env-rename.md](./02-ext-env-rename.md) | `EXT_*` removal + `extension-metrics-sdk` rename |
| [03-k8s-integrations-config.md](./03-k8s-integrations-config.md) | `podverse-integrations-config` |
| [04-integrations-web-package-and-cloudflare.md](./04-integrations-web-package-and-cloudflare.md) | `@podverse/integrations-web` |
| [05-runtime-config-wiring.md](./05-runtime-config-wiring.md) | Runtime-config + layouts |
| [06-env-templates-and-local.md](./06-env-templates-and-local.md) | Env templates |
| [08-observability-package-and-env-contract.md](./08-observability-package-and-env-contract.md) | `@podverse/observability` |
| [09-app-wiring-and-log-correlation.md](./09-app-wiring-and-log-correlation.md) | `initObservability` + logs |
| [10-outbound-propagation-and-audit-unification.md](./10-outbound-propagation-and-audit-unification.md) | `traceparent`, audit ids |
| [11-trace-export-and-sidecar-pipeline.md](./11-trace-export-and-sidecar-pipeline.md) | OTLP trace export + sidecar |
| [12-mq-workers-tracing-and-operator-docs.md](./12-mq-workers-tracing-and-operator-docs.md) | MQ trace envelope + TRACING.md |
| [13-tests-and-verification.md](./13-tests-and-verification.md) | Final tests (integrations + observability) |

Execute via [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) and [COPY-PASTA.md](./COPY-PASTA.md).

## Prerequisites

- Completed [extensions-prometheus-sidecar](../completed/extensions-prometheus-sidecar/) implementation in tree: `extensions/prometheus/` sidecar, local compose profile, K8s base bundles (OTLP receiver on `:4318`).

## Out of scope

- k.podcastdj.com or any external GitOps repo
- Argo CD sync, GHCR publish, cluster smoke, operator cutover
- Production Cloudflare token enablement
- `@podverse/integrations-backend`
- CronJob worker trace export
- Browser RUM
- Future umbrella `@podverse/extension-sdk`

## Success criteria

1. Docs/skills describe three pillars; env section order documented; Podverse-repo enablement path documented (`infra/k8s/alpha` commented components, `make local_extensions_prometheus_up`).
2. No `EXT_PROMETHEUS_*` / `EXT_OTEL_*` in source; package is `@podverse/extension-metrics-sdk`.
3. `podverse-integrations-config` builds; runtime-config serves `integrations.cloudflare.webAnalytics`.
4. All workloads call `initObservability`; logs include `trace_id` with `OTEL_TRACES_EXPORT=none`.
5. Optional: `OTEL_TRACES_EXPORT=otlp` exports spans through in-repo sidecar traces pipeline (local Docker verify).
6. `kustomize build` gates pass for alpha common/web/management-web.
7. Cloudflare E2E + observability unit/API tests pass.
