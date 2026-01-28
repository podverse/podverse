# Phase 3d: Update Management API Imports

**Dependencies**: Plan 02 must complete first
**Can run in parallel with**: Plans 03a-03c, 03e-03i
**Run**: Parallel (Phase 3)

## Overview

Update the Management API app to import backend and config utilities from the new specialized packages.

## Tasks

### 1. Check for Backend/Config Imports

```bash
cd apps/management-api
grep -r "from '@podverse/helpers/dist/lib/backend" src/
grep -r "LoggerService\|TimerManager" src/
grep -r "validateRequired\|validateOptional\|validateORMConfig" src/
```

### 2. Update package.json (if imports found)

**If backend or config imports exist**, add to `apps/management-api/package.json`:

```json
"@podverse/helpers-backend": "*",
"@podverse/helpers-config": "*"
```

### 3. Update LoggerService Imports (if used)

```diff
-import { LoggerService } from '@podverse/helpers/dist/lib/backend/logger';
+import { LoggerService } from '@podverse/helpers-backend';
```

### 4. Update Startup Validation Imports

**`apps/management-api/src/lib/startup/validation.ts`:**

```diff
-import { validateRequired, validateOptional, validateBoolean, ... } from '@podverse/helpers';
+import { validateRequired, validateOptional, validateBoolean, ... } from '@podverse/helpers-config';
```

### 5. Install and Build

```bash
cd apps/management-api
npm install
npm run build
```

## Verification

- [ ] Searched for backend/config imports
- [ ] Updated package.json if needed
- [ ] Updated imports if found
- [ ] Management API builds successfully
- [ ] `npm run lint` passes

## Files Modified

- `apps/management-api/package.json` (if imports exist)
- `apps/management-api/src/lib/startup/validation.ts`
- Any other files with backend/config imports
