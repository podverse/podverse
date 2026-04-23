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

### Database (one Postgres, shared `DB_HOST` / `DB_PORT`)

The main API, workers, and management-api all use shared `DB_HOST` and `DB_PORT` for a single PostgreSQL instance. The **app** data uses `DB_APP_*`; the **management** (admin) database uses `DB_MANAGEMENT_*` (management-api only). Credential key names use `*_USER` (not `*_USERNAME`).

**Shared (one connection endpoint):**

- **`DB_HOST`** (Required) - PostgreSQL hostname
- **`DB_PORT`** (Required) - PostgreSQL port (must be a valid number)
- **`DB_SSL_CONNECTION`** (Optional) - Use SSL to this host (default: `false`; applies to both logical databases on this host)

**Main app database (`DB_APP_*`):**

- **`DB_APP_NAME`** (Required) - Database name (e.g. `podverse_app`)
- **`DB_APP_READ_USER`** / **`DB_APP_READ_PASSWORD`**
- **`DB_APP_READ_WRITE_USER`** / **`DB_APP_READ_WRITE_PASSWORD`**

**Management database (`DB_MANAGEMENT_*`):**

- **`DB_MANAGEMENT_NAME`** (Required) - Database name (e.g. `podverse_management`)
- **`DB_MANAGEMENT_READ_USER`** / **`DB_MANAGEMENT_READ_PASSWORD`**
- **`DB_MANAGEMENT_READ_WRITE_USER`** / **`DB_MANAGEMENT_READ_WRITE_PASSWORD`**

**Kubernetes:** `DB_HOST` / `DB_PORT` / `DB_SSL_CONNECTION` are non-secret in the management-api ConfigMap. `DB_MANAGEMENT_*` credentials come from `podverse-management-db-opaque`. `DB_APP_*` credentials for the app database come from the same main DB secret as the API (`podverse-db-opaque`); the management-api Deployment includes both secrets. Generate with `infra/k8s/scripts/create_db_secret.sh` and `create_management_db_secret.sh` as needed.

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
- **`LOG_DIR`** (Optional) - Log directory for file logging. **No default.** Leave empty for console-only; when set in Docker with a log volume, use the container path (e.g. `/opt/logs`). See [logs/LOGS.md](../../logs/LOGS.md).

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

[Postgres]
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
