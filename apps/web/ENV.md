# Environment Variables

## Overview

The `podverse-web` application is a Next.js app that reads `NEXT_PUBLIC_*` values at runtime via an internal runtime-config sidecar. The app's `.env.example` contains only `RUNTIME_CONFIG_URL`; the sidecar env (and `apps/web/sidecar/.env.example`) holds the full variable list. These values are exposed to the browser, so do not include secrets.

**No environment variables are required at build time.** The app can be built without any `.env` file. All configuration is fetched from the sidecar at runtime.

## Runtime config lifecycle (standardized with `apps/management-web`)

1. `instrumentation.ts` runs once per server process. If `RUNTIME_CONFIG_URL` is set, it attempts to fetch sidecar config and seeds the global runtime-config store (`setRuntimeConfig`).
2. Root layout executes on requests and embeds runtime config via `RuntimeConfigScript`. When `RUNTIME_CONFIG_URL` is set, layout also attempts a sidecar fetch and refreshes the store.
3. If sidecar fetch is temporarily unavailable, `getRuntimeConfig()` safely falls back to `process.env` (dev/test or non-sidecar runs), and logs this fallback once in non-production.
4. Browser request helpers read the inlined runtime config from `globalThis.__PODVERSE_RUNTIME_CONFIG__`, so API protocol/host/port match the current server context.

The sidecar uses the same validation helpers as the rest of the monorepo (`@podverse/helpers-config`). It runs full environment validation at startup (every required and optional `NEXT_PUBLIC_*` and `PORT`), logs each variable's status by category, and exits with code 1 if any required variable is missing or invalid; it also validates required presence on each `/runtime-config` request. For local dev, run `npm run build:sidecar:web` from the repo root once before using `npm run dev:web-sidecar` or `npm run dev:all` (the sidecar runs from a bundled `sidecar/dist/server.js`).

## Required Variables

### Runtime Config Sidecar (Server-Only, Runtime)

- **`RUNTIME_CONFIG_URL`** (Required at runtime only)
  - Internal URL for the runtime-config sidecar (e.g., `http://localhost:3001`)
  - When running via Docker Compose, `infra/config/local/web.env` is used and must use the sidecar **service name** (`http://podverse_local_web_runtime_config:3001`); `make local_env_setup` sets this automatically.
  - Used by the Next.js server to fetch runtime config at startup via `instrumentation.ts`
  - **Not needed at build time** - the sidecar architecture allows builds without any env vars

### Proxy Configuration

- **`NEXT_PUBLIC_PROXY_USER_AGENT`** (Required)
  - Format: `BrandName Bot Environment/AppName/Version`
  - Must include "Bot" in the first part (before the first slash)
  - Example: `Example Bot/Web-API/5`
  - Set a value specific to your deployment. Used when proxying external image requests

### API Configuration (SSR)

These variables are used for server-side rendering API requests:

- **`NEXT_PUBLIC_SSR_API_PROTOCOL`** (Required) - API protocol (`http` or `https`)
- **`NEXT_PUBLIC_SSR_API_HOST`** (Required) - API hostname
- **`NEXT_PUBLIC_SSR_API_PORT`** (Optional) - API port (must be a valid number if set)

### API Configuration (Client)

These variables are used for client-side API requests:

- **`NEXT_PUBLIC_API_PROTOCOL`** (Required) - API protocol (`http` or `https`)
- **`NEXT_PUBLIC_API_HOST`** (Required) - API hostname
- **`NEXT_PUBLIC_API_PORT`** (Optional) - API port (must be a valid number if set)
- **`NEXT_PUBLIC_API_PREFIX`** (Required) - API route prefix (e.g., `/api`)
- **`NEXT_PUBLIC_API_VERSION`** (Required) - API version (e.g., `v2`)

### Web Configuration

- **`NEXT_PUBLIC_WEB_PROTOCOL`** (Required) - Web protocol (`http` or `https`)
- **`NEXT_PUBLIC_WEB_DOMAIN`** (Required) - Web domain (e.g., `localhost:3002` or `podverse.fm`)

### App / General

- **`NEXT_PUBLIC_SERVER_ENV`** (Required) - Server environment
  - Must be one of: `prod`, `beta`, `alpha`, `local`
  - Controls environment-specific behavior (e.g., displaying environment warnings in non-production environments)
  - See `podverse-helpers/src/lib/constants/serverEnv.ts` for the constant definition

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
  - Valid themes: `dark`, `light`, `dracula`
  - Example: `"all-available"` or `"dark,light"`

