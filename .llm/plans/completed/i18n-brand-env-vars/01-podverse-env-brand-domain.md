# Plan 01: Add `NEXT_PUBLIC_BRAND_DOMAIN` env var to Podverse

## Scope

Add a new `NEXT_PUBLIC_BRAND_DOMAIN` environment variable to the Podverse web and management-web runtime config pipeline. This holds the public-facing domain (e.g. `podverse.fm`) and will be used in i18n interpolation.

## Steps

### 1. Add to sidecar `.env.example` files

**`apps/web/sidecar/.env.example`** — Add under the "Web Configuration" section (after `NEXT_PUBLIC_BRAND_NAME`):

```
NEXT_PUBLIC_BRAND_DOMAIN="podverse.fm"
```

**`apps/management-web/sidecar/.env.example`** — Add under the "Web Configuration" section (after `NEXT_PUBLIC_BRAND_NAME`):

```
NEXT_PUBLIC_BRAND_DOMAIN="podverse.fm"
```

### 2. Add to brand override file

**`dev/env-overrides/local/brand.env.example`** — Add after the existing `MANAGEMENT_BRAND_NAME` line:

```
BRAND_DOMAIN="podverse.fm"
```

Update the header comment to mention `BRAND_DOMAIN`:

```
# Brand name, domain, and user-agent. Prepared by local_env_prepare.
# api/web = BRAND_NAME, BRAND_DOMAIN. mgmt api/mgmt web = MANAGEMENT_BRAND_NAME. Do not set NEXT_PUBLIC_* in overrides.
```

### 3. Update local env setup script

**`scripts/local-env/setup.sh`** — In the section that propagates brand overrides to sidecar envs (around lines 379-398), add propagation of `BRAND_DOMAIN` to `NEXT_PUBLIC_BRAND_DOMAIN` for both the web sidecar and management-web sidecar env files.

### 4. Expose in web config

**`apps/web/src/config/index.ts`** — Add `domain` to the `brand` object:

```typescript
brand: {
  name: env.NEXT_PUBLIC_BRAND_NAME!,
  domain: env.NEXT_PUBLIC_BRAND_DOMAIN!,
},
```

This makes it accessible as `config.public.brand.domain`.

### 5. Add to runtime config env keys

**`apps/web/src/config/runtime-config.ts`** — Add `NEXT_PUBLIC_BRAND_DOMAIN` to the `WebRuntimeConfigEnvKey` union type.

**`apps/web/src/config/runtime-config-store.ts`** — No change needed; the existing `buildRuntimeConfigFromProcessEnv()` iterates the keys array.

### 6. Add to K8s env files

**`infra/k8s/base/web/source/web-sidecar.env`** — Add:

```
NEXT_PUBLIC_BRAND_DOMAIN="podverse.fm"
```

**`infra/k8s/base/management-web/source/management-web.env`** — Add:

```
NEXT_PUBLIC_BRAND_DOMAIN="podverse.fm"
```

### 7. Management-web config

**`apps/management-web/src/config/`** — Follow the same pattern as web: add `NEXT_PUBLIC_BRAND_DOMAIN` to the runtime config env key type and expose via config. Check if management-web has its own config index file or shares one.

## Key Files

- `apps/web/sidecar/.env.example`
- `apps/management-web/sidecar/.env.example`
- `dev/env-overrides/local/brand.env.example`
- `scripts/local-env/setup.sh`
- `apps/web/src/config/index.ts`
- `apps/web/src/config/runtime-config.ts`
- `infra/k8s/base/web/source/web-sidecar.env`
- `infra/k8s/base/management-web/source/management-web.env`

## Verification

- Grep for `NEXT_PUBLIC_BRAND_DOMAIN` across the repo and confirm it appears in all the files listed above
- Confirm `config.public.brand.domain` is typed and accessible
