# Plan 3c: workers Migration

## Overview

Migrate `podverse-workers` to `apps/workers/` in the monorepo.

**Estimated time**: 2-3 hours

---

## Step 1: Copy Source Files

Copy all source files:

```bash
# From monorepo root
cp -r ../podverse-workers/src apps/workers/
```

**Source structure:**

- `src/index.ts` - Entry point with command dispatcher
- `src/config/index.ts` - Configuration
- `src/module-alias-config.ts` - **Will be removed**
- `src/commands/` - CLI command implementations
  - `archiver/archiveAll.ts`
  - `mq/rss/` - Message queue RSS commands
  - `orm/feed/` - ORM feed commands
  - `orm/onDemandParserEvent/` - Parser event commands
  - `parser/rss/` - RSS parser commands
  - `podcastIndex/` - Podcast Index API commands
  - `stats/` - Statistics commands
  - `index.ts` - Command registry
  - `parseArgs.ts` - Argument parser
- `src/factories/` - Service factories
  - `activeMQArtemisService.ts`
  - `logger.ts`
  - `loggerService.ts`
  - `podcastIndexService.ts`
  - `timerManager.ts`
- `src/lib/` - Utilities
  - `deduplicator.ts`
  - `winston.ts`

---

## Step 2: Create package.json

Create `apps/workers/package.json`:

```json
{
  "name": "@podverse/workers",
  "version": "5.2.0",
  "description": "Background workers and CLI tools for Podverse",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "build": "npm run lint && tsc",
    "lint": "eslint ./src",
    "lint:fix": "eslint ./src --fix",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit",
    "start": "ts-node ./dist/index.js",
    "archive_all": "ts-node ./src/index.ts archiveAll",
    "mq_rss_add": "ts-node ./src/index.ts mqRSSAdd",
    "mq_rss_add_all": "ts-node ./src/index.ts mqRSSAddAll",
    "mq_rss_add_recently_updated_feeds_from_podcast_index": "ts-node ./src/index.ts mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex",
    "mq_rss_run_live_item_listener": "ts-node ./src/index.ts mqRSSRunLiveItemListener",
    "mq_rss_run_parser": "ts-node ./src/index.ts mqRSSRunParser",
    "mq_rss_run_dlq_consumer": "ts-node ./src/index.ts mqRSSRunDlqConsumer",
    "orm_feed_update_flag_status": "ts-node ./src/index.ts ormFeedUpdateFlagStatus",
    "orm_on_demand_parser_event_delete_outdated": "ts-node ./src/index.ts deleteOutdatedOnDemandParserEvent",
    "orm_on_demand_parser_event_generate_reports": "ts-node ./src/index.ts generateOnDemandParserEventReports",
    "parser_rss_parse_feed": "ts-node ./src/index.ts parserRSSParseFeed",
    "podcast_index_dead_feeds_delete_cache": "ts-node ./src/index.ts podcastIndexDeadFeedsDeleteCache",
    "podcast_index_dead_feeds_flag_and_merge": "ts-node ./src/index.ts podcastIndexDeadFeedsFlagAndMerge",
    "podcast_index_trending_podcasts_get": "ts-node ./src/index.ts podcastIndexTrendingPodcastsGet",
    "podcast_index_value_update_all": "ts-node ./src/index.ts podcastIndexValueUpdateAll",
    "stats_update_aggregated": "ts-node ./src/index.ts statsUpdateAggregated"
  },
  "license": "AGPL-3.0",
  "dependencies": {
    "@podverse/external-services": "*",
    "@podverse/helpers": "*",
    "@podverse/mq": "*",
    "@podverse/notifications": "*",
    "@podverse/orm": "*",
    "@podverse/parser": "*",
    "amqplib": "^0.10.9",
    "axios": "^1.12.2",
    "pg": "^8.16.3",
    "typeorm": "^0.3.26",
    "typeorm-naming-strategies": "^4.1.0",
    "winston": "^3.19.0",
    "winston-daily-rotate-file": "^5.0.0"
  },
  "devDependencies": {
    "@dotenvx/dotenvx": "^1.49.0",
    "@types/node": "^24.4.0",
    "nodemon": "^3.1.10",
    "ts-node": "^10.9.2"
  }
}
```

