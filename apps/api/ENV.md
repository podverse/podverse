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

- **`USER_AGENT`** (Required when set; may be blank)
  - When set, must follow format: `BrandName Bot Environment/AppName/Version` and include "Bot" in the first part
  - When blank, effective value is built from `BRAND_NAME` + suffix at runtime
  - Example: `Podverse Bot Local/API/5`
  - Used for external API requests

- **`BRAND_NAME`** (Required)
  - Validated at startup. Used when `USER_AGENT` is blank to build the effective User-Agent string.

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

### App / General

- **`SERVER_ENV`** (Required) - Server environment
  - Must be one of: `prod`, `beta`, `alpha`, `local`
  - Controls environment-specific behavior (e.g., bypassing free trial restrictions in non-production environments)

### Web

- **`WEB_PROTOCOL`** (Required) - Web protocol (`http` or `https`)
- **`WEB_DOMAIN`** (Required) - Web domain (e.g., `localhost:3000` or `podverse.fm`)

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
- **`KEYVALDB_CACHE_TTL_SECONDS`** (Required) - Cache TTL in seconds (must be a valid number)

### Podcast Index

- **`PODCAST_INDEX_AUTH_KEY`** (Required) - Podcast Index API authentication key
- **`PODCAST_INDEX_BASE_URL`** (Required) - Podcast Index API base URL
- **`PODCAST_INDEX_SECRET_KEY`** (Required) - Podcast Index API secret key

### Premium/Membership

- **`ACCOUNT_SIGNUP_MODE`** (Required) - Must be either `'sign-up'` or `'contact-only'` (no default value)
  - Must be explicitly set - no default value is assumed
  - When set to `'sign-up'`: Enables user registration and requires additional email/mailer configuration
  - When set to `'contact-only'`: Disables user registration, email/mailer config becomes optional

## Conditionally Required Variables

These variables are **required only when `ACCOUNT_SIGNUP_MODE` is set to `'sign-up'`**. When `ACCOUNT_SIGNUP_MODE` is `'contact-only'`, these variables are optional.

### Mailer

- **`MAILER_DISABLED`** (Optional) - Disable mailer (default: `false`)
- **`MAILER_SERVICE`** (Optional) - Email service name (e.g. for nodemailer); optional when using SMTP host/port
- **`MAILER_HOST`** (Required when signup mode is 'sign-up') - SMTP server hostname
- **`MAILER_PORT`** (Required when signup mode is 'sign-up') - SMTP server port (must be a valid number)
- **`MAILER_USERNAME`** (Required when signup mode is 'sign-up') - SMTP username
- **`MAILER_PASSWORD`** (Required when signup mode is 'sign-up') - SMTP password
- **`MAILER_FROM`** (Required when signup mode is 'sign-up') - Email sender address

### Email Configuration

