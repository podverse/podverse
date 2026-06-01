---
name: integrations-web
description: Built-in web integrations via @podverse/integrations-web and podverse-integrations-config. Use when adding Cloudflare or other front-end integrations, runtime-config JSON, or sidecar env for integrations.
version: 1.0.0
---

# Integrations web

## When to use

- Adding or changing **`@podverse/integrations-web`**
- **`podverse-integrations-config`** K8s ConfigMap or `infra/k8s/base/common/source/integrations/integrations.env`
- Runtime-config sidecar env (`CLOUDFLARE_WEB_ANALYTICS_*`)
- Web/management-web layout scripts driven by `/runtime-config`

Authoritative doc: [docs/operations/integrations/INTEGRATIONS-WEB.md](/docs/operations/integrations/INTEGRATIONS-WEB.md).

## Architecture

| Item             | Rule                                                                            |
| ---------------- | ------------------------------------------------------------------------------- |
| Ships in         | Default app image (no extra sidecar for the integration itself)                 |
| ConfigMap        | `podverse-integrations-config` — **runtime-config sidecar only**                |
| Runtime JSON key | `integrations.<vendor>.<product>` (e.g. `integrations.cloudflare.webAnalytics`) |
| App config       | `config.integrations.<vendor>.<product>` — vendor nesting required              |

Integrations use `config.integrations.*` and `podverse-integrations-config` on runtime-config
sidecars only.

## Package layout

```
packages/integrations-web/
  src/
    config.ts          # IntegrationsWebConfig type + env → config builder
    cloudflare/        # per-vendor modules
    index.ts           # public exports (components/helpers as needed)
```

Sidecars import config shape from **`@podverse/integrations-web/config`** (or package `./config`
export) so runtime JSON matches app TypeScript types.

## Env vars

**Integrations** subsection — after Observability, before Extensions:

| Variable                           | Purpose    |
| ---------------------------------- | ---------- |
| `CLOUDFLARE_WEB_ANALYTICS_ENABLED` | Toggle     |
| `CLOUDFLARE_WEB_ANALYTICS_TOKEN`   | Site token |

Template: `infra/config/env-templates/integrations.env.example`.

## Runtime-config wiring

- Sidecar serves `{ env, integrations }` on `/runtime-config`
- **`getRuntimeConfig()`** must preserve `integrations` on the client (not only `env`)
- Main Next layouts read `integrations` and conditionally render scripts

## Testing

Integration UI changes require **E2E** specs (see **e2e-page-tests**):

- `apps/web/e2e/cloudflare-web-analytics-disabled.spec.ts` — default config (integration off)
- `apps/web/e2e/cloudflare-web-analytics-enabled.spec.ts` — `playwright.cloudflare-web-analytics-enabled.config.ts` only
- management-web mirrors
- `make e2e_test` runs both configs; no `describe.skip` branching

## Don't

- Mount integrations ConfigMap on api/workers/main Next containers
- Flatten vendor config (`cloudflareWebAnalytics` at top level)
- Use `EXT_*` or extension toggles for integrations

## References

- [extensions-env](/.cursor/skills/extensions-env/SKILL.md) — three-pillar env order
- [INTEGRATIONS-WEB.md](/docs/operations/integrations/INTEGRATIONS-WEB.md)
- [DOCS-OPERATIONS-PLATFORM.md](/docs/operations/platform/DOCS-OPERATIONS-PLATFORM.md)
- [feature-implementation-testing](/.cursor/skills/feature-implementation-testing/SKILL.md)
