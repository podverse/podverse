# Environment Variables

## Overview

The `podverse-workers` application uses environment variables to configure various services and modules. Environment variables are loaded from `.env` in development (production expects them in the environment). This repo consumes multiple modules (ORM, Parser, External Services, Notifications); the variables below are used to build the configuration objects passed to those module factories.

## Per-command validation

The workers app validates environment variables **per command**. Each job only validates (and only requires) the env vars it actually uses. When you run a command, you see **job-specific validation output**; if required vars for that job are missing, the FATAL message lists them. Not all variables in this document are required for every job—only those for the command you run.

**Source of truth**: Required and optional vars per category are implemented in
`apps/workers/src/lib/startup/validation.ts`; command → category mapping is in
`apps/workers/src/lib/startup/categoriesForCommand.ts`.

### Command groups and env categories

| Command group                   | Categories validated                     | Commands (examples)                                         |
| ------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| Base only                       | Base                                     | podcastIndexDeadFeedsDeleteCache                            |
| Base + ORM only                 | Base, ORM                                | archiveAll, statsUpdateAggregated, orm\*                    |
| Base + Podcast Index            | Base, PodcastIndex                       | podcastIndexTrendingPodcastsGet, podcastIndexValueUpdateAll |
| Base + ORM + Podcast Index      | Base, ORM, PodcastIndex                  | podcastIndexDeadFeedsFlagAndMerge                           |
| Base + ORM + MQ                 | Base, ORM, MQ                            | mqRSSRunDlqConsumer, mqRSSAddAll                            |
| Base + ORM + MQ + Podcast Index | Base, ORM, MQ, PodcastIndex              | mqRSSAdd                                                    |
| Base + ORM + Parser + PI + Web  | Base, ORM, Parser, PodcastIndex, Web     | parserRSSParseFeed                                          |
| Full stack                      | Base, ORM, MQ, Parser, PodcastIndex, Web | mqRSSRunParser, mqRSSRunLiveItemListener                    |

Within each category, vars are required or optional as listed in the sections below. Only the categories for your command are validated.

### Adding a new command

When you add a new worker command: (1) add it to `KNOWN_COMMANDS` in
[commandNames.ts](src/commands/commandNames.ts), (2) add it to the right group in
[categoriesForCommand.ts](src/lib/startup/categoriesForCommand.ts) so validation runs the right
env checks for that command, (3) update this doc's "Command groups and env categories" table or
examples if needed. For the full checklist (including index.ts and new categories), see the
[validation.ts](src/lib/startup/validation.ts) JSDoc and the workers skill.

## General Configuration (Base — every command)

- **`USER_AGENT`** (Required)
  - Format: `BrandName Bot Environment/AppName/Version`
  - Must include "Bot" in the first part (before the first slash)
  - Example: `Podverse Bot Local/Workers/5`
  - Used for external API requests

- **`LOG_LEVEL`** (Required) - Logging level
  - Valid values: `error`, `warn`, `info`, `debug`, `verbose`, `silly`, `silent`

- **`LOG_DIR`** (Optional) - Log directory for file logging. **No default** in any app.
  - Leave empty or unset for console-only logging (e.g. localhost or container without file logging).
  - When set, logs are written to files with daily rotation (max 20MB per file, keep 14 days, compressed).
  - When using Docker with a log volume, set to the container path that matches the mount (e.g. `/opt/logs` for workers local compose).
  - Console logs always appear in terminal regardless of this setting.
  - See [logs/LOGS.md](../../logs/LOGS.md) for LOG_DIR rules across the monorepo.

- **`LOG_TIMER`** (Optional) - Enable log timers (default: `false`)
  - Set to `"true"` to enable

- **`NODE_ENV`** (Optional) - Node environment (`development`, `production`, etc.)

## Podcast Index

- **`PODCAST_INDEX_AUTH_KEY`** (Required) - Podcast Index API authentication key
- **`PODCAST_INDEX_BASE_URL`** (Required) - Podcast Index API base URL
- **`PODCAST_INDEX_SECRET_KEY`** (Required) - Podcast Index API secret key
- **`PODCAST_INDEX_API_RATE_LIMIT_DELAY`** (Optional) - Rate limit delay in milliseconds for Podcast Index API requests

## Message Queue (commands that use MQ)

- **`MESSAGE_QUEUE_PROTOCOL`** (Required) - Message queue protocol (e.g. `amqp`)
- **`MESSAGE_QUEUE_HOST`** (Required) - Message queue hostname
- **`MESSAGE_QUEUE_USERNAME`** (Required) - Message queue username
- **`MESSAGE_QUEUE_PASSWORD`** (Required) - Message queue password
- **`MESSAGE_QUEUE_PORT`** (Required) - Message queue port

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

## Module configuration validation

Startup validation runs **per command** before config or modules load. The validator in
`src/lib/startup/validation.ts` checks only the env vars for the categories used by that command
(see "Command groups and env categories" above). Output matches api/management-api style: categories,
checkmarks, summary, and a FATAL message with the list of missing required vars if validation fails.

## Important Notes

- **Module dependencies**: This application depends on multiple module repos. See their respective `FACTORY.md` files for detailed parameter requirements:
  - `podverse-orm/FACTORY.md`
  - `podverse-parser/FACTORY.md`
  - `podverse-external-services/FACTORY.md`
  - `podverse-notifications/FACTORY.md`

- **Configuration building**: Environment variables are used to build configuration objects in `src/index.ts` that are passed to module factories.

- **Default values**: Some variables have default values in `src/config/index.ts`, but it's recommended to set all required variables explicitly in your `.env` file.

- **Conditional requirements**: Some variables are only required when certain features are enabled (e.g., Firebase or WebPush notifications).

## Adding new environment variables

When adding a new environment variable:

1. **Add to `src/config/index.ts`** (if it's a general config variable):
   - Add the variable with appropriate default value

2. **Add to configuration building in `src/index.ts`** (if it's used by a module):
   - Add the variable to the appropriate module config object

3. **Update startup validation** (`src/lib/startup/validation.ts`):
   - Add `validateRequired` or `validateOptional` in the correct category function
   - If the var is only needed by certain commands, ensure `categoriesForCommand.ts` maps those
     commands to the right category

4. **Update this file**:
   - Add the variable to the appropriate section above
   - Document any special requirements (format, type, conditional logic)

5. **Update `.env.example`** (if applicable):
   - Add the variable with a comment explaining its purpose
