# Lighthouse Migration Plan

**Status**: Complete  
**Parent**: [00-master-plan.md](./00-master-plan.md)  
**Complexity**: High

## Overview

Migrate the Lighthouse performance testing tool from `podverse-web/qa/lighthouse/` to `tools/web-perf/lighthouse/`.

## Files to Migrate

### Source Files (`src/`)
- `index.ts` - Main entry point
- `api-manager.ts` - API server lifecycle
- `asset-generator.ts` - Test media generation
- `asset-server.ts` - Local asset HTTP server
- `browser-automation.ts` - Playwright browser control
- `comparison.ts` - Report comparison engine
- `container-checker.ts` - Docker container validation
- `database-setup.ts` - Test database management
- `lighthouse-runner.ts` - Lighthouse test execution
- `openai-summary.ts` - AI summary generation
- `port-killer.ts` - Process cleanup utility
- `report-manager.ts` - Report saving/loading
- `user-manager.ts` - Test user creation
- `web-app-manager.ts` - Web app lifecycle

### Asset Files (`assets/`)
- `feed-1.rss` - Test RSS feed
- `feed-2.rss` - Test RSS feed
- `feed-3.rss` - Test RSS feed
- `README.md` - Asset documentation

### Configuration Files
- `package.json`
- `tsconfig.json`
- `.env.example`
- `.gitignore`
- `.nvmrc`
- `README.md`

## Path Updates Required

### 1. `src/index.ts`

**Environment loading** (lines ~30-44):
```typescript
// OLD:
const webEnvPath = path.join(__dirname, '../../../env/local.env');

// NEW:
const webEnvPath = path.join(__dirname, '../../../apps/web/env/local.env');
```

### 2. `src/web-app-manager.ts`

**Web root path** (constructor):
```typescript
// OLD:
const webRoot = path.resolve(currentDir, '../../../');
this.podverseWebPath = webRoot;

// NEW:
const webRoot = path.resolve(currentDir, '../../../apps/web');
this.podverseWebPath = webRoot;
```

### 3. `src/api-manager.ts`

**API root path** (constructor, if similar pattern):
```typescript
// NEW (if not already parameterized):
const apiRoot = path.resolve(currentDir, '../../../apps/api');
```

### 4. `src/database-setup.ts`

**Paths** (constructor):
```typescript
// OLD:
const webRoot = path.resolve(currentDir, '../../../');
const opsRoot = path.resolve(webRoot, '../podverse-ops');

// NEW:
// podverse-ops is a sibling repo to the monorepo
const monorepoRoot = path.resolve(currentDir, '../../../../');
const opsRoot = path.resolve(monorepoRoot, '../podverse-ops');
```

### 5. `tsconfig.json`

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

### 6. `package.json`

Update name for clarity:
```json
{
  "name": "podverse-lighthouse",
  ...
}
```

## Implementation Steps

### Step 1: Create Directory Structure
```
tools/web-perf/lighthouse/
  src/
  assets/
  package.json
  tsconfig.json
  .env.example
  .gitignore
  .nvmrc
  README.md
```

### Step 2: Copy Source Files
Copy all 14 TypeScript files from `podverse-web/qa/lighthouse/src/` to `tools/web-perf/lighthouse/src/`.

### Step 3: Copy Asset Files
Copy RSS feed files from `podverse-web/qa/lighthouse/assets/`:
- `feed-1.rss`
- `feed-2.rss`
- `feed-3.rss`
- `README.md`

**Do NOT copy** generated files (`.jpg`, `.mp3`, `.mp4` - these are auto-generated).

### Step 4: Update Paths in Source Files

**index.ts**:
- `webEnvPath`: `../../../env/local.env` → `../../../apps/web/env/local.env`

**web-app-manager.ts**:
- `webRoot`: `../../../` → `../../../apps/web`

**api-manager.ts** (if applicable):
- Update path to `apps/api` if using relative paths

**database-setup.ts**:
- `opsRoot`: Update sibling repo path calculation
- The podverse-ops repo is a sibling to the monorepo, not inside it

### Step 5: Update Configuration Files

**tsconfig.json**:
- Change `extends` from `../../tsconfig.json` to `../../../tsconfig.base.json`

**package.json**:
- Update `name` to `podverse-lighthouse`
- Keep all dependencies unchanged

**.env.example**:
- Update any path comments to reflect new structure

**.gitignore**:
- Keep as-is (ignores generated assets)

**.nvmrc**:
- Keep as-is (`22.17.0`)

### Step 6: Create Reports Directory
```
tools/web-perf/reports/lighthouse/.gitkeep
```

### Step 7: Update README
Update documentation to reflect:
- New paths in monorepo
- How to run from `tools/web-perf/lighthouse/`
- Dependencies on `apps/web`, `apps/api`, and `podverse-ops`

## Verification Checklist

### Setup
- [ ] `npm install` succeeds in `tools/web-perf/lighthouse/`
- [ ] TypeScript compiles without errors

### External Dependencies
- [ ] Docker is running
- [ ] `podverse-ops` repo is available at sibling path
- [ ] `make test_db_up` works from podverse-ops
- [ ] `apps/web` and `apps/api` can be started

### Test Execution
- [ ] `npm test` starts without path errors
- [ ] Asset server starts on port 2111
- [ ] Test database initializes on port 5111
- [ ] API starts on port 1111
- [ ] Web app starts on port 3111
- [ ] Lighthouse tests run and complete
- [ ] Reports saved to `tools/web-perf/reports/lighthouse/`

### Cleanup
- [ ] All processes terminate on completion
- [ ] Ctrl+C cleanup works correctly

## Port Usage

| Service | Port | Purpose |
|---------|------|---------|
| Web App (test) | 3111 | Next.js app under test |
| API (test) | 1111 | API server for web app |
| Asset Server | 2111 | Serves test images/media/RSS |
| Test Database | 5111 | PostgreSQL for test data |

## External Dependencies

### Required Before Running
1. **Docker**: Must be running for test database
2. **podverse-ops repo**: At `../../podverse-ops` relative to monorepo root
3. **Database seed script**: `podverse-ops/database/seed-scripts/local-lighthouse-test-fixtures.sql`

### Auto-Generated (Not Migrated)
- Test images (`*.jpg`) - Generated by `asset-generator.ts`
- Test audio (`*.mp3`) - Generated using `ffmpeg-static`
- Test video (`*.mp4`) - Generated using `ffmpeg-static`

## Architecture Notes

```
┌─────────────────────────────────────────────────────────────┐
│                    Lighthouse QA Tool                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   index.ts   │───▶│  Managers    │───▶│  Runners     │   │
│  │  (entry)     │    │              │    │              │   │
│  └──────────────┘    │- WebApp      │    │- Lighthouse  │   │
│                      │- Api         │    │- Browser     │   │
│                      │- Database    │    │- Comparison  │   │
│                      │- Asset       │    └──────────────┘   │
│                      └──────────────┘                        │
│                             │                                │
│                             ▼                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                External Services                      │   │
│  │                                                       │   │
│  │  apps/web (3111)  apps/api (1111)  podverse-ops      │   │
│  │                                    (test DB: 5111)    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Notes

- This tool manages its own test environment (separate ports from dev)
- Test database runs on port 5111, not the standard 5432
- Assets are auto-generated on first run if missing
- The tool orchestrates: database → asset server → API → web app → tests → cleanup
