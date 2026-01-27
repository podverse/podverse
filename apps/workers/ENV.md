# Environment Variables

## Overview

The `podverse-workers` application uses environment variables to configure various services and modules. Unlike other application repos, this repo does not have a dedicated validation file, but it uses environment variables that are consumed by the module factories (ORM, Parser, External Services, Notifications).

Environment variables are loaded from `.env` file in development mode (production mode expects them to be set in the environment).

**Note**: This repo consumes multiple modules (podverse-orm, podverse-parser, podverse-external-services, podverse-notifications) which have their own configuration requirements. The environment variables listed here are used to build the configuration objects passed to those module factories.

## General Configuration

- **`USER_AGENT`** (Required)
  - Format: `BrandName Bot Environment/AppName/Version`
  - Must include "Bot" in the first part (before the first slash)
  - Example: `Podverse Bot Local/Workers/5`
  - Used for external API requests

- **`LOG_LEVEL`** (Optional) - Logging level (default: `info`)
  - Valid values: `error`, `warn`, `info`, `debug`, `verbose`, `silly`, `silent`

- **`LOG_DIR`** (Optional) - Log directory for file logging
  - Leave empty or unset for localhost development (console logging only)
  - Set to a directory path for file logging with daily rotation (e.g., `/app/logs` for Docker)
  - When set, logs are written to files with rotation (max 20MB per file, keep 14 days, compressed)
  - Console logs always appear in terminal regardless of this setting
  - See [logs/LOGS.md](../../logs/LOGS.md) for comprehensive LOG_DIR documentation

- **`LOG_TIMER`** (Optional) - Enable log timers (default: `false`)
  - Set to `"true"` to enable

- **`NODE_ENV`** (Optional) - Node environment (`development`, `production`, etc.)

## Podcast Index

- **`PODCAST_INDEX_AUTH_KEY`** (Required) - Podcast Index API authentication key
- **`PODCAST_INDEX_BASE_URL`** (Required) - Podcast Index API base URL
- **`PODCAST_INDEX_SECRET_KEY`** (Required) - Podcast Index API secret key
- **`PODCAST_INDEX_API_RATE_LIMIT_DELAY`** (Optional) - Rate limit delay in milliseconds for Podcast Index API requests

## Message Queue

- **`MESSAGE_QUEUE_PROTOCOL`** (Optional) - Message queue protocol (default: `amqp`)
- **`MESSAGE_QUEUE_HOST`** (Optional) - Message queue hostname (default: `localhost`)
- **`MESSAGE_QUEUE_USERNAME`** (Optional) - Message queue username (default: `user`)
- **`MESSAGE_QUEUE_PASSWORD`** (Optional) - Message queue password (default: `mysecretpw`)
- **`MESSAGE_QUEUE_PORT`** (Optional) - Message queue port (default: `5672`)

## Database (for ORM Module)

These variables are used to build the ORM configuration:

- **`DB_HOST`** (Required) - Database hostname
- **`DB_PORT`** (Required) - Database port (must be a valid number)
- **`DB_READ_USERNAME`** (Required) - Read-only database username
- **`DB_READ_PASSWORD`** (Required) - Read-only database password
- **`DB_READ_WRITE_USERNAME`** (Required) - Read-write database username
- **`DB_READ_WRITE_PASSWORD`** (Required) - Read-write database password
- **`DB_DATABASE`** (Required) - Database name
- **`DB_SSL_CONNECTION`** (Optional) - Use SSL for database connection (default: `false`)
  - Set to `"true"` to enable

- **`DEFAULT_ACCOUNT_SETTINGS_LOCALE`** (Required) - Default locale for account settings
  - Must be a valid locale from supported locales

## External Services (Firebase)

These variables are used to build the External Services configuration:

- **`GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED`** (Optional) - Enable Firebase notifications (default: `false`)
  - Set to `"true"` to enable

- **`GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH`** (Conditional) - Path to Firebase admin JSON key file
  - Required if `GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED` is `"true"`

## Web Configuration

These variables are used by both External Services and Notifications modules:

- **`WEB_PROTOCOL`** (Required) - Web protocol (`http` or `https`)
- **`WEB_DOMAIN`** (Required) - Web domain (e.g., `localhost:3000` or `podverse.fm`)
- **`WEB_ICON_IMAGE_PATH`** (Required) - Path to web icon image (e.g., `/icon.png`)

## Notifications (WebPush)

These variables are used to build the Notifications configuration:

- **`BRAND_NAME`** (Optional) - Brand name for notifications (default: empty string)

- **`WEBPUSH_ENABLED`** (Optional) - Enable WebPush notifications (default: `false`)
  - Set to `"true"` to enable

- **`WEBPUSH_VAPID_PUBLIC_KEY`** (Conditional) - WebPush VAPID public key
  - Required if `WEBPUSH_ENABLED` is `"true"`

- **`WEBPUSH_VAPID_PRIVATE_KEY`** (Conditional) - WebPush VAPID private key
  - Required if `WEBPUSH_ENABLED` is `"true"`

- **`WEBPUSH_VAPID_SUBJECT`** (Conditional) - WebPush VAPID subject (usually an email or URL)
  - Required if `WEBPUSH_ENABLED` is `"true"`

## Parser Configuration

These variables are used to build the Parser configuration:

- **`PARSER_ADD_REMOTE_ITEMS_TO_MQ`** (Optional) - Add remote items to message queue (default: `false`)
  - Set to `"true"` to enable

## Module Configuration Validation

While this repo doesn't have its own validation file, the module factories perform validation:

- **ORM Module**: Validates database configuration via `validateORMConfig()` from `podverse-helpers`
- **External Services Module**: Validates Firebase and Web configuration via `validateExternalServicesConfig()` from `podverse-helpers`
- **Parser Module**: Validates parser configuration via `validateParserConfig()` from `podverse-helpers`

If any module configuration is invalid, the application will abort with a clear error message.

## Important Notes

- **Module dependencies**: This application depends on multiple module repos. See their respective `FACTORY.md` files for detailed parameter requirements:
  - `podverse-orm/FACTORY.md`
  - `podverse-parser/FACTORY.md`
  - `podverse-external-services/FACTORY.md`
  - `podverse-notifications/FACTORY.md`

- **Configuration building**: Environment variables are used to build configuration objects in `src/index.ts` that are passed to module factories.

- **Default values**: Some variables have default values in `src/config/index.ts`, but it's recommended to set all required variables explicitly in your `.env` file.

- **Conditional requirements**: Some variables are only required when certain features are enabled (e.g., Firebase or WebPush notifications).

## Adding New Environment Variables

When adding a new environment variable:

1. **Add to `src/config/index.ts`** (if it's a general config variable):
   - Add the variable with appropriate default value

2. **Add to configuration building in `src/index.ts`** (if it's used by a module):
   - Add the variable to the appropriate module config object

3. **Update this file**:
   - Add the variable to the appropriate section above
   - Document any special requirements (format, type, conditional logic)

4. **Update `.env.example`** (if applicable):
   - Add the variable with a comment explaining its purpose
