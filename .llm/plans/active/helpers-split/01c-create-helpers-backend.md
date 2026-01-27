# Phase 1c: Create helpers-backend Package

**Dependencies**: None
**Can run in parallel with**: Plans 01a, 01b, 01d, 01e
**Blocks**: Plan 02

## Overview

Create `@podverse/helpers-backend` package for backend-only utilities (logging, OS utils, BigNumber calculations).

## Tasks

### 1. Create Package Structure

**`packages/helpers-backend/package.json`:**
```json
{
  "name": "@podverse/helpers-backend",
  "version": "5.2.2",
  "description": "Backend utilities for Podverse applications",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/**/*"
  ],
  "scripts": {
    "build": "npm run lint && tsc",
    "build:prod": "tsc",
    "build:watch": "tsc --build --watch --preserveWatchOutput",
    "lint": "eslint ./src",
    "lint:fix": "eslint ./src --fix",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "license": "AGPL-3.0",
  "publishConfig": {
    "access": "public"
  },
  "dependencies": {
    "@podverse/helpers": "*",
    "bignumber.js": "^9.3.1",
    "winston": "^3.17.0",
    "winston-daily-rotate-file": "^5.0.0",
    "winston-transport": "^4.9.0"
  },
  "devDependencies": {
    "@types/node": "^24.4.0"
  }
}
```

**`packages/helpers-backend/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": [
    "src/**/*"
  ]
}
```

### 2. Copy Backend Code

**Copy from `packages/helpers/src/lib/backend/`** to `packages/helpers-backend/src/`:
- `logger.ts`
- `logTimer.ts`
- `os.ts`

**Copy from `packages/helpers/src/lib/`** to `packages/helpers-backend/src/`:
- `playlistResource.ts` (uses BigNumber)

**Create `packages/helpers-backend/src/index.ts`:**
```typescript
export * from './logger';
export * from './logTimer';
export * from './os';
export * from './playlistResource';
```

### 3. Build Package

```bash
cd packages/helpers-backend
npm install
npm run build
```

## Verification

- [ ] Package builds successfully
- [ ] No TypeScript errors
- [ ] Dependencies installed correctly
- [ ] Logger, logTimer, os, playlistResource all exported

## Files Created

- `packages/helpers-backend/package.json`
- `packages/helpers-backend/tsconfig.json`
- `packages/helpers-backend/src/index.ts`
- `packages/helpers-backend/src/logger.ts` (copied)
- `packages/helpers-backend/src/logTimer.ts` (copied)
- `packages/helpers-backend/src/os.ts` (copied)
- `packages/helpers-backend/src/playlistResource.ts` (copied)