- **`NEXT_PUBLIC_DEFAULT_THEME`** (Required)
  - Must be one of the valid themes: `dark`, `light`, or `dracula`
  - Example: `"dark"`

## Optional Variables

### Runtime Config Sidecar (Server-Only)

- **`ALLOW_LOCALHOST_PROXY`** (Optional) - If set, must be `"true"` or `"false"`

### API Configuration (SSR)

- **`NEXT_PUBLIC_SSR_API_PORT`** (Optional) - API port for server-side rendering requests
  - Must be a valid positive number if set
  - If not set, the port will be omitted from the API URL

### API Configuration (Client)

- **`NEXT_PUBLIC_API_PORT`** (Optional) - API port for client-side API requests
  - Must be a valid positive number if set
  - If not set, the port will be omitted from the API URL

### Brand & Features

- **`NEXT_PUBLIC_BRAND_NAME`** (Optional) - Brand name for the application
- **`NEXT_PUBLIC_POLLING_INTERVAL_MS`** (Optional) - Polling interval in milliseconds (default: `3000`)
  - Must be a positive number if set

### PWA and browser icons (optional, white-label)

The app serves the PWA manifest from **`/manifest.webmanifest`** (Next.js `app/manifest.ts`) using runtime config. The manifest `name` and `short_name` are **`NEXT_PUBLIC_BRAND_NAME`** (with a built-in fallback if unset). The variables below only override **icons, theme, and head favicon** URLs. When they are unset, icon URLs default to the static files under `/favicon/` in the image; set **absolute** `https://…` URLs to point at your own assets without rebuilding the image.

- **`NEXT_PUBLIC_PWA_ICON_192_URL`** (Optional) - 192×192 maskable icon URL for the manifest
- **`NEXT_PUBLIC_PWA_ICON_512_URL`** (Optional) - 512×512 maskable icon URL for the manifest
- **`NEXT_PUBLIC_PWA_THEME_COLOR`** (Optional) - Theme color (CSS color / hex)
- **`NEXT_PUBLIC_PWA_BACKGROUND_COLOR`** (Optional) - Background color for the web app manifest

Favicon and touch icon link tags in the document head use the same pattern: override only what you need.

- **`NEXT_PUBLIC_FAVICON_ICO_URL`** (Optional) - `.ico` favicon URL
- **`NEXT_PUBLIC_FAVICON_SVG_URL`** (Optional) - SVG favicon URL
- **`NEXT_PUBLIC_FAVICON_PNG_96_URL`** (Optional) - 96×96 PNG favicon URL
- **`NEXT_PUBLIC_APPLE_TOUCH_ICON_URL`** (Optional) - Apple touch icon URL

**Local development:** Default path-absolute values for the variables above are applied from `dev/env-overrides/local/pwa-favicon.env` (see `pwa-favicon.env.example`); after editing, run `make local_env_setup`.

### App Lightning Node

- **`NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_NAME`** (Optional) - Lightning node name
- **`NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_ADDRESS`** (Optional) - Lightning node address
- **`NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_KEY`** (Optional) - Lightning node custom key
- **`NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_VALUE`** (Optional) - Lightning node custom value
- **Note**: Set either LNAddress or Node app value vars, not both.

### App Lightning LNAddress

- **`NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_NAME`** (Optional) - Lightning LNAddress name
- **`NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_ADDRESS`** (Optional) - Lightning LNAddress address
- **Note**: Set either LNAddress or Node app value vars, not both.

### App MetaBoost (Optional)

- **`NEXT_PUBLIC_APP_VALUE_METABOOST_STANDARD`** (Optional) - MetaBoost standard id for the **Donate** page (`/donate`): use **`mb-v1`**. mbrss-v1 is for channel/item boosts, not the Donate-to-app flow.
- **`NEXT_PUBLIC_APP_VALUE_METABOOST_NODE`** (Optional) - MetaBoost endpoint URL for Donate boosts
- **Local overrides:** Set these in `dev/env-overrides/local/metaboost.env` (see `metaboost.env.example`), then run `make local_env_setup`.

