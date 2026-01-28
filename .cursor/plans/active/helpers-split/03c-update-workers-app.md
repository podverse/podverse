# Phase 3c: Update Workers App Imports

**Dependencies**: Plan 02 must complete first
**Can run in parallel with**: Plans 03a, 03b, 03d-03i
**Run**: Parallel (Phase 3)

## Overview

Update the Workers app to import backend and config utilities from the new specialized packages.

## Tasks

### 1. Update package.json Dependencies

**In `apps/workers/package.json`**, add to dependencies:

```json
"@podverse/helpers-backend": "*",
"@podverse/helpers-config": "*"
```

### 2. Update LoggerService Import

**`apps/workers/src/factories/loggerService.ts`:**

```diff
-import { LoggerService } from '@podverse/helpers/dist/lib/backend/logger';
+import { LoggerService } from '@podverse/helpers-backend';
```

### 3. Update TimerManager Import

**`apps/workers/src/factories/timerManager.ts`:**

```diff
-import { TimerManager } from '@podverse/helpers/dist/lib/backend/logTimer';
+import { TimerManager } from '@podverse/helpers-backend';
```

### 4. Update Config Validation Imports

**`apps/workers/src/index.ts`** (or wherever config validation is used):

```diff
-import { validateORMConfig, validateParserConfig, assertConfigValid } from '@podverse/helpers';
+import { validateORMConfig, validateParserConfig, assertConfigValid } from '@podverse/helpers-config';
```

### 5. Update Startup Validation Imports

**`apps/workers/src/lib/startup/validation.ts`:**

```diff
-import { validateRequired, validateOptional, validateBoolean, ... } from '@podverse/helpers';
+import { validateRequired, validateOptional, validateBoolean, ... } from '@podverse/helpers-config';
```

### 6. Search for Other Backend/Config Imports

```bash
cd apps/workers
grep -r "from '@podverse/helpers/dist/lib/backend" src/
grep -r "LoggerService\|TimerManager" src/
grep -r "validateRequired\|validateOptional\|validateORMConfig\|validateParserConfig" src/
```

### 7. Install and Build

```bash
cd apps/workers
npm install
npm run build
```

## Verification

- [ ] `@podverse/helpers-backend` in package.json
- [ ] `@podverse/helpers-config` in package.json
- [ ] LoggerService imports updated
- [ ] TimerManager imports updated
- [ ] Config validation imports updated
- [ ] Startup validation imports updated
- [ ] No remaining imports from old backend/validation paths
- [ ] Workers builds successfully
- [ ] `npm run lint` passes

## Files Modified

- `apps/workers/package.json`
- `apps/workers/src/factories/loggerService.ts`
- `apps/workers/src/factories/timerManager.ts`
- `apps/workers/src/index.ts` (config validation)
- `apps/workers/src/lib/startup/validation.ts`
