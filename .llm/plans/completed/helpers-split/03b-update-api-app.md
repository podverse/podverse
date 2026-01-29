# Phase 3b: Update API App Imports

**Dependencies**: Plan 02 must complete first
**Can run in parallel with**: Plans 03a, 03c-03i
**Run**: Parallel (Phase 3)

## Overview

Update the API app to import backend and config utilities from the new specialized packages.

## Tasks

### 1. Update package.json Dependencies

**In `apps/api/package.json`**, add to dependencies:

```json
"@podverse/helpers-backend": "*",
"@podverse/helpers-config": "*"
```

### 2. Update LoggerService Import

**`apps/api/src/factories/loggerService.ts`:**

```diff
-import { LoggerService } from '@podverse/helpers/dist/lib/backend/logger';
+import { LoggerService } from '@podverse/helpers-backend';
```

### 3. Update Config Validation Imports

**`apps/api/src/index.ts`** (or wherever config validation is used):

```diff
-import { validateORMConfig, assertConfigValid } from '@podverse/helpers';
+import { validateORMConfig, assertConfigValid } from '@podverse/helpers-config';
```

### 4. Update Startup Validation Imports

**`apps/api/src/lib/startup/validation.ts`:**

```diff
-import { validateRequired, validateOptional, validateBoolean, ... } from '@podverse/helpers';
+import { validateRequired, validateOptional, validateBoolean, ... } from '@podverse/helpers-config';
```

### 5. Search for Other Backend/Config Imports

```bash
cd apps/api
grep -r "from '@podverse/helpers/dist/lib/backend" src/
grep -r "LoggerService\|TimerManager" src/
grep -r "validateRequired\|validateOptional\|validateORMConfig" src/
```

Update any found occurrences.

### 6. Install and Build

```bash
cd apps/api
npm install
npm run build
```

## Verification

- [ ] `@podverse/helpers-backend` in package.json
- [ ] `@podverse/helpers-config` in package.json
- [ ] LoggerService imports updated
- [ ] Config validation imports updated
- [ ] Startup validation imports updated
- [ ] No remaining imports from old backend/validation paths
- [ ] API builds successfully
- [ ] `npm run lint` passes

## Files Modified

- `apps/api/package.json`
- `apps/api/src/factories/loggerService.ts`
- `apps/api/src/index.ts` (config validation)
- `apps/api/src/lib/startup/validation.ts`
- Any other files with backend/config imports
