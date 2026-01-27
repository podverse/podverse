# Phase 3j: Update Management Web App Imports

**Dependencies**: Plan 02 must complete first
**Can run in parallel with**: Plans 03a-03i
**Run**: Parallel (Phase 3)

## Overview

Update the Management Web app to import from the new specialized helpers packages, particularly for the validate-env.ts build script.

## Tasks

### 1. Update package.json Dependencies

**In `apps/management-web/package.json`**, add to dependencies:
```json
"@podverse/helpers-config": "*"
```

### 2. Update Build Script (validate-env.ts)

**`apps/management-web/scripts/validate-env.ts`** uses startup validation utilities.

```bash
grep -r "validateRequired\|validateOptional\|validateBoolean" scripts/
```

**Update imports:**
```diff
-import { validateRequired, validateOptional } from '@podverse/helpers';
+import { validateRequired, validateOptional } from '@podverse/helpers-config';
```

### 3. Check for Other Imports

```bash
cd apps/management-web
grep -r "from '@podverse/helpers" src/ scripts/
```

Update any other imports that reference moved code.

### 4. Install and Build

```bash
cd apps/management-web
npm install
npm run build
```

## Verification

- [ ] `@podverse/helpers-config` in package.json
- [ ] Build script imports updated (validate-env.ts)
- [ ] No remaining imports from old paths
- [ ] Management Web builds successfully
- [ ] `npm run lint` passes

## Files Modified

- `apps/management-web/package.json`
- `apps/management-web/scripts/validate-env.ts`
