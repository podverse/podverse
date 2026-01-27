# Phase 3e: Update ORM Package Imports

**Dependencies**: Plan 02 must complete first
**Can run in parallel with**: Plans 03a-03d, 03f-03i
**Run**: Parallel (Phase 3)

## Overview

Update the ORM package to import from the new specialized helpers packages.

## Tasks

### 1. Update package.json Dependencies

**In `packages/orm/package.json`**, add to dependencies:
```json
"@podverse/helpers-backend": "*",
"@podverse/helpers-validation": "*"
```

### 2. Update Backend Imports

**`packages/orm/src/factories/loggerService.ts`:**
Check if it imports LoggerService and update if needed.

Search for backend imports:
```bash
cd packages/orm
grep -r "from '@podverse/helpers/dist/lib/backend" src/
grep -r "LoggerService" src/
```

### 3. Update Validation Imports

**`packages/orm/src/services/account/account.ts`:**
```diff
-import { validateEmail, validatePassword } from '@podverse/helpers';
+import { validateEmail, validatePassword } from '@podverse/helpers-validation';
```

Search for other validation usage:
```bash
grep -r "validateEmail\|validatePassword\|DATABASE_CONSTANTS" src/
```

### 4. Install and Build

```bash
cd packages/orm
npm install
npm run build
```

## Verification

- [ ] Both new package dependencies added
- [ ] Backend imports updated (if any)
- [ ] Validation imports updated (account.ts)
- [ ] No remaining imports from old paths
- [ ] ORM builds successfully
- [ ] `npm run lint` passes

## Files Modified

- `packages/orm/package.json`
- `packages/orm/src/services/account/account.ts`
- `packages/orm/src/factories/loggerService.ts` (if needed)
- Any other files with backend/validation imports
