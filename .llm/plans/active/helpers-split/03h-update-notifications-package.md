# Phase 3h: Update Notifications Package Imports

**Dependencies**: Plan 02 must complete first
**Can run in parallel with**: Plans 03a-03g, 03i-03j
**Run**: Parallel (Phase 3)

## Overview

Update the Notifications package to import backend utilities from `@podverse/helpers-backend` (if it uses them).

## Tasks

### 1. Check for Backend Imports

```bash
cd packages/notifications
grep -r "from '@podverse/helpers/dist/lib/backend" src/
grep -r "LoggerService\|TimerManager" src/
```

### 2. Update package.json (if needed)

**If backend imports found**, add to `packages/notifications/package.json`:
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
cd packages/notifications
npm install
npm run build
```

## Verification

- [ ] Searched for backend imports
- [ ] Updated imports if found (or confirmed none exist)
- [ ] Notifications builds successfully
- [ ] `npm run lint` passes

## Files Modified

- `packages/notifications/package.json` (if backend imports exist)
- Any files with backend imports
