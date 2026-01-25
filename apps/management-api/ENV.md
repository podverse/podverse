# Environment Variables

## Overview

The `podverse-management-api` application requires environment variable validation on startup. All environment variables must be provided through the `.env` file.

Validation occurs in `src/lib/startup/validation.ts` during application startup. The validation:

1. Checks if each variable is set
2. Validates format/type where applicable (e.g., UUID for JWT secret, numeric for ports)
3. Displays a categorized status for each variable
4. Aborts startup if any required variables are missing or invalid

## Required Variables

### Auth & Security

- **`AUTH_JWT_SECRET`** (Required)
  - Must be a valid UUID
  - Used for JWT token generation
  - Example: `123e4567-e89b-12d3-a456-426614174000`
  - Generate with: `uuidgen` (macOS/Linux) or use an online UUID generator

- **`USER_AGENT`** (Required)
  - Format: `BrandName Bot Environment/AppName/Version`
  - Must include "Bot" in the first part (before the first slash)
  - Example: `Podverse Bot Local/Management-API/5`
  - Used for external API requests

### Database

- **`DB_HOST`** (Required) - Database hostname
- **`DB_PORT`** (Required) - Database port (must be a valid number)
- **`DB_READ_USERNAME`** (Required) - Read-only database username
- **`DB_READ_PASSWORD`** (Required) - Read-only database password
- **`DB_READ_WRITE_USERNAME`** (Required) - Read-write database username
- **`DB_READ_WRITE_PASSWORD`** (Required) - Read-write database password
- **`DB_DATABASE`** (Required) - Database name
- **`DB_SSL_CONNECTION`** (Optional) - Use SSL for database connection (default: `false`)

### API Configuration

- **`API_PORT`** (Required) - API server port (must be a valid number)
- **`API_PREFIX`** (Required) - API route prefix (e.g., `/api`)
- **`API_VERSION`** (Required) - API version (e.g., `v2`)
- **`COOKIE_DOMAIN`** (Required) - Domain for cookies
- **`API_ALLOWED_CORS_ORIGINS`** (Required) - Comma-separated list of allowed CORS origins (must contain at least one origin)

### Web

- **`WEB_PROTOCOL`** (Required) - Web protocol (`http` or `https`)
- **`WEB_DOMAIN`** (Required) - Web domain (e.g., `localhost:3999` or `management.podverse.fm`)

## Optional Variables

### General

- **`NODE_ENV`** (Optional) - Node environment (`development`, `production`, etc.)
- **`LOG_LEVEL`** (Optional) - Logging level (`error`, `warn`, `info`, `debug`, `verbose`, `silly`, `silent`)

## Validation Rules

### Numeric Validation

Variables containing `PORT` are automatically validated to ensure they are valid positive numbers:
- `DB_PORT`
- `API_PORT`

### Format Validation

- **UUID Format**: `AUTH_JWT_SECRET` must be a valid UUID
- **User-Agent Format**: `USER_AGENT` must follow `BrandName Bot Environment/AppName/Version` and include "Bot" in the first part
- **CORS Origins**: `API_ALLOWED_CORS_ORIGINS` must contain at least one origin (comma-separated)

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

[Auth & Security]
  ✓ AUTH_JWT_SECRET - Valid UUID
  ✓ USER_AGENT - Valid format

[Database]
  ✓ DB_HOST - Set
  ✓ DB_PORT - Set
  ...

=== Validation Summary ===
Total: 18
Passed: 18
Failed: 0
Required Missing: 0
```

## Important Notes

- **Startup abort**: If any required variable is missing or invalid, the application will abort startup with a clear error message.
- **Validation file**: See `src/lib/startup/validation.ts` for the complete validation implementation.

## Adding New Environment Variables

When adding a new environment variable to the application:

1. **Add to `src/config/index.ts`**:
   - Add the variable to the appropriate config section

2. **Add validation to `src/lib/startup/validation.ts`**:
   - Determine if the variable is required or optional
   - Add appropriate validation call in `validateAllEnvironmentVariables()`
   - Use `validateRequired()` for required vars
   - Use `validateOptional()` for optional vars
   - Add custom validation if format/type checking is needed

3. **Update this file**:
   - Add the variable to the appropriate section above
   - Document any special requirements (format, type)

4. **Update `.env.example`** (if applicable):
   - Add the variable with a comment explaining its purpose
