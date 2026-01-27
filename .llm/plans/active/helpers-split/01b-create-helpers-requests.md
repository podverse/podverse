# Phase 1b: Create helpers-requests Package

**Dependencies**: None
**Can run in parallel with**: Plans 01a, 01c, 01d, 01e
**Blocks**: Plan 02

## Overview

Create `@podverse/helpers-requests` package for API client utilities used exclusively by the web app.

## Tasks

### 1. Create Package Structure

**`packages/helpers-requests/package.json`:**
```json
{
  "name": "@podverse/helpers-requests",
  "version": "5.2.2",
  "description": "API client utilities for Podverse web application",
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
    "axios": "^1.12.2"
  }
}
```

**`packages/helpers-requests/tsconfig.json`:**
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

### 2. Copy Request Code

**Copy entire directory** from `packages/helpers/src/lib/requests/` to `packages/helpers-requests/src/`:
- `_request.ts`
- `api/` (entire directory)
- `index.ts`

**Verify structure:**
```
packages/helpers-requests/src/
  _request.ts
  index.ts
  api/
    _request.ts
    _response.ts
    account/
    auth/
    category/
    channel/
    ... (all API client subdirectories)
```

### 3. Build Package

```bash
cd packages/helpers-requests
npm install
npm run build
```

## Verification

- [ ] Package builds successfully
- [ ] No TypeScript errors
- [ ] All API client files copied
- [ ] Dependencies installed correctly
- [ ] `dist/` folder contains compiled output

## Files Created

- `packages/helpers-requests/package.json`
- `packages/helpers-requests/tsconfig.json`
- `packages/helpers-requests/src/**/*` (entire requests directory copied)
