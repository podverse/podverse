# @podverse/workers

Background workers and CLI tools for Podverse.

## Overview

Podverse Workers provides command-line tools for various background tasks including RSS feed parsing, message queue processing, Podcast Index integration, and statistics aggregation.

## Quick Start

### Prerequisites

- Node.js v24+
- PostgreSQL database
- RabbitMQ (message queue)
- Podcast Index API credentials

### Setup

1. Install dependencies from the monorepo root:

```bash
npm install
```

2. Copy the environment example file:

```bash
cp .env.example .env
```

3. Configure your `.env` file. See [ENV.md](ENV.md) for detailed documentation.

4. Build the packages (from monorepo root):

```bash
npm run build:packages
```

5. Build workers:

```bash
npm run build -w apps/workers
```

## Available Commands

| Script                                           | Description                      |
| ------------------------------------------------ | -------------------------------- |
| `npm run archive_all`                            | Archive all feeds                |
| `npm run image_shrink_run_consumer`              | Run image shrink MQ consumer     |
| `npm run image_shrink_backfill`                  | Enqueue image shrink backfill    |
| `npm run mq_rss_add`                             | Add single feed to message queue |
| `npm run mq_rss_add_all`                         | Add all feeds to message queue   |
| `npm run mq_rss_run_parser`                      | Run RSS parser worker            |
| `npm run mq_rss_run_dlq_consumer`                | Process dead letter queue        |
| `npm run parser_rss_parse_feed -- --feedUrl URL` | Parse single RSS feed            |
| `npm run podcast_index_trending_podcasts_get`    | Get trending podcasts            |
| `npm run podcast_index_value_update_all`         | Update all value blocks          |
| `npm run stats_update_aggregated`                | Update aggregated statistics     |

Run commands from the monorepo root with workspace flag:

```bash
npm run mq_rss_run_parser -w apps/workers
```

Or from the workers directory:

```bash
cd apps/workers
npm run mq_rss_run_parser
```

## Docker

Build Docker image:

```bash
# From monorepo root
make local_build_workers

# Or directly
docker build -f apps/workers/Dockerfile -t podverse-workers:latest .
```

Test with docker-compose (requires infrastructure running):

```bash
make local_infra_up
make local_test_workers
```

## Worker Types

### Message Queue Workers

Long-running workers that consume from RabbitMQ:

- `mq_rss_run_parser` - Parses RSS feeds from the queue
- `mq_rss_run_live_item_listener` - Handles live item updates
- `mq_rss_run_dlq_consumer` - Processes failed messages
- `image_shrink_run_consumer` - Resizes and uploads list-view images

### Scheduled Jobs

One-off commands typically run via cron:

- `image_shrink_backfill` - Enqueues unresized images for shrinking
- `stats_update_aggregated` - Updates statistics
- `podcast_index_*` - Podcast Index integrations
- `orm_*` - Database maintenance tasks

## Environment configuration

**Required env vars are per-job.** When you run a specific command, only the env vars needed for that
command are validated. You see **job-specific validation output** when vars are missing (a FATAL
message and the list of missing vars for that job). See [ENV.md](ENV.md) for the full list of vars
per command and which are required vs optional.

Each job validates only what it needs. For example, an ORM-only cron job (e.g. `stats_update_aggregated`) does not require MQ or Podcast Index vars; a message-queue worker (e.g. `mq_rss_run_parser`) validates Base, ORM, MQ, Parser, Podcast Index, and Web/Notifications.

Key configuration (by category):

- Base: USER_AGENT, LOG_LEVEL, optional LOG_DIR, LOG_TIMER, NODE_ENV
- Database (ORM): DB\_\*, DEFAULT_ACCOUNT_SETTINGS_LOCALE
- Message queue: MESSAGE*QUEUE*\* (for MQ commands only)
- Podcast Index: PODCAST*INDEX*\* (for commands that call Podcast Index)
- Optional: Firebase and WebPush for notifications (Web/Notifications category)

## License

AGPLv3
