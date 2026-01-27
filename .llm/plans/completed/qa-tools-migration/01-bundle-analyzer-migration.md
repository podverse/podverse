# Bundle Analyzer Migration Plan

**Status**: Complete  
**Parent**: [00-master-plan.md](./00-master-plan.md)  
**Complexity**: Moderate

## Overview

Migrate the bundle analyzer tool from `podverse-web/qa/bundle-analyzer/` to `tools/web-perf/bundle-analyzer/`.

## Files to Migrate

### Source Files (`src/`)
- `index.ts` - Main entry point
- `bundle-analyzer.ts` - Core analysis logic
- `build-manager.ts` - Next.js build orchestration
- `report-manager.ts` - Report saving/loading
- `comparison.ts` - Report comparison engine
- `openai-summary.ts` - AI summary generation

### Configuration Files
- `package.json`
- `tsconfig.json`
- `README.md`

## Path Updates Required

### 1. `src/index.ts`

**Environment loading** (lines ~24-43):
```typescript
// OLD:
const webEnvPath = path.join(__dirname, '../../../env/local.env');
const openaiEnvPath = path.join(__dirname, '../../../.env.openai');

// NEW:
const webEnvPath = path.join(__dirname, '../../../apps/web/env/local.env');
const openaiEnvPath = path.join(__dirname, '../../../.env.openai');
```

**Reports directory** (lines ~167-170):
```typescript
// OLD:
const reportsDir = path.join(__dirname, '../../reports/bundle-analyzer');

// NEW:
const reportsDir = path.join(__dirname, '../reports/bundle-analyzer');
```

### 2. `src/build-manager.ts`

**Web root path** (constructor):
```typescript
// OLD:
const webRoot = path.resolve(currentDir, '../../../');

// NEW:
const webRoot = path.resolve(currentDir, '../../../apps/web');
```

### 3. `tsconfig.json`

```json
// OLD:
{
  "extends": "../../tsconfig.json",
  ...
}

// NEW:
{
  "extends": "../../../tsconfig.base.json",
  ...
}
```

### 4. `package.json`

Update name for clarity:
```json
{
  "name": "podverse-bundle-analyzer",
  ...
}
```

## Implementation Steps

### Step 1: Create Directory Structure
```
tools/web-perf/bundle-analyzer/
  src/
  package.json
  tsconfig.json
  README.md
```

### Step 2: Copy Source Files
Copy all 6 TypeScript files from `podverse-web/qa/bundle-analyzer/src/` to `tools/web-perf/bundle-analyzer/src/`.

### Step 3: Update Paths in Source Files

**index.ts** - Update 3 path references:
1. `webEnvPath`: `../../../env/local.env` → `../../../apps/web/env/local.env`
2. `openaiEnvPath`: `../../../.env.openai` → `../../../.env.openai` (unchanged)
3. `reportsDir`: `../../reports/bundle-analyzer` → `../reports/bundle-analyzer`

**build-manager.ts** - Update 1 path reference:
1. `webRoot`: `../../../` → `../../../apps/web`

### Step 4: Update Configuration Files

**tsconfig.json**:
- Change `extends` from `../../tsconfig.json` to `../../../tsconfig.base.json`

**package.json**:
- Update `name` to `podverse-bundle-analyzer`
- Keep all dependencies unchanged

### Step 5: Create Reports Directory
```
tools/web-perf/reports/bundle-analyzer/.gitkeep
```

### Step 6: Update README
Update the README to reflect new paths and monorepo context.

## Verification Checklist

- [ ] `npm install` succeeds in `tools/web-perf/bundle-analyzer/`
- [ ] `npm run analyze` starts without path errors
- [ ] Build completes and generates HTML reports
- [ ] Reports saved to `tools/web-perf/reports/bundle-analyzer/`
- [ ] Comparison with previous reports works
- [ ] OpenAI summary generation works (if API key configured)

## Dependencies Verification

Before running, ensure:
1. `apps/web/next.config.ts` has `@next/bundle-analyzer` configured
2. `apps/web/env/local.env` exists with valid configuration
3. `apps/web` builds successfully with `npm run build`

## Notes

- This tool is standalone and doesn't require running services
- Environment variables are loaded in priority order: local `.env` → `apps/web/env/local.env` → `.env.openai`
- Reports are self-contained JSON + HTML files
