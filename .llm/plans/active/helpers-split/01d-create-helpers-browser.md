# Phase 1d: Create helpers-browser Package

**Dependencies**: None
**Can run in parallel with**: Plans 01a, 01b, 01c, 01e
**Blocks**: Plan 02

## Overview

Create `@podverse/helpers-browser` package for browser-specific utilities (not used by mobile or backend).

## Tasks

### 1. Create Package Structure

**`packages/helpers-browser/package.json`:**
```json
{
  "name": "@podverse/helpers-browser",
  "version": "5.2.2",
  "description": "Browser-specific utilities for Podverse web applications",
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
    "@podverse/helpers": "*"
  }
}
```

**`packages/helpers-browser/tsconfig.json`:**
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

### 2. Copy Browser Code

**Copy from `packages/helpers/src/lib/web/`** to `packages/helpers-browser/src/`:
- `clipboard.ts` (uses `navigator.clipboard`, `document` - browser-only)

**Create `packages/helpers-browser/src/index.ts`:**
```typescript
export * from './clipboard';
```

### 3. Build Package

```bash
cd packages/helpers-browser
npm install
npm run build
```

## Platform Notes

**Browser-specific**: This package uses browser APIs (`navigator`, `document`) and will NOT work in:
- React Native (mobile apps)
- Node.js (backend)

**Mobile apps**: Will use React Native's Clipboard API instead (future `@podverse/helpers-mobile` package).

## Verification

- [ ] Package builds successfully
- [ ] No TypeScript errors
- [ ] Dependencies installed correctly
- [ ] Clipboard utility exported

## Files Created

- `packages/helpers-browser/package.json`
- `packages/helpers-browser/tsconfig.json`
- `packages/helpers-browser/src/index.ts`
- `packages/helpers-browser/src/clipboard.ts` (copied)
