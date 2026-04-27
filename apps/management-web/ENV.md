# Environment Variables

## Overview

The `podverse-management-web` app is a Next.js app that reads `NEXT_PUBLIC_*` values at runtime via an internal runtime-config sidecar. The app's `.env.example` contains only `RUNTIME_CONFIG_URL`; the sidecar env (and `apps/management-web/sidecar/.env.example`) holds the full variable list. These values are exposed to the browser, so do not include secrets.

**No environment variables are required at build time.** The app can be built without any `.env` file. All configuration is fetched from the sidecar at runtime.

## Runtime config lifecycle (standardized with `apps/web`)

1. `instrumentation.ts` runs once per server process. If `RUNTIME_CONFIG_URL` is set, it attempts to fetch sidecar config and seeds the global runtime-config store (`setRuntimeConfig`).
2. Root layout executes on requests and embeds runtime config via `RuntimeConfigScript`. When `RUNTIME_CONFIG_URL` is set, layout also attempts a sidecar fetch and refreshes the store.
3. If sidecar fetch is temporarily unavailable, `getRuntimeConfig()` safely falls back to `process.env` (dev/test or non-sidecar runs), and logs this fallback once in non-production.
4. Browser request helpers read the inlined runtime config from `globalThis.__PODVERSE_MANAGEMENT_RUNTIME_CONFIG__`, so API protocol/host/port match the current server context.

The sidecar uses the same validation helpers as the rest of the monorepo (`@podverse/helpers-config`). It runs full environment validation at startup (every required and optional `NEXT_PUBLIC_*` and `PORT`), logs each variable's status by category, and exits with code 1 if any required variable is missing or invalid; it also validates required presence on each `/runtime-config` request. For local dev, run `npm run build:sidecar:management-web` from the repo root once before using `npm run dev:management-web-sidecar` or `npm run dev:all` (the sidecar runs from a bundled `sidecar/dist/server.js`).

## Required Variables

### Runtime Config Sidecar (Server-Only, Runtime)

- **`RUNTIME_CONFIG_URL`** (Required at runtime only)
  - Internal URL for the runtime-config sidecar (e.g., `http://localhost:3101`). Use 3101 so it does not collide with the web app sidecar (3001).
  - When running via Docker Compose, `infra/config/local/management-web.env` is used and must use the sidecar **service name** (`http://podverse_local_management_web_runtime_config:3101`); `make local_env_setup` sets this automatically.
  - Used by the Next.js server to fetch runtime config at startup via root `instrumentation.ts` (`setRuntimeConfig`). The root layout then embeds that config in `RuntimeConfigScript` for the browser (server render must be dynamic; see `dynamic` export in `src/app/layout.tsx`)
  - **Not needed at build time** - the sidecar architecture allows builds without any env vars

### API Configuration (SSR)

- **`NEXT_PUBLIC_SSR_API_PROTOCOL`** (Required) - Protocol for server-side API requests (`http` or `https`)
- **`NEXT_PUBLIC_SSR_API_HOST`** (Required) - Host for server-side API requests. Use Docker service name (`podverse_local_management_api`) in `infra/config/local/management-web.env` when running in Compose; `make local_env_setup` sets it.
- **`NEXT_PUBLIC_SSR_API_PORT`** (Required) - Port for server-side API requests (e.g. `3100`)

### API Configuration (Client)

- **`NEXT_PUBLIC_API_PROTOCOL`** (Required) - API protocol (`http` or `https`)
- **`NEXT_PUBLIC_API_HOST`** (Required) - API hostname (browser requests; use localhost for local dev)
- **`NEXT_PUBLIC_API_PORT`** (Optional) - API port (must be a valid number if set)
- **`NEXT_PUBLIC_API_PREFIX`** (Required) - API route prefix (e.g., `/api`)
- **`NEXT_PUBLIC_API_VERSION`** (Required) - API version (e.g., `v2`)

### Brand & Features

- **`NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES`** (Required)
  - Must be `"all-available"` or a comma-delimited list of valid locales
  - Valid locales: See `podverse-helpers/src/lib/constants/locales.ts`
  - Example: `"all-available"` or `"en,es,fr"`

- **`NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE`** (Required)
  - Must be a valid locale from the supported locales list
  - Example: `"en"`

- **`NEXT_PUBLIC_SUPPORTED_THEMES`** (Required)
  - Must be `"all-available"` or a comma-delimited list of valid themes
  - Valid themes: `dark`, `light`, `dracula`, `violet` (see `packages/helpers-config` / `SUPPORTED_THEMES`)
  - Example: `"all-available"` or `"dark,light"`

- **`NEXT_PUBLIC_DEFAULT_THEME`** (Required)
  - Must be one of the valid themes; must also appear in the effective supported set when `NEXT_PUBLIC_SUPPORTED_THEMES` is not `all-available`
  - Example: `"dark"`

## Optional Variables