---

## Step 3: Create tsconfig.json

Create `apps/workers/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist",
    "rootDir": "./src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": "./",
    "paths": {
      "@workers/*": ["src/*"]
    }
  },
  "include": ["./src/**/*.ts"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../../packages/helpers" },
    { "path": "../../packages/external-services" },
    { "path": "../../packages/orm" },
    { "path": "../../packages/mq" },
    { "path": "../../packages/notifications" },
    { "path": "../../packages/parser" }
  ]
}
```

---

## Step 4: Remove module-alias Config

Delete `src/module-alias-config.ts` and update `src/index.ts`:

**Before:**

```typescript
import './module-alias-config';

if (process.env.NODE_ENV !== 'production') {
  require('@dotenvx/dotenvx').config({ path: '.env' });
}
```

**After:**

```typescript
if (process.env.NODE_ENV !== 'production') {
  require('@dotenvx/dotenvx').config({ path: '.env' });
}
```

---

## Step 5: Update Imports

Update all package imports to use workspace scopes:

**In `src/index.ts`:**

```typescript
// Before
import {
  validateORMConfig,
  validateExternalServicesConfig,
  validateParserConfig,
  assertConfigValid,
} from 'podverse-helpers';
import { createORMContext } from 'podverse-orm';
import { createFirebaseContext } from 'podverse-external-services';
import { createNotificationsContext } from 'podverse-notifications';
import { createParserContext } from 'podverse-parser';

// After
import {
  validateORMConfig,
  validateExternalServicesConfig,
  validateParserConfig,
  assertConfigValid,
} from '@podverse/helpers';
import { createORMContext } from '@podverse/orm';
import { createFirebaseContext } from '@podverse/external-services';
import { createNotificationsContext } from '@podverse/notifications';
import { createParserContext } from '@podverse/parser';
```

**In `src/factories/loggerService.ts`:**

```typescript
// Before
import { LoggerService } from 'podverse-helpers/dist/lib/backend/logger';

// After
import { LoggerService } from '@podverse/helpers/dist/lib/backend/logger';
```

**Search and replace in all command files under `src/commands/`:**

- `from 'podverse-helpers'` → `from '@podverse/helpers'`
- `from 'podverse-orm'` → `from '@podverse/orm'`
- `from 'podverse-mq'` → `from '@podverse/mq'`
- `from 'podverse-external-services'` → `from '@podverse/external-services'`
- `from 'podverse-notifications'` → `from '@podverse/notifications'`
- `from 'podverse-parser'` → `from '@podverse/parser'`

---

## Step 6: Copy Documentation

```bash
cp ../podverse-workers/ENV.md apps/workers/
```

---

## Step 7: Verify Build and Commands

```bash
# From monorepo root

# Install dependencies
npm install

# Build packages first (if not already built)
npm run build:packages

# Build workers
npm run build -w apps/workers

# Test a command (requires .env file)
npm run parser_rss_parse_feed -w apps/workers -- --feedUrl https://example.com/feed.xml
```

---

## Verification Checklist

- [ ] All source files copied to `apps/workers/src/`
- [ ] `package.json` created with workspace dependencies
- [ ] `tsconfig.json` extends base and has correct paths
- [ ] `module-alias-config.ts` removed
- [ ] `index.ts` updated to remove module-alias import
- [ ] All imports updated to use `@podverse/*` packages
- [ ] `npm run build -w apps/workers` succeeds
- [ ] `npm run lint -w apps/workers` passes
- [ ] Individual worker commands execute (with valid .env)

