# @podverse/workers

Background workers and CLI tools for Podverse.

## Overview

Podverse Workers provides command-line tools for various background tasks including RSS feed parsing, message queue processing, Podcast Index integration, and statistics aggregation.

## Quick Start

### Prerequisites

- Node.js v22+
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

| Script | Description |
|--------|-------------|
| `npm run archive_all` | Archive all feeds |
| `npm run mq_rss_add` | Add single feed to message queue |
| `npm run mq_rss_add_all` | Add all feeds to message queue |
| `npm run mq_rss_run_parser` | Run RSS parser worker |
| `npm run mq_rss_run_dlq_consumer` | Process dead letter queue |
| `npm run parser_rss_parse_feed -- --feedUrl URL` | Parse single RSS feed |
| `npm run podcast_index_trending_podcasts_get` | Get trending podcasts |
| `npm run podcast_index_value_update_all` | Update all value blocks |
| `npm run stats_update_aggregated` | Update aggregated statistics |

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

### Scheduled Jobs

One-off commands typically run via cron:

- `stats_update_aggregated` - Updates statistics
- `podcast_index_*` - Podcast Index integrations
- `orm_*` - Database maintenance tasks

## Environment Configuration

See [ENV.md](ENV.md) for complete documentation of all environment variables.

Key configuration:

- Database connection settings
- Message queue (RabbitMQ) settings
- Podcast Index API credentials
- Optional: Firebase and WebPush for notifications

## License

AGPLv3