**Donate page:** The Boost form on the **Donate** page (`/donate`) only appears when at least one app value Lightning method is configured (either LNAddress or Node). Both name and address must be set for the chosen method. If neither is set, the page shows an explanatory message instead of the form. After Lightning payment, the app may post a MetaBoost **mb-v1** message when `NEXT_PUBLIC_APP_VALUE_METABOOST_STANDARD` and `NEXT_PUBLIC_APP_VALUE_METABOOST_NODE` are configured for **mb-v1**; the Donate page does not use mbrss-v1 (that standard remains for channel/item boost flows only).

### Notifications

- **`NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY`** (Optional) - WebPush VAPID public key for browser notifications

### Account

- **`NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE`** (Required) - Account signup mode (no default value)
  - Valid values: `"admin_only_username"`, `"admin_only_email"`, or `"user_signup_email"`
  - Must be explicitly set - no default value is assumed

- **`NEXT_PUBLIC_CONTACT_EMAIL`** (Optional) - Contact email address

### Social Media

- **`NEXT_PUBLIC_SOCIAL_ACTIVITY_PUB`** (Optional) - ActivityPub URL
- **`NEXT_PUBLIC_SOCIAL_DISCORD`** (Optional) - Discord URL
- **`NEXT_PUBLIC_SOCIAL_GITHUB`** (Optional) - GitHub URL
- **`NEXT_PUBLIC_SOCIAL_MATRIX`** (Optional) - Matrix URL
- **`NEXT_PUBLIC_SOCIAL_X`** (Optional) - X (Twitter) URL

### General

- **`NEXT_PUBLIC_SERVER_ENV`** (Optional) - Server environment identifier

## Value Rules

These rules describe acceptable values. The sidecar enforces required presence; value validation is best-effort and may also be enforced at runtime in app logic.

### Numeric Validation

Variables containing `PORT` or `INTERVAL` are validated to ensure they are valid positive numbers if set:

- `NEXT_PUBLIC_SSR_API_PORT` (Optional - must be a valid number if set)
- `NEXT_PUBLIC_API_PORT` (Optional - must be a valid number if set)
- `NEXT_PUBLIC_POLLING_INTERVAL_MS` (Optional - must be a valid number if set)

### Format Validation

- **User-Agent Format**: `NEXT_PUBLIC_PROXY_USER_AGENT` must follow `BrandName Bot Environment/AppName/Version` and include "Bot" in the first part
- **Theme Validation**: `NEXT_PUBLIC_SUPPORTED_THEMES` must be `"all-available"` or a comma-delimited list of valid themes (`dark`, `light`, `dracula`)
- **Theme Default**: `NEXT_PUBLIC_DEFAULT_THEME` must be one of the valid themes
- **Locale Validation**: `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES` must be `"all-available"` or a comma-delimited list of valid locales
- **Locale Default**: `NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE` must be a valid locale

## Validation Output

During startup, the app validation displays:

- A categorized list of all environment variables
- Status indicator (✓ for valid, ✗ for invalid)
- Whether the variable is required or optional
- A message indicating the validation result
- A summary with totals and counts

Example output:

```
=== Environment Variable Validation ===

[Proxy Configuration]
  ✓ NEXT_PUBLIC_PROXY_USER_AGENT - Valid format

[API Configuration (SSR)]
  ✓ NEXT_PUBLIC_SSR_API_PROTOCOL - Set
  ✓ NEXT_PUBLIC_SSR_API_HOST - Set
  ...

=== Validation Summary ===
Total: 30
Passed: 30
Failed: 0
Required Missing: 0
```

## Important Notes

- **Public variables**: All `NEXT_PUBLIC_*` variables are exposed to the browser. Do not include sensitive information.
- **No build-time validation**: The app can be built without any environment variables. All validation happens at runtime.
- **Runtime validation**: The sidecar validates all required `NEXT_PUBLIC_*` values at startup. The app uses `instrumentation.ts` prewarm plus request-time root layout hydration, with safe `process.env` fallback when sidecar data is unavailable.
- **Validation file**: See `apps/web/sidecar/src/server.ts` for sidecar validation logic. The `scripts/validate-env.ts` script is available for manual validation but does not run automatically during builds.

## Adding New Environment Variables

When adding a new environment variable to the application:

1. **Add to runtime config types**:
   - Update `src/config/runtime-config.ts` with the new key and required/optional classification

2. **Update sidecar validation**:
   - Add the key to `apps/web/sidecar/server.js`
   - Add any format/type validation required for the new value

3. **Update this file**:
   - Add the variable to the appropriate section above
   - Document any special requirements (format, type)

4. **Update environment files**:
   - Add the variable to all environment-specific files in `env/`
