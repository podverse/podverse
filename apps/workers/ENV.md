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

| Command group                                  | Categories validated                               | Commands (examples)                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base + ORM only                                | Base, ORM                                          | archiveAll, statsPopularityRefresh, statsEventPartitionsMaintain, devStatsSeedSimulatedPopularity, devSeedLocalUserContent, notificationsPlatformPurge, accountContentLogPurge, accountSessionPurge, billingImportLegacyMembershipExpiry, billingProcessorProductAdd, billingCheckoutChannelEnable, orm\* |
| Base + ORM + Web notifications                 | Base, ORM, WebNotifications                        | notificationsTestPush                                                                                                                                                                                                                                                                                     |
| Base + ORM + Billing                           | Base, ORM, Billing                                 | billingReconcile, billingStrikeEnsureWebhook                                                                                                                                                                                                                                                              |
| Base + Podcast Index                           | Base, PodcastIndex                                 | podcastIndexTrendingPodcastsGet, podcastIndexValueUpdateAll                                                                                                                                                                                                                                               |
| Base + ORM + Podcast Index                     | Base, ORM, PodcastIndex                            | podcastIndexDeadFeedsFlagAndMerge                                                                                                                                                                                                                                                                         |
| Base + ORM + MQ                                | Base, ORM, MQ                                      | mqRSSRunDlqConsumer, mqRSSAddAll                                                                                                                                                                                                                                                                          |
| Base + MQ                                      | Base, MQ                                           | devPiBulkFeedsAddFromFile                                                                                                                                                                                                                                                                                 |
| Base + ORM + MQ + Podcast Index                | Base, ORM, MQ, PodcastIndex                        | mqRSSAdd                                                                                                                                                                                                                                                                                                  |
| Base + ORM + MQ + Parser + KeyValDB + PI       | Base, ORM, MQ, Parser, KeyValDB, PodcastIndex      | mqAddByRSSRunParser                                                                                                                                                                                                                                                                                       |
| Base + ORM + MQ + KeyValDB + PI                | Base, ORM, MQ, KeyValDB, PodcastIndex              | mqOpmlImportRun                                                                                                                                                                                                                                                                                           |
| Base + ORM + MQ + Parser + PI + Web + KeyValDB | Base, ORM, MQ, Parser, PodcastIndex, Web, KeyValDB | parserRSSParseFeed, scheduledJobsRunDue, devParserRSSParseArtistPublisherFeeds, devParserRSSParseMusicMediumFeeds, devParserRSSParsePodcasting20Feeds, devParserRSSParseTrendingFeeds, seedEmbedDemoShowcaseFeeds                                                                                         |
| Base + ORM + MQ + Image Shrink                 | Base, ORM, MQ, ImageShrink                         | imageShrinkRunConsumer, imageShrinkBackfill                                                                                                                                                                                                                                                               |
| Base + ORM + Image Shrink                      | Base, ORM, ImageShrink                             | imageShrinkCleanupOrphans, imageShrinkResetShrunken, imageShrinkResetShrunkenDryRun, imageShrinkSourcePrune                                                                                                                                                                                               |
| Full stack                                     | Base, ORM, MQ, Parser, PodcastIndex, Web, KeyValDB | mqRSSRunParser                                                                                                                                                                                                                                                                                            |
| Full stack                                     | Base, ORM, MQ, Parser, PodcastIndex, Web           | mqRSSRunLiveItemListener                                                                                                                                                                                                                                                                                  |

Within each category, vars are required or optional as listed in the sections below. Only the categories for your command are validated.

### Notifications platform command note

`notificationsPlatformPurge` validates **Base + ORM** only, so contributors can exercise retention
locally once the app database exists, without MQ or Parser categories. `scheduledJobsRunDue`
validates the full parser stack and KeyValDB, because the `feed-force-reparse` job parses a feed
in the same pass that sends admin notification campaigns.

`NOTIFICATION_RETENTION_DAYS` (Base, optional, default 30) sets how long delivered notification rows
are kept before `notificationsPlatformPurge` deletes them. The window applies to rows already stored,
so shortening it takes effect on the next run.

`SCHEDULED_JOB_RETENTION_DAYS` (Base, optional, default 30) sets how long finished `scheduled_job`
rows survive the same purge. It is deliberately separate from the notification window: those rows are
an operational record of work the platform did rather than something a user reads, so an operator
tuning inbox retention should not silently move the debugging trail.

