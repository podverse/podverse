# Environment Variables

## Overview

The `podverse-management-api` application requires environment variable validation on startup. All environment variables must be provided through the `.env` file.

Validation occurs in `src/lib/startup/validation.ts` during application startup. The validation:

1. Checks if each variable is set
2. Validates format/type where applicable (e.g., UUID for JWT secret, numeric for ports)
3. Displays a categorized status for each variable
4. Aborts startup if any required variables are missing or invalid, exiting with code **78** (`EX_CONFIG`); every other startup failure exits 1

## Required Variables

### Auth & Security

- **`AUTH_JWT_SECRET`** (Required)
  - Must be a valid UUID
  - Used for JWT token generation
  - Example: `123e4567-e89b-12d3-a456-426614174000`
  - Generate with: `uuidgen` (macOS/Linux) or use an online UUID generator

- **`USER_AGENT`** (Required)
  - Non-blank. Format: `BrandName Bot Environment/AppName/Version`
  - Must include "Bot" in the first part (before the first slash)
  - Example: `Example Bot/Management-API/5`
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

**Kubernetes:** `DB_HOST` / `DB_PORT` / `DB_SSL_CONNECTION` are non-secret in the management-api ConfigMap. `DB_MANAGEMENT_*` credentials come from `podverse-management-db-opaque`. `DB_APP_*` credentials for the app database come from the same main DB secret as the API (`podverse-db-opaque`); the management-api Deployment includes both secrets. Generate with `infra/k8s/scripts/secret-generators/create_db_secret.sh` and `infra/k8s/scripts/secret-generators/create_management_db_secret.sh` as needed.

### KeyValDB

| Variable            | Required | Description                          |
| ------------------- | -------- | ------------------------------------ |
| `KEYVALDB_HOST`     | Yes      | Valkey hostname                      |
| `KEYVALDB_PORT`     | Yes      | Valkey port (must be a valid number) |
| `KEYVALDB_PASSWORD` | Yes      | Valkey password                      |

The management API opens one connection, used only to publish account events on the channel
`podverse:account-events` after it writes notifications; an outage drops the events and never fails
the request.

### API Configuration

- **`API_PORT`** (Required) - API server port (must be a valid number)
- **`API_PREFIX`** (Required) - API route prefix (e.g., `/api`)
- **`API_VERSION`** (Required) - API version (e.g., `v2`)
- **`COOKIE_DOMAIN`** (Required) - Domain for cookies
- **`API_ALLOWED_CORS_ORIGINS`** (Required) - Comma-separated list of allowed CORS origins (must contain at least one origin)

### Web (two origins)

Management-api builds absolute URLs for invite links. **Regular users** open the main app web (`/set-password`); **admin invite links** open the management web app (`/admins/redeem-invite-link`). Use **four** variables so each base matches [apps/web](/apps/web/ENV.md) vs [apps/management-web](/apps/management-web/ENV.md) as deployed.

- **`APP_WEB_PROTOCOL`** (Required) - Protocol for the **main app web** site (`http` or `https`). Align with main API **`WEB_PROTOCOL`**.
- **`APP_WEB_DOMAIN`** (Required) - Host (and port in dev) for apps/web, e.g. `localhost:3002` or `podverse.fm`. User invite and password-reset links use `${APP_WEB_PROTOCOL}://${APP_WEB_DOMAIN}/set-password?...`.

- **`MANAGEMENT_WEB_PROTOCOL`** (Required) - Protocol for the **management web** app.
- **`MANAGEMENT_WEB_DOMAIN`** (Required) - Host for management-web, e.g. `localhost:3102` or `management.example.com`. Admin invite links use `${MANAGEMENT_WEB_PROTOCOL}://${MANAGEMENT_WEB_DOMAIN}/admins/redeem-invite-link?...`.

## Optional Variables

### Auth & user management

- **`AUTH_SESSION_IDLE_EXPIRATION`** (Optional) - Session idle limit in seconds for every management client (default: 31536000, 365 days). Every admin login creates a server-side `admin_session` row, and a session that goes this long with no use ends. This value bounds the `pv_mgmt_auth` cookie, the web JWT it carries, and the mobile refresh JWT. Use renews it at most once a day: the session's idle expiry moves forward, the web cookie and its JWT are re-signed, and each mobile refresh issues a refresh JWT with this lifetime. Revocation is server-side and checked on every request, so ending a session takes effect on its next request. This one value sets how long web and mobile stay signed in.
- **`AUTH_ACCESS_TOKEN_EXPIRATION`** (Optional) - Access JWT lifetime in seconds for token clients, which get an access/refresh pair (the mobile app today; the web cookie is not affected) (default: 900, 15 minutes). Clients refresh it silently, so it does not change how long anyone stays signed in. It bounds how long a leaked access token works without its refresh token; shorten it only if your security policy calls for that.
- **`MANAGEMENT_API_SET_PASSWORD_EXPIRATION`** (Optional) - Set-password invite link lifetime in seconds (default: 604800, 7 days)
- **`ADMIN_SESSION_RETENTION_DAYS`** (Optional) - Days an `admin_session` row is kept after its idle expiry (default: 30). A revoked row keeps its idle expiry, so the cutoff is the same for expired and revoked rows. Blank uses the default. A set value must be a whole number of days from 1 to 3650.

Rotating `AUTH_JWT_SECRET` ends every admin session at once. Ending one session is done through the admin session endpoints and superuser force-logout.

`node apps/management-api/dist/index.js adminSessionPurge` deletes `admin_session` rows whose idle expiry is older than that window, then exits. It connects only the management database. CronJob `management-api-admin-session-purge` runs that command daily.

