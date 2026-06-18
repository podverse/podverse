# Environment Variables

## Overview

The `podverse-api` application requires comprehensive environment variable validation on startup. All environment variables must be provided through the `.env` file - no default values are used in the configuration.

Validation occurs in `src/lib/startup/validation.ts` during application startup. The validation:

1. Checks if each variable is set
2. Validates format/type where applicable (e.g., UUID for JWT secret, numeric for ports)
3. Displays a categorized status for each variable
4. Enforces conditional requirements based on `ACCOUNT_SIGNUP_MODE`
5. Aborts startup if any required variables are missing or invalid

## Always Required Variables

These variables are **always required** regardless of configuration:

### Auth & Security

- **`AUTH_JWT_SECRET`** (Required)
  - Must be a valid UUID
  - Used for JWT token generation
  - Example: `123e4567-e89b-12d3-a456-426614174000`
  - Generate with: `uuidgen` (macOS/Linux) or use an online UUID generator
  - On Kubernetes, set in the **`podverse-api-opaque`** Secret (`create_api_secret.sh`).

- **`USER_AGENT`** (Required)
  - Non-blank. Must follow format: `BrandName Bot Environment/AppName/Version` and include "Bot" in the first part. Set an app-specific value for your deployment; do not copy another product’s string.
  - Example: `Example Bot/API/5`
  - Used for external API requests

- **`BRAND_NAME`** (Required)
  - Validated at startup. Used in transactional email display name, subject line, and HTML `title` (e.g. verification and password-reset mail).

### App database (same pattern as `DB_APP_*` in management-api; Metaboost-aligned `*_USER` keys)

- **`DB_HOST`** (Required) - Database hostname
- **`DB_PORT`** (Required) - Database port (must be a valid number)
- **`DB_APP_NAME`** (Required) - App database name (e.g. `podverse_app`)
- **`DB_APP_READ_USER`** (Required) - Read-only database user
- **`DB_APP_READ_PASSWORD`** (Required) - Read-only database password
- **`DB_APP_READ_WRITE_USER`** (Required) - Read-write database user
- **`DB_APP_READ_WRITE_PASSWORD`** (Required) - Read-write database password
- **`DB_SSL_CONNECTION`** (Optional) - Use SSL for database connection (default: `false`)

### API Configuration

- **`API_PORT`** (Required) - API server port (must be a valid number)
- **`API_PREFIX`** (Required) - API route prefix (e.g., `/api`)
- **`API_VERSION`** (Required) - API version (e.g., `v2`)
- **`COOKIE_DOMAIN`** (Required) - Domain for cookies
- **`API_ALLOWED_CORS_ORIGINS`** (Required) - Comma-separated list of allowed CORS origins (must contain at least one origin)

### App / General

- **`SERVER_ENV`** (Required) - Server environment
  - Must be one of: `prod`, `beta`, `alpha`, `local`
  - Controls environment-specific behavior (e.g., bypassing free trial restrictions in non-production environments)

### Web

- **`WEB_PROTOCOL`** (Required) - Web protocol (`http` or `https`)
- **`WEB_DOMAIN`** (Required) - Web domain (e.g., `localhost:3000` or `podverse.fm`)
- **`WEB_ICON_IMAGE_PATH`** (Optional) - **Absolute** URL for the web app icon in notifications/push. When set, must start with `http://` or `https://`. If unset, the icon URL is left empty. For local dev, a typical value is `http://localhost:3002/favicon/web-app-manifest-192x192.png` (Next.js on port 3002). See `apps/workers/ENV.md` for the same variable.

### Message Queue

- **`MESSAGE_QUEUE_PROTOCOL`** (Required) - Message queue protocol (e.g., `amqp`)
- **`MESSAGE_QUEUE_HOST`** (Required) - Message queue hostname
- **`MESSAGE_QUEUE_USERNAME`** (Required) - Message queue username
- **`MESSAGE_QUEUE_PASSWORD`** (Required) - Message queue password
- **`MESSAGE_QUEUE_PORT`** (Required) - Message queue port (must be a valid number)