### Runtime Config Sidecar (Server-Only)

- **`ALLOW_LOCALHOST_PROXY`** (Optional) - If set, must be `"true"` or `"false"`

### API Configuration

- **`NEXT_PUBLIC_API_PORT`** (Optional) - API port for client-side API requests
  - Must be a valid positive number if set
  - If not set, the port will be omitted from the API URL

### Brand & Features

- **`NEXT_PUBLIC_BRAND_NAME`** (Optional) - Brand name for the application

### Brand: app + document chrome (optional, white-label)

The installable app manifest is served from **`/manifest.webmanifest`** (`app/manifest.ts`) using runtime config. Manifest `name` and `short_name` are **`NEXT_PUBLIC_BRAND_NAME`** (with a built-in fallback if unset). The variables below override **app icons, theme/background, and head icon** URLs; they are not limited to a single feature. When unset, paths default to `/favicon/`; set **absolute** `https://…` URLs for CDN-hosted assets.

- **`NEXT_PUBLIC_BRAND_APP_ICON_192_URL`** (Optional) - 192×192 maskable icon
- **`NEXT_PUBLIC_BRAND_APP_ICON_512_URL`** (Optional) - 512×512 maskable icon
- **`NEXT_PUBLIC_BRAND_THEME_COLOR`** (Optional) - UI / browser chrome tint (CSS color)
- **`NEXT_PUBLIC_BRAND_BACKGROUND_COLOR`** (Optional) - App shell / launch background. For local [`brand.env`](../../dev/env-overrides/local/brand.env.example), set **`BRAND_BACKGROUND_COLOR`** (legacy: `BRAND_COLOR_BACKGROUND`); `make local_env_setup` writes it to this key in the sidecar.
- **`NEXT_PUBLIC_BRAND_FAVICON_ICO_URL`** (Optional) - `.ico` favicon URL
- **`NEXT_PUBLIC_BRAND_FAVICON_SVG_URL`** (Optional) - SVG favicon URL
- **`NEXT_PUBLIC_BRAND_FAVICON_PNG_96_URL`** (Optional) - 96×96 PNG favicon URL
- **`NEXT_PUBLIC_BRAND_APPLE_TOUCH_ICON_URL`** (Optional) - Apple touch icon URL

**Local development:** Default path-absolute values are in `dev/env-overrides/local/brand.env` (see `brand.env.example`); after editing, run `make local_env_setup`.

## Value Rules

These rules describe acceptable values. The sidecar enforces required presence; value validation is best-effort and may also be enforced at runtime in app logic.

### Numeric Validation

Variables containing `PORT` are validated to ensure they are valid positive numbers if set:

- `NEXT_PUBLIC_API_PORT` (Optional - must be a valid number if set)

### Format Validation

- **Locale Validation**: `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES` must be `"all-available"` or a comma-delimited list of valid locales
- **Locale Default**: `NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE` must be a valid locale
- **Theme Validation**: `NEXT_PUBLIC_SUPPORTED_THEMES` must be `"all-available"` or a comma-delimited list of valid themes (`dark`, `light`, `dracula`, `violet`)
- **Theme Default**: `NEXT_PUBLIC_DEFAULT_THEME` must be one of the valid themes

## Validation Output

During startup, the validation displays:

- A categorized list of all environment variables
- Status indicator (✓ for valid, ✗ for invalid)
- Whether the variable is required or optional
- A message indicating the validation result
- A summary with totals and counts

Example output:

```
=== Environment Variable Validation ===

[API Configuration]
  ✓ NEXT_PUBLIC_API_PROTOCOL - Set
  ✓ NEXT_PUBLIC_API_HOST - Set
  ...

=== Validation Summary ===
Total: 7
Passed: 7
Failed: 0
Required Missing: 0
```

## Important Notes

- **Public variables**: All `NEXT_PUBLIC_*` variables are exposed to the browser. Do not include sensitive information.
- **No build-time validation**: The app can be built without any environment variables. All validation happens at runtime.
- **Runtime validation**: The sidecar validates all required `NEXT_PUBLIC_*` values at startup. The app loads config via `instrumentation.ts` prewarm and request-time root layout hydration, with safe `process.env` fallback when sidecar data is unavailable.
- **Validation file**: See `apps/management-web/sidecar/src/server.ts` for sidecar validation logic. The `scripts/validate-env.ts` script is available for manual validation but does not run automatically during builds.

## Adding New Environment Variables

When adding a new environment variable to the application:

1. **Add to runtime config types**:
   - Update `src/config/runtime-config.ts` with the new key and required/optional classification

2. **Update sidecar validation**:
   - Add the key to `apps/management-web/sidecar/server.js`
   - Add any format/type validation required for the new value

3. **Update this file**:
   - Add the variable to the appropriate section above
   - Document any special requirements (format, type)

4. **Update environment files**:
   - Add the variable to all environment-specific files in `env/`
