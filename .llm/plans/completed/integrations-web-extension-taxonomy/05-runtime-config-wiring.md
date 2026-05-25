# Plan 05 — Runtime-config wiring (web + management-web)

## Objective

Project **Integrations** env into `/runtime-config` JSON and render scripts in layouts. Fix client/server runtime config hydration.

---

## 1. Extend `WebRuntimeConfig`

[`apps/web/src/config/runtime-config.ts`](../../../apps/web/src/config/runtime-config.ts) and management-web equivalent:

```typescript
import type { IntegrationsWebConfig } from '@podverse/integrations-web/config';

export type WebRuntimeConfig = {
  env: WebRuntimeConfigValues;
  integrations: IntegrationsWebConfig;
};
```

---

## 2. Fix `getRuntimeConfig()` (critical)

[`apps/web/src/config/runtime-config-store.ts`](../../../apps/web/src/config/runtime-config-store.ts) currently returns only `{ env }`.

Update to:

- Preserve `integrations` from `globalThis.__PODVERSE_RUNTIME_CONFIG__`
- Fallback when unset:

```typescript
integrations: {
  cloudflare: {
    webAnalytics: { enabled: false, token: undefined },
  },
},
```

Apply same fix in management-web `runtime-config-store.ts` and update store tests.

---

## 3. Sidecar servers

[`apps/web/sidecar/src/server.ts`](../../../apps/web/sidecar/src/server.ts) and management-web sidecar:

- Import `buildIntegrationsWebConfigFromEnv` from `@podverse/integrations-web/config`
- `buildRuntimeConfig()` returns `{ env, integrations }`
- Startup validation category **Integrations / Cloudflare Web Analytics** (before Extensions categories if any)
- When `CLOUDFLARE_WEB_ANALYTICS_ENABLED=true`, require non-empty token

Add `@podverse/integrations-web` to sidecar `package.json`; esbuild bundle resolves `./config` only.

Rebuild bundle: `npm run bundle -w @podverse/web-sidecar`

---

## 4. SSR fetch path

[`apps/web/src/config/runtime-config.server.ts`](../../../apps/web/src/config/runtime-config.server.ts) — no change needed if JSON shape extends; ensure `setRuntimeConfig` receives full object in [`instrumentation.ts`](../../../apps/web/instrumentation.ts) and [`layout.tsx`](../../../apps/web/src/app/layout.tsx).

[`RuntimeConfigScript`](../../../apps/web/src/components/Head/RuntimeConfigScript.tsx) passes full `WebRuntimeConfig` — client receives `integrations`.

---

## 5. App config

[`apps/web/src/config/index.ts`](../../../apps/web/src/config/index.ts) — add **`integrations` before `extensions`** (if extensions block added for OTEL):

```typescript
integrations: {
  cloudflare: {
    webAnalytics: getRuntimeConfig().integrations.cloudflare.webAnalytics,
  },
},
```

Management-web mirror.

---

## 6. Layouts

In root `layout.tsx` `<head>` (web + management-web):

```tsx
import { IntegrationsWebScripts } from '@podverse/integrations-web';

<IntegrationsWebScripts integrations={runtimeConfig.integrations} />
```

Fetch `runtimeConfig` same as existing `RuntimeConfigScript` path.

---

## 7. Verification

```bash
./scripts/nix/with-env npm run build -w @podverse/web-sidecar
./scripts/nix/with-env npm run build -w @podverse/web
./scripts/nix/with-env npm run build -w @podverse/management-web
```

Manual: set `CLOUDFLARE_WEB_ANALYTICS_*` on sidecar `.env`, start dev stack, `curl localhost:4031/runtime-config | jq .integrations`.

---

## Out of scope

- K8s ConfigMap (Plan 03)
- E2E (Plan 07)
