# Environment Variables

## Overview

The `podverse-workers` application uses environment variables to configure various services and modules.

### Build requirement

Worker commands run the built output (`node ./dist/index.js <command>`). You must build before running any command: from repo root run `npm run build:packages`, then from `apps/workers` run `npm run build` (or run both from root so packages and workers are built). This matches how the API is run (build then node). In development, environment variables are loaded from `apps/workers/.env` (path is resolved from the built entry file, not the shell’s current directory, so `node apps/workers/dist/index.js` from the monorepo root still works). If that file is missing, the loader falls back to a `.env` at the monorepo root. Production expects variables in the environment. This repo consumes multiple modules (ORM, Parser, External Services, Notifications); the variables below are used to build the configuration objects passed to those module factories.

## Per-command validation

The workers app validates environment variables **per command**. Each job only validates (and only requires) the env vars it actually uses. When you run a command, you see **job-specific validation output**; if required vars for that job are missing, the FATAL message lists them. Not all variables in this document are required for every job—only those for the command you run.

**Source of truth**: Required and optional vars per category are implemented in
`apps/workers/src/lib/startup/validation.ts`; command → category mapping is in
`apps/workers/src/lib/startup/categoriesForCommand.ts`.

### Command groups and env categories

| Command group                       | Categories validated                     | Commands (examples)                                                                    |
| ----------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------- |
| Base only                           | Base                                     | podcastIndexDeadFeedsDeleteCache                                                       |
| Base + ORM only                     | Base, ORM                                | archiveAll, statsUpdateAggregated, orm\*                                               |
| Base + Podcast Index                | Base, PodcastIndex                       | podcastIndexTrendingPodcastsGet, podcastIndexValueUpdateAll                            |
| Base + ORM + Podcast Index          | Base, ORM, PodcastIndex                  | podcastIndexDeadFeedsFlagAndMerge                                                      |
| Base + ORM + MQ                     | Base, ORM, MQ                            | mqRSSRunDlqConsumer, mqRSSAddAll                                                       |
| Base + MQ                           | Base, MQ                                 | devPiBulkFeedsAddFromFile                                                              |
| Base + ORM + MQ + Podcast Index     | Base, ORM, MQ, PodcastIndex              | mqRSSAdd                                                                               |
| Base + MQ + Parser + KeyValDB       | Base, MQ, Parser, KeyValDB               | mqAddByRSSRunParser                                                                    |
| Base + ORM + MQ + Parser + PI + Web | Base, ORM, MQ, Parser, PodcastIndex, Web | parserRSSParseFeed, devParserRSSParseTrendingFeeds, devParserRSSParsePodcasting20Feeds |
| Base + ORM + MQ + Image Shrink      | Base, ORM, MQ, ImageShrink               | imageShrinkRunConsumer, imageShrinkBackfill                                            |
| Base + ORM + Image Shrink           | Base, ORM, ImageShrink                   | imageShrinkCleanupOrphans, imageShrinkSourcePrune                                      |
| Full stack                          | Base, ORM, MQ, Parser, PodcastIndex, Web | mqRSSRunParser, mqRSSRunLiveItemListener                                               |

Within each category, vars are required or optional as listed in the sections below. Only the categories for your command are validated.

### Adding a new command

When you add a new worker command: (1) add it to `KNOWN_COMMANDS` in
[commandNames.ts](src/commands/commandNames.ts), (2) add it to the right group in
[categoriesForCommand.ts](src/lib/startup/categoriesForCommand.ts) so validation runs the right
env checks for that command, (3) update this doc's "Command groups and env categories" table or
examples if needed. For the full checklist (including index.ts and new categories), see the
[validation.ts](src/lib/startup/validation.ts) JSDoc and the workers skill.

## Add-by-RSS

Add-by-RSS feed parsing (e.g. `mqAddByRSSRunParser`) uses optional HTTP Basic Auth credentials stored per-feed in the database (`account_following_add_by_rss_channel`).

