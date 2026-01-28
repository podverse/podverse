# Phase 2a: Update API App Imports

**Dependencies**: Plan 01 must complete first
**Can run in parallel with**: Plans 02b, 02c, 02d, 02e, 02f

## Overview

Update the API app to use `@podverse/helpers-backend` for logger imports.

## Tasks

### 1. Update Package Dependency

**In `apps/api/package.json`**, add to dependencies:

```json
"@podverse/helpers-backend": "*"
```

### 2. Update LoggerService Import

**`apps/api/src/factories/loggerService.ts`:**

```diff
-import { LoggerService } from '@podverse/helpers/dist/lib/backend/logger';
+import { LoggerService } from '@podverse/helpers-backend';
```

### 3. Search for Other Backend Imports

Search for any other imports from helpers backend:

```bash
cd apps/api
grep -r "from '@podverse/helpers/dist/lib/backend" src/
grep -r "from '@podverse/helpers.*backend" src/
```

Update any found occurrences.

### 4. Install and Build

```bash
cd apps/api
npm install
npm run build
```

## Verification

- [ ] `@podverse/helpers-backend` in package.json dependencies
- [ ] LoggerService imports updated
- [ ] No remaining imports from `@podverse/helpers/dist/lib/backend`
- [ ] API builds successfully
- [ ] `npm run lint` passes

## Files Changed

- `apps/api/package.json`
- `apps/api/src/factories/loggerService.ts`
- Any other files with backend imports (search to confirm)
