# Plan 01 — Docs, skills, and taxonomy

## Objective

Document the **Extensions vs Integrations vs Observability** split and update Cursor guidance. **No runtime behavior change** in this plan.

---

## 1. Split operations docs

From [`docs/operations/extensions/EXTENSIONS.md`](../../../docs/operations/extensions/EXTENSIONS.md):

### `EXTENSIONS-SIDECAR.md` (new)

Sidecar extensions:

- Prometheus + OTEL metrics transport
- `extensions/prometheus/` source
- `@podverse/extension-metrics-sdk` (app client — not Prometheus format in-app)
- `podverse-extensions-config`
- Kustomize prometheus-sidecar component (commented in `infra/k8s/alpha` by default; enable in GitOps overlay when deploying)
- Scrape paths `/extensions/prometheus/*`
- **Extensions** env subsection; keys `PROMETHEUS_*`, metrics-path `OTEL_EXPORTER_OTLP_ENDPOINT` (see Plan 02)
- **Local dev:** `make local_extensions_prometheus_up` + `scripts/development/extensions/verify-extension-prometheus-local.sh`

### `INTEGRATIONS-WEB.md` (new)

Built-in front-end integrations:

- `@podverse/integrations-web`
- `podverse-integrations-config` (runtime-config sidecar only)
- Runtime JSON: `integrations.cloudflare.webAnalytics`
- App config: `config.integrations.cloudflare.webAnalytics`
- **Integrations** env subsection (`CLOUDFLARE_WEB_ANALYTICS_*`)

### `TRACING.md` (new stub → expanded in plan 12)

Create [`docs/operations/TRACING.md`](../../../docs/operations/TRACING.md):

- Three-pillar overview table (Observability vs Integrations vs Extensions)
- Pointer: trace context is **always on** (`@podverse/observability`); not an extension toggle
- Stub sections for export, sidecar, local dev (filled in plan 12)

### `EXTENSIONS.md` (keep as index)

| Kind | Sidecar? | Package / client | ConfigMap | Config path |
| ---- | -------- | -------------- | --------- | ----------- |
| Observability | No | `@podverse/observability` | Per-app env | `config.observability.*` |
| Integration | No | `@podverse/integrations-web` | `podverse-integrations-config` | `config.integrations.*` |
| Extension | Yes | `@podverse/extension-metrics-sdk` + sidecar image | `podverse-extensions-config` | `config.extensions.*` |

Link to `EXTENSIONS-SIDECAR.md`, `INTEGRATIONS-WEB.md`, `TRACING.md`.

Update [`docs/operations/DOCS-OPERATIONS.md`](../../../docs/operations/DOCS-OPERATIONS.md) index.

---

## 2. Package boundaries (document in all three ops docs)

| Package | Purpose | Gated? |
| ------- | ------- | ------ |
| `@podverse/observability` | W3C trace context, spans, log `trace_id`, optional OTLP **trace** export | Context always on |
| `@podverse/extension-metrics-sdk` | OTEL **metrics** to sidecar when `PROMETHEUS_ENABLED` | Yes |
| `@podverse/integrations-web` | Built-in web head scripts / runtime-config projection | Per integration |
| `extensions/prometheus/` | Sidecar server (OTLP receiver, Prometheus scrape, traces forward) | Sidecar optional |

**Do not** merge tracing into `extension-metrics-sdk`. **Deferred:** umbrella `@podverse/extension-sdk` until a second sidecar client shares code.

---

## 3. Env section order (document)

Apps with all three subsections:

1. **Observability** (first)
2. **Integrations**
3. **Extensions** (last)

Web **runtime-config sidecar** `.env.example`: Integrations + `NEXT_PUBLIC_*` (Extensions on main Next container only).

---

## 4. Skills

### Extend [`.cursor/skills/extensions-env/SKILL.md`](../../../.cursor/skills/extensions-env/SKILL.md)

- Three pillars; two ConfigMaps for integrations vs extensions
- `@podverse/extension-metrics-sdk` (rename from extension-sdk)
- No `EXT_*` prefix (Plan 02)
- `config.integrations.<vendor>.<product>` vendor nesting

### Add [`.cursor/skills/integrations-web/SKILL.md`](../../../.cursor/skills/integrations-web/SKILL.md)

- Package layout, sidecar `./config` import, E2E requirement

### Add or extend observability skill (optional)

If adding `.cursor/skills/observability/SKILL.md`: `config.observability.*`, never `config.extensions.tracing`.

---

## 5. Rules

Update [`.cursor/rules/extensions-env.mdc`](../../../.cursor/rules/extensions-env.mdc):

- Three-pillar semantics
- Extend globs: `packages/observability/**`, web/management-web sidecars, `infra/k8s/base/integrations/**`

---

## 6. Rollout checklist (de-externalize)

Update [`docs/operations/extensions/EXTENSIONS-ROLLOUT-CHECKLIST.md`](../../../docs/operations/extensions/EXTENSIONS-ROLLOUT-CHECKLIST.md):

- Remove k.podcastdj.com / prometheus.podcastdj.com-specific steps
- Document Podverse-repo enablement: uncomment alpha sidecar components, set `PROMETHEUS_ENABLED=true`, sync via your GitOps repo, verify scrape
- Use new env keys (`PROMETHEUS_*`, `OTEL_*`; no `EXT_*`)

---

## 7. Verification

- [ ] Four ops docs exist (`EXTENSIONS.md` index + three detail docs)
- [ ] DOCS-OPERATIONS index updated
- [ ] EXTENSIONS-ROLLOUT-CHECKLIST uses Podverse-repo + generic GitOps language (no external repo names)
- [ ] Skills/rules committed under `.cursor/`
- [ ] No application code changes in this plan

---

## Out of scope

- Package implementation (plans 02–13)