### Key-Value DB

- **`KEYVALDB_HOST`** (Required) - Key-value database hostname
- **`KEYVALDB_PORT`** (Required) - Key-value database port (must be a valid number)
- **`KEYVALDB_PASSWORD`** (Required) - Key-value database password
- **`KEYVALDB_CACHE_EXPIRATION`** (Required) - KeyValDB cache time-to-live in seconds (integer > 0)

### Podcast Index

- **`PODCAST_INDEX_AUTH_KEY`** (Required) - Podcast Index API authentication key
- **`PODCAST_INDEX_BASE_URL`** (Required) - Podcast Index API base URL
- **`PODCAST_INDEX_SECRET_KEY`** (Required) - Podcast Index API secret key
- **`PODCAST_INDEX_API_RATE_LIMIT_DELAY`** (Optional) - Delay in milliseconds between Podcast
  Index API requests. Default is `200`. Set to `0` to disable.
- **`PODCAST_INDEX_API_MAX_RETRIES`** (Optional) - Retries after the first failed Podcast Index
  API request. Default is `3` (four total attempts including the initial request).
- **`PODCAST_INDEX_API_RETRY_BASE_DELAY_MS`** (Optional) - Base delay in milliseconds for
  exponential backoff between Podcast Index API retries. Default is `5000`.
- **`PODCAST_INDEX_SEARCH_MAX`** (Optional) - Maximum results per Podcast Index search request.
  Default is `50`.

### Premium/Membership

- **`ACCOUNT_SIGNUP_MODE`** (Required) - Must be `'admin_only_username'`, `'admin_only_email'`, or `'user_signup_email'` (no default value)
  - Must be explicitly set - no default value is assumed
  - When set to `'user_signup_email'`: Enables public user registration with email and requires additional email/mailer configuration
  - When set to `'admin_only_email'`: Accounts created by management admin only, requires email
  - When set to `'admin_only_username'`: Accounts created by management admin only, username-only (no email required)

## Conditionally Required Variables

These variables are **required only when `ACCOUNT_SIGNUP_MODE` is set to `'user_signup_email'`**. When `ACCOUNT_SIGNUP_MODE` is `'admin_only_email'` or `'admin_only_username'`, these variables are optional.

### Mailer

The mailer is automatically disabled when `ACCOUNT_SIGNUP_MODE` is not `'user_signup_email'`, or when any required mailer env var (`MAILER_HOST`, `MAILER_PORT`, `MAILER_USERNAME`, `MAILER_PASSWORD`, `MAILER_FROM`) is not set. No explicit `MAILER_DISABLED` flag is needed.

- **`MAILER_HOST`** (Required when signup mode is 'user_signup_email') - SMTP server hostname
- **`MAILER_PORT`** (Required when signup mode is 'user_signup_email') - SMTP server port (must be a valid number)
- **`MAILER_USERNAME`** (Required when signup mode is 'user_signup_email') - SMTP username. On Kubernetes, set in the `podverse-mailer-opaque` Secret (`create_mailer_secret.sh`), not the ConfigMap.
- **`MAILER_PASSWORD`** (Required when signup mode is 'user_signup_email') - SMTP password. On Kubernetes, set in the `podverse-mailer-opaque` Secret, not the ConfigMap.
- **`MAILER_FROM`** (Required when signup mode is 'user_signup_email') - Email sender address

### Legal entity

- **`LEGAL_NAME`** (Required when signup mode is 'user_signup_email') - Legal or display business name (e.g. Podverse LLC). `config.legal.name` (e.g. HTML email footer, other call sites).
- **`LEGAL_ADDRESS`** (Required when signup mode is 'user_signup_email') - Legal or mailing address. `config.legal.address`.

For local development, set both in [`legal.env`](/dev/env-overrides/local/legal.env.example). Run `make local_env_setup` to apply.

### Email Configuration

