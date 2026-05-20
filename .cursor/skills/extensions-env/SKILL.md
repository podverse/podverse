---
name: extensions-env
description: Extension-related environment variables and nested config.extensions.<service> mapping. Use when adding or editing extension toggles, Prometheus env, or the Extensions section in app env files.
version: 1.6.0
---

# Extensions environment variables

## When to use

When adding or editing extension-related env vars in Podverse apps (especially
`apps/api`, `apps/management-api`), K8s `infra/k8s/base/*/source/*.env`, or
`apps/*/.env.example`.

## Config mapping (TypeScript)

- Extension settings live under **`config.extensions.<serviceName>`**, grouped by
  integration/service, with **properties nested inside** that object.
- Do **not** flatten toggles as `config.extensions.prometheusEnabled` or use
  `config.observability.*` / other top-level namespaces.
- Do **not** name the service `prometheusMetrics` — the service is **`prometheus`**; the HTTP
  resource is **`metrics`**.
- Example (prometheus extension):

  ```typescript
  extensions: {
    prometheus: {
      enabled: process.env.EXT_PROMETHEUS_ENABLED === 'true',
    },
  };
  ```

  Usage: `config.extensions.prometheus.enabled`.

- Future extensions follow the same shape, e.g.
  `config.extensions.cloudflareWebAnalytics.token` (when wired).
- Startup validation category for extension env vars: **`Extensions`**.

## Env file layout (required)

1. **Last section** — The **Extensions** block must be the **final section** in every
   env template/source file that defines extension vars (nothing after it).
2. **Section header** — Use this header (exact wording for `.env.example`):

   ```text
   #####
   ##### Extensions (forward-looking)
   #####
   ```

   For K8s `source/*.env` (no `#####` style), use:

   ```text
   # Extensions (forward-looking)
   ```

3. **Comments** — Note that vars in this section are extension-intended even when the
   current implementation is still baked into core (e.g. temporary `prom-client` path).

## Naming

### Env keys (required `EXT_` prefix)

**All extension-specific environment variables must use the `EXT_` prefix.**

- Pattern: `EXT_<SERVICE>_<PROPERTY>` in `SCREAMING_SNAKE_CASE`.
- **Service** segment aligns with `config.extensions.<service>` (e.g. `PROMETHEUS` for
  `config.extensions.prometheus`).
- **Property** segment describes the setting (`ENABLED`, `TOKEN`, etc.).
- Current prometheus toggle: **`EXT_PROMETHEUS_ENABLED`** (`"true"` / blank / `"false"`).
- Do **not** add extension toggles without `EXT_` (e.g. not `PROMETHEUS_ENABLED`,
  `PROMETHEUS_METRICS_ENABLED`).
- When the extensions framework lands, additional keys may follow
  `EXT_<ID>_...` (still under the **last** Extensions section).

### Config keys (`config.extensions`)

- **Service segment:** short camelCase integration id matching the URL segment when possible
  (e.g. `prometheus`, `cloudflareWebAnalytics`).
- **Properties:** boolean toggles and other fields **inside** the service object
  (`enabled`, `token`, etc.), not suffixes on the service name.
- Map each `EXT_*` env var in `config/index.ts` under the matching `extensions.<service>` object.

## Values

Follow [env-file-formatting](../env-file-formatting/SKILL.md):

- Non-empty: double quotes in `.env.example` (e.g. `EXT_PROMETHEUS_ENABLED="false"`).
- K8s source: unquoted `false` / `true` per existing `source/*.env` style.

## HTTP routes (per service)

Extension HTTP endpoints are **not** registered in `registerHealthRoutes`. Use the extension
router pattern:

- `apps/<app>/src/lib/extensions/registerExtensionRoutes.ts` — orchestrator; call after feature
  routers in `app.ts` / `startApp`, before the error handler.
- `apps/<app>/src/lib/extensions/<service>/register<Service>Routes.ts` — routes for one
  extension (e.g. `prometheus/registerPrometheusRoutes.ts` registers the **metrics** resource).
- `apps/<app>/src/lib/extensions/<service>/` — exporter/runtime for that service only (e.g.
  `prometheus/prometheusExporter.ts` with `createPrometheusExporter`).

Register extension middleware at app bootstrap when `config.extensions.<service>.enabled`; pass
runtime into `registerExtensionRoutes(app, baseUrl, config.extensions, { prometheus: exporter })`.

### URL path convention (preferred)

Extension HTTP routes live under the versioned API base, **not** at top-level `/metrics` or mixed
into health routes:

```text
{API_PREFIX}{API_VERSION}/extensions/{service}/{resource}
```

Examples (default prefix/version `/api` + `/v2`):

| `config.extensions` key | Env toggle (example)     | URL path (suffix after version)  | Resource  |
| ----------------------- | ------------------------ | -------------------------------- | --------- |
| `prometheus`            | `EXT_PROMETHEUS_ENABLED` | `/extensions/prometheus/metrics` | `metrics` |

- **`service`:** URL segment matches `config.extensions` key (`prometheus` → `prometheus`).
- **`resource`:** capability endpoint (`metrics`, `webhooks`, etc.).
- **Prometheus:** exposition format and scrape behavior are unchanged; operators set
  `metrics_path` to `/api/v2/extensions/prometheus/metrics`. See
  [PROMETHEUS-METRICS-ENDPOINTS.md](../../docs/operations/PROMETHEUS-METRICS-ENDPOINTS.md).

Define path constants in `lib/extensions/<service>/` (e.g. `prometheus/prometheusPaths.ts`) and use
them in route registration and tests.

## Files to keep in sync

When adding a new extension env var:

- `apps/<app>/.env.example` — Extensions section at bottom; key must start with `EXT_`
- `apps/<app>/src/config/index.ts` — nested under `extensions.<serviceName> { ... }`
- `apps/<app>/src/lib/startup/validation.ts` — `validateOptional(..., 'Extensions', ...)` at the
  **end** of `validateAllEnvironmentVariables` (aligned with Extensions being the last env
  section; see [startup-validation-env-order](../startup-validation-env-order/SKILL.md))
- `apps/<app>/src/lib/extensions/` — per-service route registration (see above)
- `infra/k8s/base/<app>/source/*.env` — Extensions block at bottom (if the app has K8s env)

## References

- [docs/operations/PROMETHEUS-METRICS-ENDPOINTS.md](../../docs/operations/PROMETHEUS-METRICS-ENDPOINTS.md)
- [docs/proposals/EXTENSIONS.md](../../docs/proposals/EXTENSIONS.md) (when present on branch)
- [env-file-formatting](../env-file-formatting/SKILL.md)
