# Plan 3a: management-api Migration

## Overview

Migrate `podverse-management-api` to `apps/management-api/` in the monorepo.

**Estimated time**: 1-2 hours

---

## Step 1: Copy Source Files

Copy all source files from the standalone repository:

```bash
# From monorepo root
cp -r ../podverse-management-api/src apps/management-api/
```

Files to copy:
- `src/@types/express.d.ts` - Express type augmentation
- `src/app.ts` - Express app setup
- `src/config/index.ts` - Configuration
- `src/index.ts` - Entry point
- `src/lib/auth/index.ts` - Passport authentication
- `src/lib/params.ts` - Parameter helpers
- `src/lib/startup/validation.ts` - Env validation
- `src/module-alias-config.ts` - **Will be removed** (replaced by tsconfig paths)
- `src/orm/db/index.ts` - TypeORM data sources
- `src/orm/entities/adminAccount.ts` - Admin account entity
- `src/orm/entities/adminAccountCredentials.ts` - Credentials entity
- `src/orm/entities/adminAccountRole.ts` - Role entity
- `src/orm/services/adminAccount.ts` - Admin account service
- `src/routes/adminAccount.ts` - Admin routes
- `src/routes/auth.ts` - Auth routes

---

## Step 2: Create package.json

Create `apps/management-api/package.json`:

```json
{
  "name": "@podverse/management-api",
  "version": "5.2.0",
  "description": "Management API for Podverse administration",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "build": "npm run lint && tsc",
    "build:prod": "tsc -p tsconfig.prod.json",
    "dev": "tsc && node ./dist/index.js",
    "dev:watch": "tsc --watch & nodemon --delay 500ms --watch dist dist/index.js",
    "lint": "eslint ./src",
    "lint:fix": "eslint ./src --fix",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "license": "AGPL-3.0",
  "dependencies": {
    "@podverse/helpers": "*",
    "@podverse/orm": "*",
    "bcrypt": "^6.0.0",
    "body-parser": "^2.2.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "express-rate-limit": "^8.2.1",
    "joi": "^18.0.1",
    "jsonwebtoken": "^9.0.2",
    "nanoid": "^5.1.6",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "pg": "^8.16.3",
    "reflect-metadata": "^0.2.2",
    "typeorm": "^0.3.26",
    "typeorm-naming-strategies": "^4.1.0"
  },
  "devDependencies": {
    "@dotenvx/dotenvx": "^1.49.0",
    "@types/bcrypt": "^6.0.0",
    "@types/cookie-parser": "^1.4.9",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.3",
    "@types/node": "^24.4.0",
    "@types/passport": "^1.0.17",
    "@types/passport-jwt": "^4.0.1",
    "@types/passport-local": "^1.0.38",
    "nodemon": "^3.1.10"
  }
}
```

---

## Step 3: Create tsconfig.json

Create `apps/management-api/tsconfig.json`:

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
      "@mgmt-api/*": ["src/*"]
    }
  },
  "include": ["./src/**/*.ts", "./src/@types/**/*.d.ts"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../../packages/helpers" },
    { "path": "../../packages/orm" }
  ]
}
```

Create `apps/management-api/tsconfig.prod.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
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

The `@mgmt-api/*` paths are now handled by `tsconfig.json` paths configuration.

---

## Step 5: Update Imports

All imports using `@mgmt-api/*` should work with tsconfig paths. No changes needed to:
- `src/app.ts`
- `src/lib/auth/index.ts`
- `src/orm/db/index.ts`
- `src/routes/*.ts`

Update workspace package imports:

**In `src/lib/startup/validation.ts`:**
```typescript
// Before
import { isValidUUID, ValidationResult, ValidationSummary, validateRequired, validateOptional } from 'podverse-helpers';

// After
import { isValidUUID, ValidationResult, ValidationSummary, validateRequired, validateOptional } from '@podverse/helpers';
```

**In `src/orm/entities/adminAccount.ts`:**
```typescript
// Before
import { generateRandomIdText } from 'podverse-orm';

// After
import { generateRandomIdText } from '@podverse/orm';
```

---

## Step 6: Copy ENV.md

Copy documentation:

```bash
cp ../podverse-management-api/ENV.md apps/management-api/
```

---

## Step 7: Verify Build and Dev Server

```bash
# From monorepo root

# Install dependencies
npm install

# Build packages first (if not already built)
npm run build:packages

# Build management-api
npm run build -w apps/management-api

# Start dev server (requires .env file)
npm run dev:management-api
```

---

## Verification Checklist

- [ ] All source files copied to `apps/management-api/src/`
- [ ] `package.json` created with workspace dependencies
- [ ] `tsconfig.json` extends base and has correct paths
- [ ] `module-alias-config.ts` removed
- [ ] `index.ts` updated to remove module-alias import
- [ ] Imports updated to use `@podverse/helpers` and `@podverse/orm`
- [ ] `npm run build -w apps/management-api` succeeds
- [ ] `npm run lint -w apps/management-api` passes
- [ ] `npm run dev:management-api` starts (with valid .env)

---

## Files Structure After Migration

```
apps/management-api/
├── ENV.md
├── package.json
├── tsconfig.json
├── tsconfig.prod.json
└── src/
    ├── @types/
    │   └── express.d.ts
    ├── app.ts
    ├── config/
    │   └── index.ts
    ├── index.ts
    ├── lib/
    │   ├── auth/
    │   │   └── index.ts
    │   ├── params.ts
    │   └── startup/
    │       └── validation.ts
    ├── orm/
    │   ├── db/
    │   │   └── index.ts
    │   ├── entities/
    │   │   ├── adminAccount.ts
    │   │   ├── adminAccountCredentials.ts
    │   │   └── adminAccountRole.ts
    │   └── services/
    │       └── adminAccount.ts
    └── routes/
        ├── adminAccount.ts
        └── auth.ts
```

---

## Next

Proceed to [03b-management-web.md](03b-management-web.md)