- **`ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY`** (Required) – Basic Auth credentials are encrypted at rest (AES-256-GCM). Must be 64 hex characters (32 bytes). Generate with: `openssl rand -hex 32`. Passed into the ORM via `createORMContext(config)`. See [docs/features/ADD-BY-RSS.md](../../docs/features/ADD-BY-RSS.md) for key-rotation procedure.
- **`ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD`** (Optional) – During key rotation only. When set, the app decrypts with the current key first, then with this old key. Remove after running the re-encryption script.

## General Configuration (Base — every command)

- **`USER_AGENT`** (Required)
  - Non-blank. Must follow format: `BrandName Bot Environment/AppName/Version` and include "Bot" in the first part. Use a deployment-specific value; do not copy another product’s string.
  - Example: `Example Bot/Workers/5`
  - Used for external API requests and HTTP clients

- **`BRAND_NAME`** (Required)
  - Validated at startup. Used for notifications.

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

These variables are required only for commands that include the Podcast Index category
(see "Command groups and env categories" above).

- **`PODCAST_INDEX_AUTH_KEY`** (Required) - Podcast Index API authentication key
- **`PODCAST_INDEX_BASE_URL`** (Required) - Podcast Index API base URL
- **`PODCAST_INDEX_SECRET_KEY`** (Required) - Podcast Index API secret key
- **`PODCAST_INDEX_API_RATE_LIMIT_DELAY`** (Optional) - Rate limit delay in milliseconds for
  Podcast Index API requests. For **`devParserRSSParseTrendingFeeds`**, the same delay is also
  applied between trending fetches and between per-feed parse steps, so long runs (many feeds)
  stay within polite bounds when set to a non-zero value.

## Message Queue (commands that use MQ)

- **`MESSAGE_QUEUE_PROTOCOL`** (Required) - Message queue protocol (e.g. `amqp`)
- **`MESSAGE_QUEUE_HOST`** (Required) - Message queue hostname
- **`MESSAGE_QUEUE_USERNAME`** (Required) - Message queue username
- **`MESSAGE_QUEUE_PASSWORD`** (Required) - Message queue password
- **`MESSAGE_QUEUE_PORT`** (Required) - Message queue port

## Image Shrink

Image shrink is optional. If **`BUCKET_PROVIDER`** is empty or unset, image shrink is disabled and these variables are not used. If **`BUCKET_PROVIDER`** is set (current supported value: `digitalocean`), image shrink is enabled and **all** of the variables listed below are required for commands that use image shrink (`imageShrinkRunConsumer`, `imageShrinkBackfill`).

- **`BUCKET_PROVIDER`** (Required when image shrink enabled) - Bucket provider (`digitalocean`)
- **`BUCKET_ACCESS_KEY`** (Required when image shrink enabled) - Bucket access key (DigitalOcean Spaces access key; not the API Personal Access Token)
- **`BUCKET_SECRET_KEY`** (Required when image shrink enabled) - Bucket secret key (DigitalOcean Spaces secret key; not the API Personal Access Token)
- **`BUCKET_REGION`** (Required when image shrink enabled) - CDN region/location (e.g. `nyc3` for DO, `us-east-1` for AWS)
- **`BUCKET_NAME`** (Required when image shrink enabled) - Image CDN bucket name (storage)
- **`BUCKET_CDN_BASE_URL`** (Required when image shrink enabled) - Public CDN base URL for the bucket (storage)
- **`IMAGE_SHRINK_WIDTH_PX`** (Required when image shrink enabled) - Target width in pixels for resized images
- **`IMAGE_SHRINK_BATCH_SIZE`** (Required when image shrink enabled) - Max images processed per batch run
- **`IMAGE_SHRINK_CONCURRENCY`** (Required when image shrink enabled) - Parallel image processing count
- **`IMAGE_SHRINK_RPS`** (Required when image shrink enabled) - Rate limit for image fetches (requests/second)
- **`IMAGE_SHRINK_RECHECK_TTL_SECONDS`** (Optional) - Minimum seconds between origin re-checks
- **`IMAGE_SHRINK_SOURCE_PRUNE_DAYS`** (Optional) - Prune source metadata after N days without resized images
- **`IMAGE_SHRINK_ORPHAN_CLEANUP_DRY_RUN`** (Optional) - Dry run cleanup (default: `true`)
- **`IMAGE_SHRINK_ORPHAN_CLEANUP_MAX_DELETE`** (Optional) - Max deletes per run (default: none)
- **`IMAGE_SHRINK_ORPHAN_CLEANUP_MIN_AGE_DAYS`** (Optional) - Skip objects newer than this age (default: `7`)
- **`IMAGE_SHRINK_ORPHAN_CLEANUP_PAGE_SIZE`** (Optional) - List page size (default: `500`)

