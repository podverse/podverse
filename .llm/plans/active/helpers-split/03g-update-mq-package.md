# Phase 3g: Update MQ Package Imports

**Dependencies**: Plan 02 must complete first
**Can run in parallel with**: Plans 03a-03f, 03h-03j
**Run**: Parallel (Phase 3)

## Overview

Update the MQ package to import backend utilities from `@podverse/helpers-backend` (if it uses them).

## Tasks

### 1. Check for Backend Imports

```bash
cd packages/mq
grep -r "from '@podverse/helpers/dist/lib/backend" src/
grep -r "LoggerService\|TimerManager" src/
```

### 2. Update package.json (if needed)

**If backend imports found**, add to `packages/mq/package.json`:
```json
"@podverse/helpers-backend": "*"
```

### 3. Update Imports (if needed)

Update any LoggerService or backend utility imports:
```diff
-import { LoggerService } from '@podverse/helpers/dist/lib/backend/logger';
+import { LoggerService } from '@podverse/helpers-backend';
```

### 4. Install and Build

```bash
cd packages/mq
npm install
npm run build
```

## Verification

- [ ] Searched for backend imports
- [ ] Updated imports if found (or confirmed none exist)
- [ ] MQ builds successfully
- [ ] `npm run lint` passes

## Files Modified

- `packages/mq/package.json` (if backend imports exist)
- Any files with backend imports
