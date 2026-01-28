# Phase 2: Update Core Helpers Package

**Dependencies**: ALL Phase 1 plans (01a, 01b, 01c, 01d, 01e) must complete first
**Blocks**: All Phase 3 plans
**Run**: Sequential (after Phase 1)

## Overview

Update the core `@podverse/helpers` package by removing code that was moved to specialized packages and updating dependencies to remain platform-agnostic (works in browser, React Native, Node.js).

## Tasks

### 1. Update package.json Dependencies

**In `packages/helpers/package.json`**, remove these dependencies:

```json
"axios": "^1.12.2",          // moved to helpers-requests
"bignumber.js": "^9.3.1",    // moved to helpers-backend
"joi": "^18.0.1",            // moved to helpers-validation
"winston": "^3.17.0",        // moved to helpers-backend
"winston-daily-rotate-file": "^5.0.0",  // moved to helpers-backend
"winston-transport": "^4.9.0"  // moved to helpers-backend
```

**Keep these dependencies** (all platform-agnostic):

```json
"date-fns": "^4.1.0",    // Works in browser, React Native, Node.js
"he": "^1.2.0",          // Works everywhere
"uuid": "^13.0.0"        // Works everywhere
```

### 2. Remove Moved Code

**Delete these files/directories:**

```bash
# Backend utilities (moved to helpers-backend)
rm -rf packages/helpers/src/lib/backend/

# API client (moved to helpers-requests)
rm -rf packages/helpers/src/lib/requests/

# Validation (moved to helpers-validation and helpers-config)
rm -rf packages/helpers/src/lib/validation/

# Browser utilities (moved to helpers-browser)
rm -rf packages/helpers/src/lib/web/

# BigNumber utility (moved to helpers-backend)
rm packages/helpers/src/lib/playlistResource.ts
```

### 3. Update src/index.ts

**In `packages/helpers/src/index.ts`**, remove these lines:

```diff
-export * from './lib/backend';
-export * from './lib/web';
-export * from './lib/requests';
-export * from './lib/validation';
-export * from './lib/playlistResource';
```

Keep all other exports (DTOs, constants, utilities, etc.)

### 4. Reinstall and Build

```bash
cd packages/helpers
npm install
npm run build
```

## Platform Compatibility

After this step, `@podverse/helpers` will be **universal** (works everywhere):

- ✅ Browser (Next.js web apps)
- ✅ React Native (mobile apps - future)
- ✅ Node.js (backend apps)

All remaining utilities use only standard JavaScript/TypeScript features or universal dependencies (date-fns, he, uuid).

## Verification

- [ ] package.json dependencies updated (6 removed, 3 kept)
- [ ] All moved code deleted (5 directories/files)
- [ ] index.ts exports updated (5 lines removed)
- [ ] Package builds successfully with no errors
- [ ] No imports of removed code in remaining files
- [ ] Only platform-agnostic dependencies remain

## Files Modified

- `packages/helpers/package.json`
- `packages/helpers/src/index.ts`

## Files/Directories Deleted

- `packages/helpers/src/lib/backend/` (→ helpers-backend)
- `packages/helpers/src/lib/requests/` (→ helpers-requests)
- `packages/helpers/src/lib/validation/` (→ helpers-validation + helpers-config)
- `packages/helpers/src/lib/web/` (→ helpers-browser)
- `packages/helpers/src/lib/playlistResource.ts` (→ helpers-backend)

## Notes

After this step, core helpers will contain ONLY:

- DTOs (data transfer objects)
- Enums (MediumEnum, etc.)
- Constants (supported locales, etc.)
- Lightweight shared utilities (date/time, HTML encoding, image utils, etc.)
- **All cross-platform compatible** - works in web, mobile, and backend
