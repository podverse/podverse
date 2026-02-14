# Environment Variables

## Overview

The `podverse-management-web` app is a Next.js app that reads `NEXT_PUBLIC_*` values at runtime via an internal runtime-config sidecar. These values are exposed to the browser, so do not include secrets.

The app validates only server-side connectivity to the sidecar in `scripts/validate-env.ts`. The sidecar uses the same validation helpers as the rest of the monorepo (`@podverse/helpers-config`). It runs full environment validation at startup (every required and optional `NEXT_PUBLIC_*` and `PORT`), logs each variable's status by category, and exits with code 1 if any required variable is missing or invalid; it also validates required presence on each `/runtime-config` request. For local dev, run `npm run build:sidecar:management-web` from the repo root once before using `npm run dev:management-web-sidecar` or `npm run dev:all` (the sidecar runs from a bundled `sidecar/dist/server.js`).

## Required Variables

### Runtime Config Sidecar (Server-Only)

- **`RUNTIME_CONFIG_URL`** (Required)
  - Internal URL for the runtime-config sidecar (e.g., `http://localhost:3101`). Use 3101 so it does not collide with the web app sidecar (3001).
  - Used by the Next.js server to fetch runtime config during SSR

### API Configuration

- **`NEXT_PUBLIC_API_PROTOCOL`** (Required) - API protocol (`http` or `https`)
- **`NEXT_PUBLIC_API_HOST`** (Required) - API hostname
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

## Optional Variables

### Runtime Config Sidecar (Server-Only)

- **`ALLOW_LOCALHOST_PROXY`** (Optional) - If set, must be `"true"` or `"false"`

### API Configuration

- **`NEXT_PUBLIC_API_PORT`** (Optional) - API port for client-side API requests
  - Must be a valid positive number if set
  - If not set, the port will be omitted from the API URL

### Brand & Features

- **`NEXT_PUBLIC_BRAND_NAME`** (Optional) - Brand name for the application

## Value Rules

These rules describe acceptable values. The sidecar enforces required presence; value validation is best-effort and may also be enforced at runtime in app logic.

### Numeric Validation

Variables containing `PORT` are validated to ensure they are valid positive numbers if set:

- `NEXT_PUBLIC_API_PORT` (Optional - must be a valid number if set)

### Format Validation

- **Locale Validation**: `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES` must be `"all-available"` or a comma-delimited list of valid locales
- **Locale Default**: `NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE` must be a valid locale

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
- **Runtime validation**: The sidecar validates required `NEXT_PUBLIC_*` values at runtime. The app validates `RUNTIME_CONFIG_URL` before startup.
- **Validation file**: See `scripts/validate-env.ts` for app-side validation and `apps/management-web/sidecar/server.js` for sidecar validation.
- **Environment file loading**: The app validation script loads `.env.production` in production mode, or `.env.local` (if exists) or `.env` in development mode.

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