### General

- **`NODE_ENV`** (Optional) - Node environment (`development`, `production`, etc.)
- **`LOG_LEVEL`** (Optional) - Logging level (`error`, `warn`, `info`, `debug`, `verbose`, `silly`, `silent`)
- **`LOG_DIR`** (Optional) - Log directory for file logging. **No default.** Leave empty for console-only; when set in Docker with a log volume, use the container path (e.g. `/opt/logs`). See [logs/LOGS.md](/logs/LOGS.md).

### Product / membership marketing defaults

Optional **`MEMBERSHIP_*`** keys (trial length, premium USD prices, RSS/refresh caps) match [apps/api/ENV.md](/apps/api/ENV.md) and bootstrap `product_membership_settings` in the app database. When that row exists, **`free_trial_expiration_seconds`** (and related merged fields from the pricing catalog path) take precedence for resolution APIs; env still validates at startup and seeds empty databases.

### Object storage (optional)

When **`BUCKET_PROVIDER`** is unset, the management storage browser stays **disabled** (`GET /v2/storage` returns `{ enabled: false }`; other storage routes respond **404**).

When **`BUCKET_PROVIDER`** is set, startup validates the same **`BUCKET_*`** contract as workers (including **`BUCKET_CDN_BASE_URL`**). See [apps/workers/ENV.md](/apps/workers/ENV.md) and [docs/image-shrinking/BUCKET-PROVIDERS.md](/docs/image-shrinking/BUCKET-PROVIDERS.md).

### Billing (optional)

Account resync refetches recorded purchases from their processors, so this deployment reads the same
processor flags and credentials as the API and workers. A processor runs only when its
`*_ENABLED` flag is `true`; credentials alone never turn it on. With the flag on, every key
that processor needs is required. A processor that is not enabled is reported as skipped on
resync rather than failing it.

- **`BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS`** (Optional) - Comma-separated account ids or `id_text` values whose sandbox purchases count in production when `BILLING_SANDBOX_GRANT_ALL` is not `true`
- **`BILLING_SANDBOX_GRANT_ALL`** (Optional) - `true` grants Premium from every sandbox purchase while `NODE_ENV` is `production`. Empty leaves production on the allowlist. Live purchases always grant
- **`BILLING_ALLOW_TEST_ADAPTER`** (Optional) - `true` registers the test processor even when `NODE_ENV` is `production`; non-production always registers it
- **`BILLING_PAYPAL_ENABLED`** (Optional, default off) - `true` turns PayPal on; empty or unset keeps it off
- **`PAYPAL_CLIENT_ID`**, **`PAYPAL_CLIENT_SECRET`**, **`PAYPAL_WEBHOOK_ID`** - PayPal credentials
- **`PAYPAL_ENVIRONMENT`** (Optional) - `sandbox` or `live`; empty stays sandbox. `live` is opt-in and is independent of `NODE_ENV`
- **`BILLING_APPLE_IAP_ENABLED`** (Optional, default off) - `true` turns Apple In-App Purchase on; empty or unset keeps it off
- **`APPLE_IAP_ISSUER_ID`**, **`APPLE_IAP_KEY_ID`**, **`APPLE_IAP_PRIVATE_KEY_PATH`**, **`APPLE_IAP_BUNDLE_ID`** - App Store Server API credentials
- **`APPLE_IAP_APP_APPLE_ID`** (Optional) - Numeric App Store app id
- **`APPLE_IAP_ENVIRONMENT`** (Optional) - `sandbox` or `production`; empty stays sandbox. `production` is opt-in and is independent of `NODE_ENV`. `xcode` (local only, refused when `NODE_ENV` is `production`) reads Xcode StoreKit Testing purchases from the signed transaction the app sends and needs only `APPLE_IAP_BUNDLE_ID`
- **`BILLING_GOOGLE_PLAY_ENABLED`** (Optional, default off) - `true` turns Google Play on; empty or unset keeps it off
- **`GOOGLE_PLAY_PACKAGE_NAME`**, **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH`**, **`GOOGLE_PLAY_RTDN_PUSH_AUDIENCE`**, **`GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL`** - Google Play Developer API credentials
- **`BILLING_STRIKE_ENABLED`** (Optional, default off) - `true` turns Strike on; empty or unset keeps it off
- **`STRIKE_API_KEY`**, **`STRIKE_WEBHOOK_SECRET`** - Strike API key and webhook signing secret
- **`STRIKE_ENVIRONMENT`** - `production` or `sandbox` when Strike is enabled

On **Kubernetes**, the management API deployment mounts the same Apple and Google key files
as the API (`/var/secrets/apple-iap/AuthKey.p8`,
`/var/secrets/google-play/service-account.json`) and reads PayPal from Secret
**`podverse-billing-paypal-opaque`**. It reads Strike credentials from Secret
**`podverse-billing-strike-opaque`**. Keys are listed in
`infra/k8s/base/management-api/source/management-api.env`. See
[docs/billing/BILLING.md](/docs/billing/BILLING.md).

## Validation Rules

### Numeric Validation

Variables whose names end with `_EXPIRATION` or that contain `PORT` are automatically validated to ensure they are valid positive numbers where required:

- `DB_PORT`
- `KEYVALDB_PORT`
- `API_PORT`
- `AUTH_SESSION_IDLE_EXPIRATION`
- `AUTH_ACCESS_TOKEN_EXPIRATION`
- `MANAGEMENT_API_SET_PASSWORD_EXPIRATION`

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