- **`BRAND_COLOR_PRIMARY`** (Required when signup mode is 'user_signup_email') - Primary brand accent as a CSS color (e.g. hex). Used for **HTML email** CTAs and other server-side brand styling. For local development, set in [`brand.env`](/dev/env-overrides/local/brand.env.example). If **`NEXT_PUBLIC_BRAND_THEME_COLOR`** is not set in `brand.env`, `make local_env_setup` copies **`BRAND_COLOR_PRIMARY`** into the web/management-web sidecar as the app UI / browser-chrome tint unless you override.
- **`BRAND_BANNER_IMAGE_3X1_URL`** (Required when signup mode is 'user_signup_email') - Absolute **`http`/`https` URL** for the 3:1 brand banner image. Today this is used in the API’s HTML **email** template; set it in [`brand.env`](/dev/env-overrides/local/brand.env.example) for local overrides. The conventional path on the public web app is **`/branding/banner_3x1.png`** (file: `apps/web/public/branding/banner_3x1.png` in the repo). For local email testing, use your dev web origin, e.g. `http://localhost:3000/branding/banner_3x1.png` if the web app serves on that port.

For local setup, set [legal entity](#legal-entity) in [`legal.env`](/dev/env-overrides/local/legal.env.example), **`BRAND_COLOR_PRIMARY`** and **`BRAND_BANNER_IMAGE_3X1_URL`** in [`brand.env`](/dev/env-overrides/local/brand.env.example), then run `make local_env_setup`.

### Token Expiration

- **`AUTH_JWT_EXPIRATION`** (Optional) - Session JWT and auth cookie max-age, in seconds (default: 31536000). Values ending with `_EXPIRATION` are always integer seconds.

- **`VERIFY_EMAIL_TOKEN_EXPIRATION`** (Required when signup mode is 'user_signup_email') - Email verification token lifetime in seconds (integer > 0)
- **`EMAIL_CHANGE_VERIFICATION_TOKEN_EXPIRATION`** (Required when signup mode is 'user_signup_email') - Email change verification token lifetime in seconds (integer > 0)
- **`RESET_PASSWORD_TOKEN_EXPIRATION`** (Required when signup mode is 'user_signup_email') - Password reset token lifetime in seconds (integer > 0)

## Optional Variables

These variables are optional but will still be validated if set:

### Premium/Membership

- **`MEMBERSHIP_PREMIUM_COST_MONTHLY`** (Optional) - Monthly premium membership cost (default: 3)
- **`MEMBERSHIP_PREMIUM_COST_ANNUALLY`** (Optional) - Annual premium membership cost (default: 30)
- **`MEMBERSHIP_FREE_TRIAL_EXPIRATION`** (Optional) - Free trial length in seconds (default: 2678400, 31×86400). **Bootstrap / fallback:** after linear migrations `0030_product_membership_settings.sql` and `0031_product_membership_settings_caps.sql` apply, the canonical trial length and RSS/refresh caps for new signups and resolved membership APIs live in `product_membership_settings` in the app database (seeded from env when missing). Env remains required for startup validation and seeds fresh installs; changing env alone does not override an existing DB row until you update the row (management Products → Memberships) or adjust env and re-seed.

### Social Media

These variables are used when signup mode is 'user_signup_email' but are not required (defaults: Podverse URLs and images for Facebook, GitHub, Twitter; Reddit optional/empty).

- **`SOCIAL_FACEBOOK_PAGE_URL`** (Optional) - Facebook page URL
- **`SOCIAL_FACEBOOK_IMAGE_URL`** (Optional) - Facebook image URL
- **`SOCIAL_GITHUB_PAGE_URL`** (Optional) - GitHub page URL
- **`SOCIAL_GITHUB_IMAGE_URL`** (Optional) - GitHub image URL
- **`SOCIAL_REDDIT_PAGE_URL`** (Optional) - Reddit page URL
- **`SOCIAL_REDDIT_IMAGE_URL`** (Optional) - Reddit image URL
- **`SOCIAL_TWITTER_PAGE_URL`** (Optional) - Twitter/X page URL
- **`SOCIAL_TWITTER_IMAGE_URL`** (Optional) - Twitter/X image URL

For local setup, these can be customized via `dev/env-overrides/local/socials.env`; run `make local_env_setup` to apply.

### PayPal

- **`PAYPAL_CLIENT_ID`** (Optional) - PayPal client ID for payment processing
- **`PAYPAL_CLIENT_SECRET`** (Optional) - PayPal client secret for payment processing

### WebPush (optional)

When **`WEBPUSH_ENABLED`** is `true`, the API uses **`WEBPUSH_VAPID_PUBLIC_KEY`**, **`WEBPUSH_VAPID_PRIVATE_KEY`**, and **`WEBPUSH_VAPID_SUBJECT`** (see [`apps/workers/ENV.md`](/apps/workers/ENV.md) for semantics). Set **`WEBPUSH_VAPID_SUBJECT` and the public key** in **`apps/api/.env`** (local) or the K8s ConfigMap source `infra/k8s/base/api/source/api.env` (or your `apps/.../api/source/api.env` GitOps overlay).

On **Kubernetes**, do not put **`WEBPUSH_VAPID_PRIVATE_KEY`** in the API ConfigMap: use the same Secret as workers, **`podverse-workers-webpush-opaque`**, which is mounted on the API deployment via `envFrom` (see `infra/k8s/base/api/deployment.yaml`).

### MetaBoost Standard Endpoint (mbrss-v1)

Signing keys for [AppAssertion](https://github.com/podverse/metaboost/blob/main/docs/api/STANDARD-ENDPOINT-APP-SIGNING.md) JWTs minted by `POST /api/v2/metaboost/mbrss-v1/mint-app-assertion`. The public key must be registered in [metaboost-registry](https://github.com/v4v-io/metaboost-registry) for the same `app_id` as **`METABOOST_APP_ASSERTION_ISS`**. On Kubernetes, set **`METABOOST_SIGNING_KEY_PEM`** and **`METABOOST_APP_ASSERTION_ISS`** in the **`podverse-metaboost-opaque`** Secret (`create_metaboost_secret.sh`).

Clients must send an **authenticated Podverse session** (cookie or `Authorization` bearer JWT); mint returns **401** without a logged-in user. Signing env vars alone are not sufficient. The mint endpoint is rate-limited to **one mint per user per minute** (HTTP **429** when exceeded). **`GET /api/v2/metaboost/mbrss-v1/mint-app-assertion/rate-limit-status`** uses the same limit (peek only; does not consume a slot) and returns JSON including **`allowed`**, **`retryAfterMs`**, and **`timeUntilResetMs`** so clients can show wait time before attempting payment.

- **`METABOOST_SIGNING_KEY_PEM`** (Optional; required together with **`METABOOST_APP_ASSERTION_ISS`** to enable minting) – Ed25519 private key in PKCS#8 PEM format. Use `\n` in the env file for newlines when storing on one line. If either this or **`METABOOST_APP_ASSERTION_ISS`** is unset, `POST .../mint-app-assertion` returns **503** with a message that Metaboost is not configured.
- **`METABOOST_APP_ASSERTION_ISS`** (Optional; required together with **`METABOOST_SIGNING_KEY_PEM`** to enable minting) – `iss` claim / registered `app_id`. **No default.** Leave unset when this Podverse deployment does not use Metaboost AppAssertion. Startup validation treats the pair as optional but **fails** if exactly one of the two is set (set both or neither).

### Add-by-RSS

Add-by-RSS allows users to follow RSS feeds (podcasts, music) not in the main directory. Optional HTTP Basic Auth credentials (username/password) can be provided when adding a feed; they are stored per-feed in the database (`account_following_add_by_rss_channel`).

- **`ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY`** (Required) – Basic Auth credentials are encrypted at rest using AES-256-GCM. Must be exactly 64 hex characters (32 bytes). Generate with: `openssl rand -hex 32`. The value is passed into the ORM via `createORMContext(config)`. See [docs/features/ADD-BY-RSS.md](/docs/features/ADD-BY-RSS.md) and key-rotation procedure there.
- **`ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD`** (Optional) – During key rotation only. When set, the app decrypts with the current key first, then with this old key, so existing ciphertext remains readable until the re-encryption script has run. Remove after rotation.

### General

- **`NODE_ENV`** (Optional) - Node environment (`development`, `production`, etc.)
- **`LOG_LEVEL`** (Optional) - Logging level (`error`, `warn`, `info`, `debug`, `verbose`, `silly`, `silent`)
- **`LOG_DIR`** (Optional) - Log directory for file logging. **No default.** Leave empty for console-only; when set in Docker with a log volume, use the container path (e.g. `/opt/logs`). See [logs/LOGS.md](/logs/LOGS.md).

## Validation Rules

### Numeric Validation

Variables whose names end with `_EXPIRATION`, or that contain `PORT`, are automatically validated (numeric; `_EXPIRATION` values are positive when required):

- `DB_PORT`
- `API_PORT`
- `MESSAGE_QUEUE_PORT`
- `KEYVALDB_PORT`
- `KEYVALDB_CACHE_EXPIRATION`
- `AUTH_JWT_EXPIRATION`
- `MEMBERSHIP_FREE_TRIAL_EXPIRATION`
- `MAILER_PORT`
- `VERIFY_EMAIL_TOKEN_EXPIRATION`
- `EMAIL_CHANGE_VERIFICATION_TOKEN_EXPIRATION`
- `RESET_PASSWORD_TOKEN_EXPIRATION`

### Format Validation

- **UUID Format**: `AUTH_JWT_SECRET` must be a valid UUID
- **User-Agent Format**: `USER_AGENT` must be set and follow `BrandName Bot Environment/AppName/Version` and include "Bot" in the first part
- **CORS Origins**: `API_ALLOWED_CORS_ORIGINS` must contain at least one origin (comma-separated)

## Validation Output

During startup, the validation displays:

- A categorized list of all environment variables
- Status indicator (✓ for valid, ✗ for invalid)
- Whether the variable is required or optional
- Conditional requirements (e.g., "required when signup mode is 'user_signup_email'")
- A message indicating the validation result
- A summary with totals and counts

Example output:

```
=== Environment Variable Validation ===

[Auth & Security]
  ✓ AUTH_JWT_SECRET - Valid UUID
  ✓ BRAND_NAME - Set
  ✓ USER_AGENT - Valid format

[App database]
  ✓ DB_HOST - Set
  ✓ DB_PORT - Set
  ✓ DB_APP_NAME - Set
  ...

=== Validation Summary ===
Total: 45
Passed: 42
Failed: 3
Required Missing: 2
```

## Important Notes

- **No default values**: The application must 100% depend on values from the `.env` file. All defaults have been removed from `config/index.ts`.
- **Conditional requirements**: Always check `ACCOUNT_SIGNUP_MODE` when determining if mailer, email config, social media, token expiration, and page path variables are required.
- **Startup abort**: If any required variable is missing or invalid, the application will abort startup with a clear error message.
- **Validation file**: See `src/lib/startup/validation.ts` for the complete validation implementation.

## Adding New Environment Variables

When adding a new environment variable to the application:

1. **Add to `src/config/index.ts`**:
   - Remove any default values (use `process.env.VAR_NAME!`)
   - Add the variable to the appropriate config section

2. **Add validation to `src/lib/startup/validation.ts`**:
   - Determine if the variable is:
     - Always required
     - Conditionally required (based on `ACCOUNT_SIGNUP_MODE` or other conditions)
     - Optional
   - Add appropriate validation call in `validateAllEnvironmentVariables()`
   - Use `validateRequired()` for required vars
   - Use `validateOptional()` for optional vars
   - Add custom validation if format/type checking is needed

3. **Update this file**:
   - Add the variable to the appropriate section above
   - Document any special requirements (format, type, conditional logic)

4. **Update `.env.example`** (if applicable):
   - Add the variable with a comment explaining its purpose
