# Plan 04 — `@podverse/integrations-web` package + Cloudflare

## Objective

Create shared package for built-in web integrations. First integration: **Cloudflare Web Analytics**.

---

## 1. Package layout

```
packages/integrations-web/
  PACKAGES-INTEGRATIONS-WEB.md
  package.json              # name: @podverse/integrations-web
  tsconfig.json
  vitest.config.ts
  src/
    index.ts
    IntegrationsWebScripts.tsx
    config/
      index.ts              # buildIntegrationsWebConfigFromEnv
      types.ts              # IntegrationsWebConfig
    integrations/
      cloudflare/
        webAnalytics/
          CloudflareWebAnalyticsScript.tsx
          parseCloudflareWebAnalyticsEnv.ts
          webAnalytics.test.ts
```

---

## 2. Types

```typescript
export type IntegrationsWebConfig = {
  cloudflare: {
    webAnalytics: {
      enabled: boolean;
      token?: string;
    };
  };
};
```

---

## 3. `package.json`

- **exports:** `"."` → React components; `"./config"` → Node/sidecar parsers
- **peerDependencies:** `next`, `react` (match `@podverse/ui` pattern)
- Tier A `.js` specifiers inside package; Tier C extensionless for TSX if following ui pattern — see [import-specifiers-tiered skill](../../../.cursor/skills/import-specifiers-tiered/SKILL.md)

---

## 4. Config builder

`buildIntegrationsWebConfigFromEnv(env: NodeJS.ProcessEnv): IntegrationsWebConfig`

- Read `CLOUDFLARE_WEB_ANALYTICS_ENABLED` (`"true"` / blank)
- Read `CLOUDFLARE_WEB_ANALYTICS_TOKEN`
- Return nested `cloudflare.webAnalytics`

Export validation helper for sidecars: fail startup when enabled without token.

---

## 5. CloudflareWebAnalyticsScript

- Use `next/script`
- URL: `https://static.cloudflareinsights.com/beacon.min.js`
- `data-cf-beacon='{"token":"..."}'` when enabled + token present
- Render nothing when disabled

`IntegrationsWebScripts` composes all integration scripts (single import for layouts).

---

## 6. Monorepo wiring

- Add `packages/integrations-web` to root `workspaces` (already under `packages/*`)
- Add to [`package.json`](../../../package.json) `build:packages` workspace list
- Dependencies:
  - `apps/web`, `apps/management-web`
  - `apps/web/sidecar`, `apps/management-web/sidecar`

---

## 7. Unit tests (vitest)

- `parseCloudflareWebAnalyticsEnv` / builder: enabled+token, disabled, enabled missing token (validation)
- Default nested shape

---

## 8. Verification

```bash
./scripts/nix/with-env npm run test -w @podverse/integrations-web
./scripts/nix/with-env npm run build -w @podverse/integrations-web
./scripts/nix/with-env npm run lint
```

---

## Out of scope

- Sidecar HTTP wiring (Plan 05)
- E2E (Plan 07)
