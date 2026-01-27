# Phase 3f: Update Parser Package Imports

**Dependencies**: Plan 02 must complete first
**Can run in parallel with**: Plans 03a-03e, 03g-03i
**Run**: Parallel (Phase 3)

## Overview

Update the Parser package to import from the new specialized helpers packages.

## Tasks

### 1. Update package.json Dependencies

**In `packages/parser/package.json`**, add to dependencies:
```json
"@podverse/helpers-backend": "*",
"@podverse/helpers-validation": "*"
```

### 2. Update Backend Imports

**`packages/parser/src/factories/loggerService.ts`:**
Check if it imports LoggerService and update if needed.

Search for backend imports:
```bash
cd packages/parser
grep -r "from '@podverse/helpers/dist/lib/backend" src/
grep -r "LoggerService" src/
```

### 3. Update URL Validation Imports

The parser uses URL validation utilities. Search for usage:

```bash
grep -r "isValidHttpUrl\|validateHttpsUrl" src/
```

**Update imports:**
```diff
-import { isValidHttpUrl } from '@podverse/helpers';
+import { isValidHttpUrl } from '@podverse/helpers-validation';
```

**Known files using URL validation:**
- `src/lib/compat/partytime/value.ts`
- `src/lib/compat/partytime/liveItem.ts`
- `src/lib/compat/partytime/item.ts`
- `src/lib/compat/partytime/channel.ts`
- `src/lib/compat/chapters/chapters.ts`

### 4. Install and Build

```bash
cd packages/parser
npm install
npm run build
```

## Verification

- [ ] Both new package dependencies added
- [ ] Backend imports updated
- [ ] URL validation imports updated (~5 files)
- [ ] No remaining imports from old paths
- [ ] Parser builds successfully
- [ ] `npm run lint` passes

## Files Modified

- `packages/parser/package.json`
- `packages/parser/src/factories/loggerService.ts` (if needed)
- `packages/parser/src/lib/compat/partytime/value.ts`
- `packages/parser/src/lib/compat/partytime/liveItem.ts`
- `packages/parser/src/lib/compat/partytime/item.ts`
- `packages/parser/src/lib/compat/partytime/channel.ts`
- `packages/parser/src/lib/compat/chapters/chapters.ts`
