# Phase 3: Application Migration (Outline)

**Status**: Outline - detailed plan after Phase 2

## Overview

Migrate 5 applications.

## Applications

1. api → `apps/api/`
2. web → `apps/web/`
3. workers → `apps/workers/`
4. management-api → `apps/management-api/`
5. management-web → `apps/management-web/`

## Per-App Tasks

1. Copy source files
2. Update `package.json` (workspace deps)
3. Create/update `tsconfig.json`
4. Update Dockerfile paths
5. Migrate env var handling
6. Verify dev server and build

## Key Considerations

- **web/management-web**: Next.js 15, i18n, SCSS
- **api/management-api**: Express, similar patterns
- **workers**: Multiple job types

## Verification

```bash
npm run dev:api
npm run dev:web
npm run build -w apps/api
```

## Estimated Effort

~10-15 hours total
