# Phase 1: Create helpers-backend Package

**Dependencies**: None (run first)
**Blocks**: All other plans in this series

## Overview

Create the new `@podverse/helpers-backend` package structure and migrate backend-specific code from `@podverse/helpers`.

## Tasks

### 1. Create Package Structure

Create `packages/helpers-backend/` directory with:

**`packages/helpers-backend/package.json`:**

```json
{
  "name": "@podverse/helpers-backend",
  "version": "5.2.2",
  "description": "Backend utilities for Podverse applications",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist/**/*"],
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
  "include": ["src/**/*"]
}
```

### 2. Move Backend Code

**Move these files** from `packages/helpers/src/lib/backend/` to `packages/helpers-backend/src/`:

- `logger.ts`
- `logTimer.ts`
- `os.ts`

**Create `packages/helpers-backend/src/index.ts`:**

```typescript
export * from "./logger";
export * from "./logTimer";
export * from "./os";
```

### 3. Update helpers Package

**In `packages/helpers/package.json`**, remove:

```json
"winston": "^3.17.0",
"winston-daily-rotate-file": "^5.0.0",
"winston-transport": "^4.9.0"
```

**In `packages/helpers/src/index.ts`**, remove line:

```typescript
export * from "./lib/backend";
```

**Delete** the now-empty directory:

```bash
rm -rf packages/helpers/src/lib/backend/
```

### 4. Install Dependencies

Run from workspace root:

```bash
npm install
```

### 5. Build New Package

```bash
cd packages/helpers-backend
npm run build
```

## Verification

- [ ] `packages/helpers-backend/` directory exists
- [ ] New package builds without errors
- [ ] `packages/helpers/` builds without winston dependencies
- [ ] No TypeScript errors in helpers-backend

## Files Changed

**New:**

- `packages/helpers-backend/package.json`
- `packages/helpers-backend/tsconfig.json`
- `packages/helpers-backend/src/index.ts`
- `packages/helpers-backend/src/logger.ts` (moved)
- `packages/helpers-backend/src/logTimer.ts` (moved)
- `packages/helpers-backend/src/os.ts` (moved)

**Modified:**

- `packages/helpers/package.json`
- `packages/helpers/src/index.ts`

**Deleted:**

- `packages/helpers/src/lib/backend/` (entire directory)
