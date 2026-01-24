# Environment Variables

## Overview

The `podverse-management-web` application is a Next.js application that requires environment variable validation before build. All environment variables are prefixed with `NEXT_PUBLIC_` which means they are exposed to the browser/client-side code.

Validation occurs in `scripts/validate-env.ts` before the build process. The validation:

1. Checks if each variable is set
2. Validates format/type where applicable (e.g., locale validation, numeric validation)
3. Displays a categorized status for each variable
4. Aborts the build if any required variables are missing or invalid

**Important**: All environment variables in this application are public (exposed to the browser). Do not include sensitive information like API keys or secrets.

## Required Variables

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

### API Configuration

- **`NEXT_PUBLIC_API_PORT`** (Optional) - API port for client-side API requests
  - Must be a valid positive number if set
  - If not set, the port will be omitted from the API URL

### Brand & Features

- **`NEXT_PUBLIC_BRAND_NAME`** (Optional) - Brand name for the application

## Validation Rules

### Numeric Validation

Variables containing `PORT` are validated to ensure they are valid positive numbers if set:
- `NEXT_PUBLIC_API_PORT` (Optional - must be a valid number if set)

### Format Validation

- **Locale Validation**: `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES` must be `"all-available"` or a comma-delimited list of valid locales
- **Locale Default**: `NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE` must be a valid locale

## Validation Output

During build, the validation displays:
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

- **Public variables**: All environment variables are prefixed with `NEXT_PUBLIC_` and are exposed to the browser. Do not include sensitive information.
- **Build abort**: If any required variable is missing or invalid, the build process will abort with a clear error message.
- **Validation file**: See `scripts/validate-env.ts` for the complete validation implementation.
- **Environment file loading**: The validation script loads `.env.production` in production mode, or `.env.local` (if exists) or `.env` in development mode.

## Adding New Environment Variables

When adding a new environment variable to the application:

1. **Add to configuration files**:
   - Add the variable to the appropriate config section

2. **Add validation to `scripts/validate-env.ts`**:
   - Determine if the variable is required or optional
   - Add appropriate validation call in `validateAllEnvironmentVariables()`
   - Use `validateRequired()` for required vars
   - Use `validateOptional()` for optional vars
   - Add custom validation if format/type checking is needed (e.g., locale validation)

3. **Update this file**:
   - Add the variable to the appropriate section above
   - Document any special requirements (format, type)

4. **Update `.env.example` and environment files**:
   - Add the variable with a comment explaining its purpose
   - Update all environment-specific files in the `env/` directory with the same comments
