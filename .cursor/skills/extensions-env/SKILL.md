---
name: extensions-env
description: Three-pillar env layout — Observability, Integrations, Extensions — plus config.extensions.* and extension sidecar keys. Use when adding extension toggles, Prometheus env, integrations ConfigMaps, or Extensions section in app env files.
version: 2.0.0
---

# Extensions, integrations, and observability env

## When to use

When adding or editing env vars for:

- **Extensions (app)** — `apps/*/.env.example` Extensions subsection; `infra/k8s/base/common/source/extensions/extensions.env`
- **Extension sidecars** — `extension-sidecar-otel.env`, `extension-prometheus.env` (merged into same ConfigMap)
- **Integrations** — web/management-web runtime-config sidecars; `infra/k8s/base/common/source/integrations/integrations.env`
- **Observability** — all workloads; per-app `source/*.env` and `observability.env.example`

Authoritative ops docs:

- [docs/operations/platform/DOCS-OPERATIONS-PLATFORM.md](../../docs/operations/platform/DOCS-OPERATIONS-PLATFORM.md) — platform capabilities index
- [docs/operations/observability/TRACING.md](../../docs/operations/observability/TRACING.md)
- [docs/operations/integrations/INTEGRATIONS-WEB.md](../../docs/operations/integrations/INTEGRATIONS-WEB.md)
- [docs/operations/extensions/EXTENSIONS-SIDECAR.md](../../docs/operations/extensions/EXTENSIONS-SIDECAR.md)

## Three pillars

| Pillar        | Config                                   | ConfigMap                      | Env subsection order                                     |
| ------------- | ---------------------------------------- | ------------------------------ | -------------------------------------------------------- |
| Observability | `config.observability.*`                 | Per-app env                    | **First**                                                |
| Integration   | `config.integrations.<vendor>.<product>` | `podverse-integrations-config` | Second (runtime-config sidecar only for integrations CM) |
| Extension     | `config.extensions.*`                    | `podverse-extensions-config`   | **Last** (main app containers)                           |

Two shared ConfigMaps: **`podverse-integrations-config`** (runtime-config sidecars only) and
**`podverse-extensions-config`** (app + extension sidecar containers).

## Extensions (sidecar metrics)

- App client: **`@podverse/extension-metrics-sdk`**
- Toggle: **`PROMETHEUS_ENABLED`** (no `EXT_` prefix) — in **`extensions.env`**
- OTLP to sidecar: **`OTEL_EXPORTER_OTLP_ENDPOINT`** in **`extensions.env`**; **`OTEL_SERVICE_NAME`** in Observability subsection
- Sidecar OTLP collector: **`OTEL_RECEIVER_OTLP_HTTP_PORT`**, **`OTEL_TRACES_EXPORTER_*`** — in **`extension-sidecar-otel.env`**
- Prometheus scrape: **`PROMETHEUS_METRICS_*`** — in **`extension-prometheus.env`**
- **Do not** use `prom-client` in apps

**Web/management-web env catalog:** `apps/*/sidecar/.env.example` lists Observability, Integrations,
Extensions, and `NEXT_PUBLIC_*`. The runtime-config sidecar **process** uses Integrations +
`NEXT_PUBLIC_*` only; `make local_env_setup` syncs `OTEL_*` / `PROMETHEUS_*` to `.env.local` and
`infra/config/local/web.env` for the Next.js main process. App `.env.example` files: `RUNTIME_CONFIG_URL` only.

## Integrations (built-in web)

- Package: **`@podverse/integrations-web`**
- Nested config: **`config.integrations.cloudflare.webAnalytics`**
- Env: **`CLOUDFLARE_WEB_ANALYTICS_*`** in Integrations subsection

## Observability (always-on tracing)

- Package: **`@podverse/observability`**
- Config: **`config.observability.*`** — never `config.extensions.tracing`
- Env: **`OTEL_SERVICE_NAME`**, **`OTEL_TRACES_EXPORT`**, optional sampler and OTLP endpoint

See **observability** skill for trace-specific rules.

## Config mapping (TypeScript)

```typescript
observability: {
  serviceName: process.env.OTEL_SERVICE_NAME!,
  tracesExport: process.env.OTEL_TRACES_EXPORT!,
  // ...
},
integrations: {
  cloudflare: {
    webAnalytics: { /* ... */ },
  },
},
extensions: {
  prometheus: {
    enabled: process.env.PROMETHEUS_ENABLED === 'true',
  },
  otel: {
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT!,
    serviceName: process.env.OTEL_SERVICE_NAME!,
  },
},
```

Startup validation category order: **Observability** → **Integrations** (where applicable) →
**Extensions** (last).

## Env file layout

Main app `.env.example` section order:

1. Observability
2. Integrations (if app serves integration config)
3. Extensions (last)

Templates:

- `infra/config/env-templates/observability.env.example`
- `infra/config/env-templates/integrations.env.example`
- `infra/config/env-templates/extensions.env.example` — app toggles + OTLP endpoint
- `infra/config/env-templates/extension-sidecar-otel.env.example` — sidecar OTLP receiver + trace forward
- `infra/config/env-templates/extension-prometheus.env.example` — Prometheus sidecar scrape

K8s merges all three extension source files into **`podverse-extensions-config`**. Local Compose
loads three files under `infra/config/local/`.

## HTTP routes (Prometheus extension)

Sidecar only:

| Resource | Path                             |
| -------- | -------------------------------- |
| metrics  | `/extensions/prometheus/metrics` |
| health   | `/extensions/prometheus/health`  |

Do not register metrics on Express/Next app processes.

## Files to keep in sync

- App extension env: `extensions.env.example`, `infra/k8s/base/common/source/extensions/extensions.env`
- Sidecar OTLP: `extension-sidecar-otel.env.example`, `infra/k8s/base/common/source/extensions/extension-sidecar-otel.env`
- Prometheus sidecar: `extension-prometheus.env.example`, `infra/k8s/base/common/source/extensions/extension-prometheus.env`
- Integration env: `integrations.env.example`, `infra/k8s/base/common/source/integrations/integrations.env`
- App configs and `validation.ts` per pillar
- Ops docs under `docs/operations/`

## References

- [extensions-env rule](../../rules/extensions-env.mdc)
- [integrations-web](../integrations-web/SKILL.md)
- [observability](../observability/SKILL.md)
- [env-file-formatting](../env-file-formatting/SKILL.md)
- [startup-validation-env-order](../startup-validation-env-order/SKILL.md)
