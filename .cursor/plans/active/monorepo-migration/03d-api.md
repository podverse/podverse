# Plan 3d: api Migration

## Overview

Migrate `podverse-api` to `apps/api/` in the monorepo.

**Estimated time**: 3-4 hours

---

## Step 1: Copy Source Files

Copy all source files:

```bash
# From monorepo root
cp -r ../podverse-api/src apps/api/
```

**Source structure:**
- `src/@types/express.d.ts` - Express type augmentation
- `src/app.ts` - Express app setup with all routes
- `src/config/index.ts` - Comprehensive configuration
- `src/index.ts` - Entry point with module initialization
- `src/module-alias-config.ts` - **Will be removed**
- `src/controllers/` - Route controllers
  - `account/` - Account management (13 files)
  - `externalServices/` - External API integrations
  - `helpers/` - Controller helpers
  - `mq/` - Message queue controllers
  - `playlist/` - Playlist management
  - `queue/` - User queue management
  - `stats/` - Statistics
  - Plus individual controllers for categories, channels, clips, etc.
- `src/factories/` - Service factories
- `src/lib/` - Utilities
  - `auth/` - Passport authentication
  - `keyvaldb/` - Redis caching
  - `mailer/` - Email sending
  - `startup/validation.ts` - Environment validation
  - Rate limiting, remote items, etc.
- `src/middleware/` - Express middleware
- `src/routes/` - Route definitions (25+ files)

---

## Step 2: Create package.json

Create `apps/api/package.json`:

```json
{
  "name": "@podverse/api",
  "version": "5.2.0",
  "description": "Data API, database migration scripts, and backend services for Podverse",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "build": "npm run lint && tsc",
    "build:prod": "tsc -p tsconfig.prod.json",
    "dev": "tsc && node ./dist/index.js",
    "dev:watch": "tsc --watch & nodemon --delay 500ms --watch dist dist/index.js",
    "dev:inspect": "tsc && node --inspect ./dist/index.js",
    "dev:inspect:watch": "tsc --watch & nodemon --inspect --delay 500ms --watch dist dist/index.js",
    "lint": "eslint ./src",
    "lint:fix": "eslint ./src --fix",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit",
    "test:e2e": "jest --config jest.e2e.config.js --runInBand"
  },
  "license": "AGPL-3.0",
  "dependencies": {
    "@podverse/external-services": "*",
    "@podverse/helpers": "*",
    "@podverse/mq": "*",
    "@podverse/notifications": "*",
    "@podverse/orm": "*",
    "@podverse/parser": "*",
    "@types/archiver": "^7.0.0",
    "archiver": "^7.0.1",
    "bcrypt": "^6.0.0",
    "body-parser": "^2.2.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "express-rate-limit": "^8.2.1",
    "ioredis": "^5.0.4",
    "joi": "^18.0.1",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^7.0.6",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "reflect-metadata": "^0.2.2",
    "uuid": "^13.0.0"
  },
  "devDependencies": {
    "@dotenvx/dotenvx": "^1.49.0",
    "@types/bcrypt": "^6.0.0",
    "@types/cookie-parser": "^1.4.9",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.3",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.4.0",
    "@types/nodemailer": "^7.0.1",
    "@types/passport": "^1.0.17",
    "@types/passport-jwt": "^4.0.1",
    "@types/passport-local": "^1.0.38",
    "@types/supertest": "^6.0.3",
    "jest": "^30.1.3",
    "nodemon": "^3.1.10",
    "supertest": "^7.1.4",
    "ts-jest": "^29.4.2",
    "ts-node": "^10.9.2"
  }
}
```

---

## Step 3: Create TypeScript Configs

**Create `apps/api/tsconfig.json`:**

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
      "@api/*": ["src/*"]
    }
  },
  "include": ["./src/**/*.ts", "./src/@types/**/*.d.ts"],
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

**Create `apps/api/tsconfig.prod.json`:**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": false
  }
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
  validateNotificationsConfig,
  validateExternalServicesConfig,
  validateParserConfig,
  assertConfigValid
} from 'podverse-helpers';
import { createORMContext, getDataSourceRead, getDataSourceReadWrite } from "podverse-orm";
import { createFirebaseContext } from "podverse-external-services";
import { createNotificationsContext } from "podverse-notifications";
import { createParserContext } from "podverse-parser";

