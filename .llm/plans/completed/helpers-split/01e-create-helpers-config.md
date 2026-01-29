# Phase 1e: Create helpers-config Package

**Dependencies**: None
**Can run in parallel with**: Plans 01a, 01b, 01c, 01d
**Blocks**: Plan 02

## Overview

Create `@podverse/helpers-config` package for application startup and configuration validation utilities. These are Node.js-only utilities that use `process.env` and are used by backend apps at startup.

## Tasks

### 1. Create Package Structure

**`packages/helpers-config/package.json`:**

```json
{
  "name": "@podverse/helpers-config",
  "version": "5.2.2",
  "description": "Configuration and startup validation utilities for Podverse backend applications",
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
    "@podverse/helpers": "*"
  },
  "devDependencies": {
    "@types/node": "^24.4.0"
  }
}
```

**`packages/helpers-config/tsconfig.json`:**

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

### 2. Copy Config Validation Code

**Copy from `packages/helpers/src/lib/validation/`** to `packages/helpers-config/src/`:

- `configValidation.ts` (~310 lines) - ORM, Parser, Notifications config validators
- `startupValidation.ts` (~571 lines) - Environment variable validation utilities

**Create `packages/helpers-config/src/index.ts`:**

```typescript
export * from './configValidation';
export * from './startupValidation';
```

### 3. Build Package

```bash
cd packages/helpers-config
npm install
npm run build
```

## Platform Notes

**Node.js only**: This package uses `process.env` and is intended for:

- Backend app startup validation (api, workers, management-api)
- Build scripts (web/management-web validate-env.ts)

**NOT compatible with**:

- Browser runtime
- React Native runtime

## Verification

- [ ] Package builds successfully
- [ ] No TypeScript errors
- [ ] Dependencies installed correctly
- [ ] Config validators exported (validateORMConfig, validateParserConfig, etc.)
- [ ] Startup validators exported (validateRequired, validateOptional, etc.)

## Files Created

- `packages/helpers-config/package.json`
- `packages/helpers-config/tsconfig.json`
- `packages/helpers-config/src/index.ts`
- `packages/helpers-config/src/configValidation.ts` (copied, ~310 lines)
- `packages/helpers-config/src/startupValidation.ts` (copied, ~571 lines)

## Exports

This package exports:

**From configValidation.ts:**

- `validateORMConfig`
- `validateNotificationsConfig`
- `validateExternalServicesConfig`
- `validateParserConfig`
- `assertConfigValid`
- Type definitions: `ORMConfig`, `NotificationsConfig`, `ExternalServicesConfig`, `ParserConfig`

**From startupValidation.ts:**

- `validateRequired`
- `validateOptional`
- `validateConditionalOptional`
- `validateOptionalNonEmpty`
- `validateBoolean`
- `validateLocale`
- `validateSupportedLocalesList`
- `validateWebProtocol`
- `validateLogLevel`
- `validatePositiveNumber`
- `displayValidationResultsSilent`
- `getAllAvailableOrListMessage`
- Type definitions: `ValidationResult`, `ValidationSummary`