- **`EMAIL_BRAND_COLOR`** (Required when signup mode is 'sign-up') - Brand color for email templates (default: #2968B1)
- **`EMAIL_HEADER_IMAGE_URL`** (Required when signup mode is 'sign-up') - URL for email header image (default: Podverse logo)
- **`LEGAL_NAME`** (Required when signup mode is 'sign-up') - Legal business name (default: Podverse LLC)
- **`LEGAL_ADDRESS`** (Required when signup mode is 'sign-up') - Legal business address (default: Chicago, IL, USA)

For local setup, these can be customized via `dev/env-overrides/local/email-template.env`; run `make local_env_setup` to apply.

### Token Expiration

- **`VERIFY_EMAIL_TOKEN_EXPIRATION`** (Required when signup mode is 'sign-up') - Email verification token expiration in seconds (must be a valid number)
- **`EMAIL_CHANGE_VERIFICATION_TOKEN_EXPIRATION`** (Required when signup mode is 'sign-up') - Email change verification token expiration in seconds (must be a valid number)
- **`RESET_PASSWORD_TOKEN_EXPIRATION`** (Required when signup mode is 'sign-up') - Password reset token expiration in seconds (must be a valid number)

### Page Paths

- **`VERIFY_EMAIL_PAGE_PATH`** (Required when signup mode is 'sign-up') - Path to email verification page (e.g., `/verify-email`)
- **`EMAIL_CHANGE_VERIFICATION_PAGE_PATH`** (Required when signup mode is 'sign-up') - Path to email change verification page (e.g., `/verify-email-change`)
- **`RESET_PASSWORD_PAGE_PATH`** (Required when signup mode is 'sign-up') - Path to password reset page (e.g., `/reset-password`)

## Optional Variables

These variables are optional but will still be validated if set:

### Premium/Membership

- **`PREMIUM_MEMBERSHIP_COST_MONTHLY`** (Optional) - Monthly premium membership cost (default: 3)
- **`PREMIUM_MEMBERSHIP_COST_ANNUALLY`** (Optional) - Annual premium membership cost (default: 30)
- **`FREE_TRIAL_EXPIRATION`** (Optional) - Free trial expiration duration in days (default: 31)

### Social Media

These variables are used when signup mode is 'sign-up' but are not required (defaults: Podverse URLs and images for Facebook, GitHub, Twitter; Reddit optional/empty).

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

### MetaBoost Standard Endpoint (mbrss-v1)

Signing keys for [AppAssertion](https://github.com/podverse/metaboost/blob/main/docs/api/STANDARD-ENDPOINT-APP-SIGNING.md) JWTs minted by `POST /api/v2/metaboost/mbrss-v1/mint-app-assertion`. The public key must be registered in [metaboost-registry](https://github.com/v4v-io/metaboost-registry) for the same `app_id` as **`METABOOST_APP_ASSERTION_ISS`**.

Clients must send an **authenticated Podverse session** (cookie or `Authorization` bearer JWT); mint returns **401** without a logged-in user. Signing env vars alone are not sufficient. The mint endpoint is rate-limited to **one mint per user per minute** (HTTP **429** when exceeded). **`GET /api/v2/metaboost/mbrss-v1/mint-app-assertion/rate-limit-status`** uses the same limit (peek only; does not consume a slot) and returns JSON including **`allowed`**, **`retryAfterMs`**, and **`timeUntilResetMs`** so clients can show wait time before attempting payment.

- **`METABOOST_SIGNING_KEY_PEM`** (Optional; required together with **`METABOOST_APP_ASSERTION_ISS`** to enable minting) – Ed25519 private key in PKCS#8 PEM format. Use `\n` in the env file for newlines when storing on one line. If either this or **`METABOOST_APP_ASSERTION_ISS`** is unset, `POST .../mint-app-assertion` returns **503** with a message that Metaboost is not configured.
- **`METABOOST_APP_ASSERTION_ISS`** (Optional; required together with **`METABOOST_SIGNING_KEY_PEM`** to enable minting) – `iss` claim / registered `app_id`. **No default.** Leave unset when this Podverse deployment does not use Metaboost AppAssertion. Startup validation treats the pair as optional but **fails** if exactly one of the two is set (set both or neither).

### Add-by-RSS

Add-by-RSS allows users to follow RSS feeds (podcasts, music) not in the main directory. Optional HTTP Basic Auth credentials (username/password) can be provided when adding a feed; they are stored per-feed in the database (`account_following_add_by_rss_channel`).

- **`ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY`** (Required) – Basic Auth credentials are encrypted at rest using AES-256-GCM. Must be exactly 64 hex characters (32 bytes). Generate with: `openssl rand -hex 32`. The value is passed into the ORM via `createORMContext(config)`. See [docs/features/ADD-BY-RSS.md](../../docs/features/ADD-BY-RSS.md) and key-rotation procedure there.
- **`ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD`** (Optional) – During key rotation only. When set, the app decrypts with the current key first, then with this old key, so existing ciphertext remains readable until the re-encryption script has run. Remove after rotation.

### General

- **`NODE_ENV`** (Optional) - Node environment (`development`, `production`, etc.)
- **`LOG_LEVEL`** (Optional) - Logging level (`error`, `warn`, `info`, `debug`, `verbose`, `silly`, `silent`)
- **`LOG_DIR`** (Optional) - Log directory for file logging. **No default.** Leave empty for console-only; when set in Docker with a log volume, use the container path (e.g. `/opt/logs`). See [logs/LOGS.md](../../logs/LOGS.md).

## Validation Rules

### Numeric Validation

Variables containing `PORT`, `EXPIRATION`, or `CACHE_TTL` are automatically validated to ensure they are valid positive numbers:

- `DB_PORT`
- `API_PORT`
- `MESSAGE_QUEUE_PORT`
- `KEYVALDB_PORT`
- `KEYVALDB_CACHE_TTL_SECONDS`
- `MAILER_PORT`
- `VERIFY_EMAIL_TOKEN_EXPIRATION`
- `EMAIL_CHANGE_VERIFICATION_TOKEN_EXPIRATION`
- `RESET_PASSWORD_TOKEN_EXPIRATION`

### Format Validation

- **UUID Format**: `AUTH_JWT_SECRET` must be a valid UUID
- **User-Agent Format**: `USER_AGENT` (when set) or the effective value built from `BRAND_NAME` must follow `BrandName Bot Environment/AppName/Version` and include "Bot" in the first part
- **CORS Origins**: `API_ALLOWED_CORS_ORIGINS` must contain at least one origin (comma-separated)

## Validation Output

During startup, the validation displays:

- A categorized list of all environment variables
- Status indicator (✓ for valid, ✗ for invalid)
- Whether the variable is required or optional
- Conditional requirements (e.g., "required when signup mode is 'sign-up'")
- A message indicating the validation result
- A summary with totals and counts

Example output:

```
=== Environment Variable Validation ===

[Auth & Security]
  ✓ AUTH_JWT_SECRET - Valid UUID
  ✓ BRAND_NAME - Set
  ✓ USER_AGENT - Valid format

[Database]
  ✓ DB_HOST - Set
  ✓ DB_PORT - Set
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