`ACCOUNT_CONTENT_LOG_RETENTION_DAYS` (Base, optional, default 30) sets how long `account_content_log`
rows are kept before `accountContentLogPurge` deletes them. The purge uses `updated_at`, so a row
updated for a later takedown stays.

`ACCOUNT_SESSION_RETENTION_DAYS` (Base, optional, default 30) sets how long `account_session` rows
are kept after their idle expiry before `accountSessionPurge` deletes them. A revoked row keeps its
idle expiry, so a device that returns within its idle limit can still be told why it was signed out.

### Retention windows

Every window below is optional, falls back to a shared default in `@podverse/helpers`, and is
validated at startup as a number of days between 1 and 3650 — a value outside that range is a unit
mistake (seconds pasted into a field counted in days) rather than a deliberate choice.
`STATS_TRACK_EVENT_RETENTION_DAYS` starts at 31 instead, because popularity month counts read the
events.

| Variable                                | Default | Deletes                                                                                                          |
| --------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `NOTIFICATION_RETENTION_DAYS`           | 30      | Delivered `account_notification` rows                                                                            |
| `ACCOUNT_CONTENT_LOG_RETENTION_DAYS`    | 30      | Removed Content log rows (`account_content_log`)                                                                 |
| `ACCOUNT_SESSION_RETENTION_DAYS`        | 30      | Account session rows (`account_session`), counted from idle expiry                                               |
| `SCHEDULED_JOB_RETENTION_DAYS`          | 30      | Finished `scheduled_job` rows                                                                                    |
| `ON_DEMAND_PARSER_EVENT_RETENTION_DAYS` | 30      | On-demand parse request records                                                                                  |
| `STATS_TRACK_EVENT_RETENTION_DAYS`      | 90      | Raw popularity listen and open events, a whole month at a time; at least 31: popularity month counts read events |

`deleteOutdatedOnDemandParserEvent` accepts a `-days` argument that overrides its variable for a
single run, so an operator clearing a specific backlog by hand does not have to change deployment
config to do it.

### Adding a new command

When you add a new worker command: (1) add it to `KNOWN_COMMANDS` in
[commandNames.ts](src/commands/commandNames.ts), (2) add it to the right group in
[categoriesForCommand.ts](src/lib/startup/categoriesForCommand.ts) so validation runs the right
env checks for that command, (3) update this doc's "Command groups and env categories" table or
examples if needed. For the full checklist (including index.ts and new categories), see the
[validation.ts](src/lib/startup/validation.ts) JSDoc and the workers skill.

## Add-by-RSS

Add-by-RSS feed parsing (e.g. `mqAddByRSSRunParser`) receives optional HTTP Basic Auth credentials in a sealed envelope on each queue message. Credentials are opened in memory for that fetch only and are never stored. An artist feed's parse queues each album it lists as its own message on `add-by-rss-background`, re-sealing the credentials only for albums on the artist feed's own domain.

- **`ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY`** (Required) – Transit key used to open the AES-256-GCM envelope the API seals. Must be 64 hex characters (32 bytes) and match the API value. Generate with: `openssl rand -hex 32`. See [docs/features/ADD-BY-RSS.md](/docs/features/ADD-BY-RSS.md).
- **`ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD`** (Optional) – During key rotation only. Envelopes that fail with the current key are retried with this one. Remove once messages sealed with the old key have expired (15 minutes).

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
  - See [logs/LOGS.md](/logs/LOGS.md) for LOG_DIR rules across the monorepo.

- **`LOG_TIMER`** (Optional) - Enable log timers (default: `false`)
  - Set to `"true"` to enable

- **`NODE_ENV`** (Optional) - Node environment (`development`, `production`, etc.)

## Billing

Validated for every command (Base). All are optional. Local values come from
`dev/env-overrides/local/billing.env`.

- **`BILLING_WEBHOOK_PUBLIC_BASE_URL`** (Optional) - Public HTTPS base the processors deliver
  webhooks to, with no trailing slash.
- **`BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS`** (Optional) - Comma-separated account ids or `id_text`
  values whose sandbox purchases count when `NODE_ENV` is `production` and
  `BILLING_SANDBOX_GRANT_ALL` is not `true`. Outside production every sandbox purchase counts.
- **`BILLING_SANDBOX_GRANT_ALL`** (Optional) - `true` grants Premium from every sandbox purchase
  while `NODE_ENV` is `production`. Empty leaves production on the allowlist. Live purchases
  always grant.

### Billing processors (Billing category)

