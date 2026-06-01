# @podverse/integrations-web

Built-in web integrations for Podverse Next.js apps (Cloudflare Web Analytics first).

## Exports

| Subpath                             | Consumers                         | Contents                                                                           |
| ----------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| `@podverse/integrations-web`        | `apps/web`, `apps/management-web` | `IntegrationsWebScripts`, `CloudflareWebAnalyticsScript`, config types             |
| `@podverse/integrations-web/config` | runtime-config sidecars           | `buildIntegrationsWebConfigFromEnv`, `validateIntegrationsWebConfigFromEnv`, types |

## Config shape

```typescript
integrations: {
  cloudflare: {
    webAnalytics: { enabled: boolean; token?: string };
  };
}
```

Authoritative contract: [docs/operations/integrations/INTEGRATIONS-WEB.md](/docs/operations/integrations/INTEGRATIONS-WEB.md).

## Env vars

| Variable                           | Purpose                   |
| ---------------------------------- | ------------------------- |
| `CLOUDFLARE_WEB_ANALYTICS_ENABLED` | `"true"` to inject beacon |
| `CLOUDFLARE_WEB_ANALYTICS_TOKEN`   | Cloudflare site token     |

Template: `infra/config/env-templates/integrations.env.example`.