// After
import {
  validateORMConfig,
  validateNotificationsConfig,
  validateExternalServicesConfig,
  validateParserConfig,
  assertConfigValid
} from '@podverse/helpers';
import { createORMContext, getDataSourceRead, getDataSourceReadWrite } from "@podverse/orm";
import { createFirebaseContext } from "@podverse/external-services";
import { createNotificationsContext } from "@podverse/notifications";
import { createParserContext } from "@podverse/parser";
```

**In `src/config/index.ts`:**
```typescript
// Before
import { AccountSignupMode } from 'podverse-helpers';

// After
import { AccountSignupMode } from '@podverse/helpers';
```

**In `src/app.ts`:**
```typescript
// Before
import { CategoryService } from "podverse-orm";

// After
import { CategoryService } from "@podverse/orm";
```

**Search and replace across all files:**
- `from 'podverse-helpers'` → `from '@podverse/helpers'`
- `from 'podverse-orm'` → `from '@podverse/orm'`
- `from 'podverse-mq'` → `from '@podverse/mq'`
- `from 'podverse-external-services'` → `from '@podverse/external-services'`
- `from 'podverse-notifications'` → `from '@podverse/notifications'`
- `from 'podverse-parser'` → `from '@podverse/parser'`

---

## Step 6: Copy Documentation and Test Config

```bash
cp ../podverse-api/ENV.md apps/api/
cp ../podverse-api/jest.e2e.config.js apps/api/
```

---

## Step 7: Verify Build and Dev Server

```bash
# From monorepo root

# Install dependencies
npm install

# Build packages first (if not already built)
npm run build:packages

# Build api
npm run build -w apps/api

# Start dev server (requires .env file)
npm run dev:api
```

---

## Verification Checklist

- [ ] All source files copied to `apps/api/src/`
- [ ] `package.json` created with workspace dependencies
- [ ] `tsconfig.json` extends base and has correct paths
- [ ] `tsconfig.prod.json` created
- [ ] `module-alias-config.ts` removed
- [ ] `index.ts` updated to remove module-alias import
- [ ] All imports updated to use `@podverse/*` packages
- [ ] Express types (`@types/express.d.ts`) preserved
- [ ] `npm run build -w apps/api` succeeds
- [ ] `npm run lint -w apps/api` passes
- [ ] `npm run dev:api` starts (with valid .env)

---

## Key Routes

| Route File | Purpose |
|------------|---------|
| `account.ts` | User account CRUD |
| `accountSettings.ts` | User preferences |
| `auth.ts` | Login/logout/JWT |
| `category.ts` | Podcast categories |
| `channel.ts` | Podcast channels |
| `clip.ts` | Audio clips |
| `externalServices.ts` | Podcast Index integration |
| `feed.ts` | RSS feed management |
| `item.ts` | Podcast episodes |
| `itemChapter.ts` | Episode chapters |
| `itemSoundbite.ts` | Soundbite clips |
| `itemTranscript.ts` | Transcripts |
| `liveItem.ts` | Live streaming |
| `medium.ts` | Media types |
| `membership.ts` | Premium subscriptions |
| `membershipClaimToken.ts` | Membership tokens |
| `mq.ts` | Message queue status |
| `paypal.ts` | Payment processing |
| `playlist.ts` | User playlists |
| `podroll.ts` | Podcast recommendations |
| `profileContent.ts` | User profile data |
| `publisherFeed.ts` | Publisher management |
| `queue.ts` | User play queue |
| `stats.ts` | Analytics/stats |

---

## Files Structure After Migration

```
apps/api/
├── ENV.md
├── jest.e2e.config.js
├── package.json
├── tsconfig.json
├── tsconfig.prod.json
└── src/
    ├── @types/
    │   └── express.d.ts
    ├── app.ts
    ├── config/
    │   ├── firebase/
    │   └── index.ts
    ├── controllers/
    │   ├── account/
    │   ├── externalServices/
    │   ├── helpers/
    │   ├── mq/
    │   ├── playlist/
    │   ├── queue/
    │   ├── stats/
    │   └── [entity controllers]
    ├── factories/
    │   ├── activeMQArtemisService.ts
    │   ├── loggerService.ts
    │   ├── paypalService.ts
    │   └── podcastIndexService.ts
    ├── index.ts
    ├── lib/
    │   ├── _request.ts
    │   ├── auth/
    │   ├── keyvaldb/
    │   ├── mailer/
    │   ├── startup/
    │   └── [utilities]
    ├── middleware/
    │   └── asyncHandler.ts
    └── routes/
        └── [25+ route files]
```

---

## Next

Proceed to [03e-web.md](03e-web.md)