---

## Available Commands

| Script                                                 | Command                                        | Description                |
| ------------------------------------------------------ | ---------------------------------------------- | -------------------------- |
| `archive_all`                                          | `archiveAll`                                   | Archive all feeds          |
| `mq_rss_add`                                           | `mqRSSAdd`                                     | Add single feed to MQ      |
| `mq_rss_add_all`                                       | `mqRSSAddAll`                                  | Add all feeds to MQ        |
| `mq_rss_add_recently_updated_feeds_from_podcast_index` | `mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex` | Add recently updated feeds |
| `mq_rss_run_live_item_listener`                        | `mqRSSRunLiveItemListener`                     | Run live item listener     |
| `mq_rss_run_parser`                                    | `mqRSSRunParser`                               | Run RSS parser worker      |
| `mq_rss_run_dlq_consumer`                              | `mqRSSRunDlqConsumer`                          | Process dead letter queue  |
| `orm_feed_update_flag_status`                          | `ormFeedUpdateFlagStatus`                      | Update feed flag status    |
| `orm_on_demand_parser_event_delete_outdated`           | `deleteOutdatedOnDemandParserEvent`            | Clean up old parser events |
| `orm_on_demand_parser_event_generate_reports`          | `generateOnDemandParserEventReports`           | Generate parser reports    |
| `parser_rss_parse_feed`                                | `parserRSSParseFeed`                           | Parse single RSS feed      |
| `podcast_index_dead_feeds_delete_cache`                | `podcastIndexDeadFeedsDeleteCache`             | Clear dead feeds cache     |
| `podcast_index_dead_feeds_flag_and_merge`              | `podcastIndexDeadFeedsFlagAndMerge`            | Flag and merge dead feeds  |
| `podcast_index_trending_podcasts_get`                  | `podcastIndexTrendingPodcastsGet`              | Get trending podcasts      |
| `podcast_index_value_update_all`                       | `podcastIndexValueUpdateAll`                   | Update all value blocks    |
| `stats_update_aggregated`                              | `statsUpdateAggregated`                        | Update aggregated stats    |

---

## Files Structure After Migration

```
apps/workers/
├── ENV.md
├── package.json
├── tsconfig.json
└── src/
    ├── commands/
    │   ├── archiver/
    │   │   └── archiveAll.ts
    │   ├── mq/
    │   │   └── rss/
    │   │       ├── add.ts
    │   │       ├── addAll.ts
    │   │       ├── dlqHandling.ts
    │   │       ├── mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex.ts
    │   │       ├── runLiveItemListener.ts
    │   │       └── runParser.ts
    │   ├── orm/
    │   │   ├── feed/
    │   │   │   └── updateFlagStatus.ts
    │   │   └── onDemandParserEvent/
    │   │       ├── deleteOutdatedOnDemandParserEvent.ts
    │   │       └── generateOnDemandParserEventReports.ts
    │   ├── parser/
    │   │   └── rss/
    │   │       └── parseFeed.ts
    │   ├── podcastIndex/
    │   │   ├── deadFeeds/
    │   │   │   └── flagAndMerge.ts
    │   │   ├── trending/
    │   │   │   └── podcastsGet.ts
    │   │   └── value/
    │   │       └── updateAll.ts
    │   ├── stats/
    │   │   ├── statsUpdateAggregated.ts
    │   │   └── statsUpdateAggregatedRolling.ts
    │   ├── index.ts
    │   └── parseArgs.ts
    ├── config/
    │   └── index.ts
    ├── factories/
    │   ├── activeMQArtemisService.ts
    │   ├── logger.ts
    │   ├── loggerService.ts
    │   ├── podcastIndexService.ts
    │   └── timerManager.ts
    ├── index.ts
    └── lib/
        ├── deduplicator.ts
        └── winston.ts
```

---

## Next

Proceed to [03d-api.md](03d-api.md)