## KeyValDB (commands that use Redis)

- **`KEYVALDB_HOST`** (Required) - Redis host
- **`KEYVALDB_PORT`** (Required) - Redis port
- **`KEYVALDB_PASSWORD`** (Required) - Redis password
- **`KEYVALDB_CACHE_TTL_SECONDS`** (Required) - Default TTL for cached entries

## Database (for ORM Module)

These variables are used to build the ORM configuration:

- **`DB_HOST`** (Required) - Database hostname
- **`DB_PORT`** (Required) - Database port (must be a valid number)
- **`DB_APP_NAME`** (Required) - App database name
- **`DB_APP_READ_USER`** (Required) - Read-only database user
- **`DB_APP_READ_PASSWORD`** (Required) - Read-only database password
- **`DB_APP_READ_WRITE_USER`** (Required) - Read-write database user
- **`DB_APP_READ_WRITE_PASSWORD`** (Required) - Read-write database password
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
  - **Kubernetes:** generate the SOPS-encrypted Secret **`podverse-workers-firebase-opaque`** with `infra/k8s/scripts/secret-generators/create_firebase_secret.sh` (local path to the JSON is only for that script). Base **API, workers, and workers CronJob** Deployments mount that Secret at **`/var/secrets/firebase`** with the key **`firebase-key.json`**. In **`workers.env` / `api.env` defaults**, set **`GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH=/var/secrets/firebase/firebase-key.json`**. The mount is **`optional: true`** so pods can start if the Secret is not applied yet; enable notifications only once the file exists in-cluster.

## Web Configuration

These variables are used by both External Services and Notifications modules:

- **`WEB_PROTOCOL`** (Required) - Web protocol (`http` or `https`)
- **`WEB_DOMAIN`** (Required) - Web domain (e.g., `localhost:3000` or `podverse.fm`)
- **`WEB_ICON_IMAGE_PATH`** (Optional) - **Absolute** URL for the web app icon used in push/FCM branding. When set, the value must start with `http://` or `https://` (validated at startup) so the asset can live on a CDN or the public web host and does not have to be bundled in the API or workers image. If unset, the icon URL is left empty. For local dev, use the icon URL your web app actually serves, for example `http://localhost:3002/favicon/web-app-manifest-192x192.png` when the Next.js app uses port 3002.

## Notifications (WebPush)

These variables are used to build the Notifications configuration:

- **`BRAND_NAME`** — Required; see General Configuration (Base). Also used as brand name for notifications.

- **`WEBPUSH_ENABLED`** (Optional) - Enable WebPush notifications (default: `false`)
  - Set to `"true"` to enable

- **`WEBPUSH_VAPID_PUBLIC_KEY`** (Conditional) - WebPush VAPID public key
  - Required if `WEBPUSH_ENABLED` is `"true"`

- **`WEBPUSH_VAPID_PRIVATE_KEY`** (Conditional) - WebPush VAPID private key
  - Required if `WEBPUSH_ENABLED` is `"true"`
  - **Kubernetes:** do not put this in the workers ConfigMap; set it in the SOPS-encrypted Secret **`podverse-workers-webpush-opaque`**, which is mounted on workers and the API. Generate with `infra/k8s/scripts/secret-generators/create_workers_webpush_secret.sh` (`--auto-gen` or interactive “generate”): it creates a VAPID pair, encrypts the private key, and—when this repo has the standard workers/web source env paths—updates `WEBPUSH_VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY` in the same copy. Alternatively paste an existing private key from `npx web-push generate-vapid-keys` and set the public keys to match.

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
