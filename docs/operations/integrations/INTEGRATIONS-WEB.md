# Web integrations (built-in)

**Integrations** are optional vendor capabilities shipped in the **default application image** (no
extension sidecar). The first integration is **Cloudflare Web Analytics** for web and management-web.

Platform overview: [DOCS-OPERATIONS-PLATFORM.md](/docs/operations/platform/DOCS-OPERATIONS-PLATFORM.md). For the
Prometheus extension sidecar and tracing, see [EXTENSIONS-SIDECAR.md](/docs/operations/extensions/EXTENSIONS-SIDECAR.md)
and [TRACING.md](/docs/operations/observability/TRACING.md).

## Package

| Item          | Value                                                                |
| ------------- | -------------------------------------------------------------------- |
| Package       | `@podverse/integrations-web`                                         |
| Config path   | `config.integrations.<vendor>.<product>`                             |
| Runtime JSON  | `integrations.cloudflare.webAnalytics` (from runtime-config sidecar) |
| K8s ConfigMap | `podverse-integrations-config`                                       |

**Vendor nesting:** use `config.integrations.cloudflare.webAnalytics`, not a flat
`config.integrations.cloudflareWebAnalytics`.

## Environment variables

**Integrations** env lives on the **runtime-config sidecar** for web and management-web
(`apps/*/sidecar/.env.example`). API and workers use the Integrations subsection in their app env files.

| Variable                           | Description                               |
| ---------------------------------- | ----------------------------------------- |
| `CLOUDFLARE_WEB_ANALYTICS_ENABLED` | `"true"` to inject the beacon script      |
| `CLOUDFLARE_WEB_ANALYTICS_TOKEN`   | Cloudflare site token (secret in cluster) |

Authoritative shared template:
[infra/config/env-templates/integrations.env.example](/infra/config/env-templates/integrations.env.example).

K8s: `infra/k8s/base/common/source/integrations/integrations.env` → ConfigMap
`podverse-integrations-config`.

## Runtime-config sidecar only

`podverse-integrations-config` is mounted **only** on **runtime-config sidecar** containers (web +
management-web), not on the main Next.js containers.

The sidecar reads integration env and serves `/runtime-config` JSON including:

```json
{
  "env": { "...": "NEXT_PUBLIC_*" },
  "integrations": {
    "cloudflare": {
      "webAnalytics": { "enabled": false, "token": null }
    }
  }
}
```

Main Next apps read `integrations` via `getRuntimeConfig()` and render scripts in root layouts.

## TypeScript mapping (apps)

```typescript
integrations: {
  cloudflare: {
    webAnalytics: {
      enabled: process.env.CLOUDFLARE_WEB_ANALYTICS_ENABLED === 'true',
      token: process.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN,
    },
  },
},
```

Sidecar and `@podverse/integrations-web` share the same nested shape via a `./config` export from
the package.

## Local development

1. Set `CLOUDFLARE_WEB_ANALYTICS_*` on `apps/web/sidecar/.env` or management-web sidecar `.env`
2. Start dev stack; `curl localhost:4031/runtime-config | jq .integrations` (web ports per env)
3. Default local: integration disabled unless you opt in

## Testing

When changing integration behavior, add or update E2E specs (see **integrations-web** and
**e2e-page-tests** skills):

- `apps/web/e2e/cloudflare-web-analytics-disabled.spec.ts` — default Playwright config (integration off)
- `apps/web/e2e/cloudflare-web-analytics-enabled.spec.ts` — Cloudflare-enabled Playwright config only
- management-web mirrors under `apps/management-web/e2e/`

`make e2e_test` and `make e2e_test_report` run **both** default and Cloudflare-enabled configs (no skipped tests).

Enabled-only beacon coverage (also included in full E2E targets):

```bash
npm run test:e2e:cloudflare-enabled -w @podverse/web
npm run test:e2e:cloudflare-enabled -w @podverse/management-web
```

Disabled-path report specs:

```bash
make e2e_test_web_report_spec SPEC=e2e/cloudflare-web-analytics-disabled.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/cloudflare-web-analytics-disabled.spec.ts
```

## Related docs

- [DOCS-OPERATIONS-PLATFORM.md](/docs/operations/platform/DOCS-OPERATIONS-PLATFORM.md) — platform capabilities index
- [TRACING.md](/docs/operations/observability/TRACING.md) — observability
- [EXTENSIONS-SIDECAR.md](/docs/operations/extensions/EXTENSIONS-SIDECAR.md) — extension sidecars
- `.cursor/skills/integrations-web/SKILL.md` — authoring rules
