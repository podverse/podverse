# Phase 1a: Create helpers-validation Package

**Dependencies**: None
**Can run in parallel with**: Plans 01b, 01c, 01d, 01e
**Blocks**: Plan 02

## Overview

Create `@podverse/helpers-validation` package for email/password validation shared by frontend forms and backend services. This package is cross-platform (browser, React Native, Node.js).

## Tasks

### 1. Create Package Structure

**`packages/helpers-validation/package.json`:**

```json
{
  "name": "@podverse/helpers-validation",
  "version": "5.2.2",
  "description": "Email and password validation utilities for Podverse",
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
    "joi": "^18.0.1"
  }
}
```

**`packages/helpers-validation/tsconfig.json`:**

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

### 2. Copy Validation Code

**Copy from `packages/helpers/src/lib/validation/`** to `packages/helpers-validation/src/`:

- `email.ts` - Email validation with joi
- `password.ts` - Password validation with joi
- `databaseConstants.ts` - Database constants (used by password.ts)
- `signUpValidation.ts` - Combines email/password validation
- `url.ts` - URL validation utilities (cross-platform, uses standard URL API)

**Create `packages/helpers-validation/src/index.ts`:**

```typescript
export * from './databaseConstants';
export * from './email';
export * from './password';
export * from './signUpValidation';
export * from './url';
```

### 3. Build Package

```bash
cd packages/helpers-validation
npm install
npm run build
```

## Platform Notes

**Cross-platform**: This package works in:

- Browser (Next.js web apps)
- React Native (mobile apps)
- Node.js (backend apps)

`url.ts` uses the standard `URL` API which is available on all platforms.

## Verification

- [ ] Package builds successfully
- [ ] No TypeScript errors
- [ ] Dependencies installed correctly
- [ ] All validation utilities exported

## Files Created

- `packages/helpers-validation/package.json`
- `packages/helpers-validation/tsconfig.json`
- `packages/helpers-validation/src/index.ts`
- `packages/helpers-validation/src/email.ts` (copied)
- `packages/helpers-validation/src/password.ts` (copied)
- `packages/helpers-validation/src/databaseConstants.ts` (copied)
- `packages/helpers-validation/src/signUpValidation.ts` (copied)
- `packages/helpers-validation/src/url.ts` (copied)

## Exports

This package exports:

**From email.ts:**

- `validateEmail`
- `getEmailErrorKey`

**From password.ts:**

- `validatePassword`
- `getPasswordErrorKey`
- `getPassword2ErrorKey`
- `getPasswordRequirementsInfoKey`

**From databaseConstants.ts:**

- `DATABASE_CONSTANTS`

**From signUpValidation.ts:**

- `validateSignUpFields`
- Type: `SignUpValidationResult`

**From url.ts:**

- `isValidHttpUrl`
- `validateHttpsUrl`
- `validateHttpOrHttpsUrl`
- `isPrivateIP`
- `isLocalhost`
- `validateUrlForSSRF`