Commands in the Billing category register an adapter for each payment processor whose enable
flag is `true`, the same set the API registers. Credentials alone never turn a processor on.
With the flag on, every key that processor needs is required. Keys and meanings match
[`apps/api/ENV.md`](/apps/api/ENV.md#billing).

- **`BILLING_ALLOW_TEST_ADAPTER`** (Optional) - `true` registers the test processor even when
  `NODE_ENV` is `production`; non-production always registers it. The test processor has no
  voided-purchase list, so `billingReconcile` only retries its failed inbox rows.
- **`BILLING_PAYPAL_ENABLED`** (Optional, default off) - `true` turns PayPal on; empty keeps it off
- **`PAYPAL_CLIENT_ID`**, **`PAYPAL_CLIENT_SECRET`**, **`PAYPAL_WEBHOOK_ID`**, **`PAYPAL_ENVIRONMENT`**
- **`BILLING_APPLE_IAP_ENABLED`** (Optional, default off) - `true` turns Apple In-App Purchase on;
  empty keeps it off
- **`APPLE_IAP_ISSUER_ID`**, **`APPLE_IAP_KEY_ID`**, **`APPLE_IAP_PRIVATE_KEY_PATH`**,
  **`APPLE_IAP_BUNDLE_ID`**, **`APPLE_IAP_APP_APPLE_ID`**, **`APPLE_IAP_ENVIRONMENT`**
- **`APPLE_IAP_ENVIRONMENT`** - `sandbox` or `production`; empty stays sandbox. `production` is opt-in and is independent of `NODE_ENV`. `xcode`
  (local only, refused when `NODE_ENV` is `production`) needs only `APPLE_IAP_BUNDLE_ID`. Those
  purchases exist only on the device that bought them.
- **`BILLING_GOOGLE_PLAY_ENABLED`** (Optional, default off) - `true` turns Google Play on; empty
  keeps it off
- **`GOOGLE_PLAY_PACKAGE_NAME`**, **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH`**,
  **`GOOGLE_PLAY_RTDN_PUSH_AUDIENCE`**, **`GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL`**
- **`BILLING_STRIKE_ENABLED`** (Optional, default off) - `true` turns Strike on; empty keeps it off
- **`STRIKE_API_KEY`**, **`STRIKE_WEBHOOK_SECRET`**, **`STRIKE_ENVIRONMENT`**
- **`STRIKE_ENVIRONMENT`** - `production` or `sandbox` when Strike is enabled

`billingStrikeEnsureWebhook` creates or updates the Strike subscription for
`<BILLING_WEBHOOK_PUBLIC_BASE_URL>/api/v2/billing/webhooks/strike` (`receive-request.receive-completed`,
webhook version `v1`). Strike must be enabled, and `BILLING_WEBHOOK_PUBLIC_BASE_URL` must be set;
the command exits when that URL is empty. The log line is the subscription id. The webhook
secret is not logged.

On **Kubernetes**, the same keys are listed in `infra/k8s/base/workers/source/workers.env`.
CronJob `worker-billing-reconcile` mounts **`podverse-billing-apple-iap-opaque`** at
**`/var/secrets/apple-iap/AuthKey.p8`** and **`podverse-billing-google-play-opaque`** at
**`/var/secrets/google-play/service-account.json`**, and reads PayPal from
**`podverse-billing-paypal-opaque`** and Strike from
**`podverse-billing-strike-opaque`**. Leave each `_PATH` empty until that secret is applied, and
set the matching `*_ENABLED` flag to `true` before that processor registers.
See [docs/billing/BILLING.md](/docs/billing/BILLING.md).

### v4 membership expiry (`billingImportLegacyMembershipExpiry`)

Base + ORM only. It does not read payment-processor credentials. Leave the v4 database
alone until the v4 to v5 account migration is underway and v5 already has those emails.
Input format and grant rules:
[v4 membership carryover](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover).

### Billing setup (`billingProcessorProductAdd`, `billingCheckoutChannelEnable`)

These commands add rows. They never update or remove a row that already exists, so a mapping
or channel edited in management stays as management left it. PayPal and Strike product ids are
fixed in code (`--defaults`). Apple and Google ids are arguments, not env vars. Recommended
Apple ids are in [BILLING-APPLE-SANDBOX.md](/docs/billing/BILLING-APPLE-SANDBOX.md).

## Podcast Index

These variables are required only for commands that include the Podcast Index category
(see "Command groups and env categories" above).

- **`PODCAST_INDEX_BASE_URL`** (Required) - Podcast Index API base URL
- **`PODCAST_INDEX_DUPLICATE_MERGE_MODE`** (Required) - `off`, `dry_run`, or `apply`. `off` skips
  the merge pass. `dry_run` and `apply` record detected duplicate pairs. The job still
  downloads the CSV when `PODCAST_INDEX_DEAD_FEED_RETIRE_MODE` is not `off`.
- **`PODCAST_INDEX_DEAD_FEED_RETIRE_MODE`** (Required) - `off`, `dry_run`, or `apply`. `off` skips
  the retire pass. `dry_run` stores the eligible-count baseline and changes no lifecycle.
  `apply` retires feeds.
- **`PODCAST_INDEX_AUTH_KEY`** (Required) - Podcast Index API authentication key
- **`PODCAST_INDEX_SECRET_KEY`** (Required) - Podcast Index API secret key
- **`PODCAST_INDEX_API_RATE_LIMIT_DELAY`** (Optional) - Rate limit delay in milliseconds for
  Podcast Index API requests. Default is `200`. Set to `0` to disable. For
  **`devParserRSSParseTrendingFeeds`** and **`devParserRSSParseMusicMediumFeeds`**, the same
  delay is also applied between Podcast Index list fetches and between per-feed parse steps, so
  long runs (many feeds) stay within polite bounds when set to a non-zero value.
- **`PODCAST_INDEX_API_MAX_RETRIES`** (Optional) - Retries after the first failed Podcast Index
  API request. Default is `3` (four total attempts including the initial request).
- **`PODCAST_INDEX_API_RETRY_BASE_DELAY_MS`** (Optional) - Base delay in milliseconds for
  exponential backoff between Podcast Index API retries. Default is `5000`.

## Message Queue (commands that use MQ)

- **`MESSAGE_QUEUE_PROTOCOL`** (Required) - Message queue protocol (e.g. `amqp`)
- **`MESSAGE_QUEUE_HOST`** (Required) - Message queue hostname
- **`MESSAGE_QUEUE_USERNAME`** (Required) - Message queue username
- **`MESSAGE_QUEUE_PASSWORD`** (Required) - Message queue password
- **`MESSAGE_QUEUE_PORT`** (Required) - Message queue port

## Image Shrink

Image shrink is optional. If **`BUCKET_PROVIDER`** is empty or unset, image shrink is disabled and these variables are not used. If **`BUCKET_PROVIDER`** is set to a supported value (`digitalocean`, `aws-s3`, `backblaze-b2`, `garage`, `s3-compatible`), image shrink is enabled and the bucket plus throughput variables below are required for commands that use image shrink (`imageShrinkRunConsumer`, `imageShrinkBackfill`, `imageShrinkCleanupOrphans`, …). **`IMAGE_SHRINK_WIDTH_PX`** and **`IMAGE_SHRINK_WEBP_QUALITY`** are optional and default to **400** and **92** when unset. See **`docs/image-shrinking/BUCKET-PROVIDERS.md`** for provider-specific setup.

- **`BUCKET_PROVIDER`** (Required when image shrink enabled) - S3-compatible backend selector
- **`BUCKET_ACCESS_KEY`** (Required when image shrink enabled) - Bucket access key (provider-specific; not necessarily an API “personal access token”)
- **`BUCKET_SECRET_KEY`** (Required when image shrink enabled) - Bucket secret key
- **`BUCKET_REGION`** (Required when image shrink enabled) - Provider region (e.g. `nyc3`, `us-east-1`, `us-west-004`)
- **`BUCKET_NAME`** (Required when image shrink enabled) - Bucket name
- **`BUCKET_CDN_BASE_URL`** (Required when image shrink enabled) - Public URL prefix for resized images (no trailing slash)
- **`BUCKET_ENDPOINT`** (Required for `garage` and `s3-compatible`; optional otherwise) - S3 API base URL
- **`BUCKET_FORCE_PATH_STYLE`** (Optional) - `true`, `false`, or unset for provider default path-style vs virtual-hosted addressing
- **`IMAGE_SHRINK_WIDTH_PX`** (Optional) - Target width in pixels for resized images (default: **400**; must be a positive integer if set)
- **`IMAGE_SHRINK_WEBP_QUALITY`** (Optional) - WebP lossy quality **1–100** (default: **92**)
- **`IMAGE_SHRINK_BATCH_SIZE`** (Required when image shrink enabled) - Max images processed per batch run
- **`IMAGE_SHRINK_CONCURRENCY`** (Required when image shrink enabled) - Parallel image processing count
- **`IMAGE_SHRINK_RPS`** (Required when image shrink enabled) - Rate limit for image fetches (requests/second)
- **`IMAGE_SHRINK_MAX_SOURCE_BYTES`** (Optional) - Max origin image download size in bytes (default: 20971520 / 20 MiB; must be a positive integer if set)
- **`IMAGE_SHRINK_RECHECK_EXPIRATION`** (Optional) - Minimum seconds between origin re-checks (default: 86400)
- **`IMAGE_SHRINK_DEEP_RECHECK_EXPIRATION`** (Optional) - Minimum seconds between unconditional origin `GET` + SHA-256 verification runs (default: 604800, 7 days)
- **`IMAGE_SHRINK_SOURCE_PRUNE_EXPIRATION`** (Optional) - Prune `image_shrink_source` rows when last check is older than this many seconds (default: 2592000, 30 days)
- **`IMAGE_SHRINK_ORPHAN_CLEANUP_DRY_RUN`** (Optional) - Dry run cleanup (default: `true`)
- **`IMAGE_SHRINK_ORPHAN_CLEANUP_MAX_DELETE`** (Optional) - Max deletes per run (default: none)
- **`IMAGE_SHRINK_ORPHAN_MIN_AGE_EXPIRATION`** (Optional) - Orphan cleanup skips objects newer than this many seconds (default: 604800, 7 days)
- **`IMAGE_SHRINK_ORPHAN_CLEANUP_PAGE_SIZE`** (Optional) - List page size (default: `500`)

### Image Shrink Full Reset

Two operator commands share fixed pagination (500 keys/rows per page); no dedicated env vars.

- **`imageShrinkResetShrunkenDryRun`** — report bucket objects and DB rows that would be removed.
- **`imageShrinkResetShrunken`** — destructive reset of shrink-generated WebP objects and matching
  `is_resized` DB rows.

## KeyValDB (commands that use Redis)

The cache commands (`mqAddByRSSRunParser`, `mqOpmlImportRun`) require Redis at startup. The
commands that write notifications open a separate connection to publish account events on
`podverse:account-events`, do not require Redis at startup, and drop events with a warning while
it is unreachable.

- **`KEYVALDB_HOST`** (Required) - Redis host
- **`KEYVALDB_PORT`** (Required) - Redis port
- **`KEYVALDB_PASSWORD`** (Required) - Redis password
- **`KEYVALDB_CACHE_EXPIRATION`** (Required) - Default cache entry lifetime in seconds (integer > 0)

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

- **`WEBPUSH_VAPID_SUBJECT`** (Conditional) - WebPush VAPID `mailto:` or `https:` contact URI for the VAPID key pair
  - Required if `WEBPUSH_ENABLED` is `"true"`
  - **Local dev:** edit `apps/workers/.env` (and keep `WEBPUSH_VAPID_PUBLIC_KEY` / `WEBPUSH_VAPID_PRIVATE_KEY` consistent with your keys; see `apps/workers/.env.example`).
  - **Kubernetes (monorepo):** set in `infra/k8s/base/workers/source/workers.env` (ConfigMap source for workers). The API uses the same subject and public key for its notifications config: set them in `infra/k8s/base/api/source/api.env` when WebPush is enabled, or in your environment overlay.
  - **GitOps (separate repo):** set in `apps/podverse-<env>/workers/source/workers.env` and the matching `apps/podverse-<env>/api/source/api.env` for the API, then commit and sync.

- **`NOTIFICATIONS_TEST_PUSH_ENABLED`** (Required for `notificationsTestPush` unless the args are `--help`) - Must be the string `true` before that command lists devices or sends. Any other value, including unset, refuses the run. Leave it empty outside an environment where operators send test pushes. Alpha sets it in the workers env overlay. The command does not insert an inbox row.

## Parser Configuration

These variables are used to build the Parser configuration:

- **`PARSER_ADD_REMOTE_ITEMS_TO_MQ`** (Optional) - Add remote items to message queue (default: `false`)
  - Set to `"true"` to enable

- **`PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT`** (Optional) - Parsed item/live-item count at or above which a feed is auto-flagged `Spam` for non-`SpamPermitted` statuses (default: `10000`). Must be a positive integer when set.

- **`PARSER_SPAM_FEED_ITEM_THRESHOLD_SPAM_PERMITTED`** (Optional) - Same check for feeds in `SpamPermitted` (default: `100000`). Must be a positive integer when set.

- **`PARSER_MAX_FEED_BODY_BYTES`** (Optional) - Shared max RSS/XML response bytes used by outbound fetch + partytime parser limit. Default: `20971520` (20 MiB). Must be an integer between `1000` and `50000000` when set.

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
