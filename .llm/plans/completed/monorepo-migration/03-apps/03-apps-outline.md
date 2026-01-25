# Phase 3: Application Migration (Outline)

**Status**: Expanded into sub-plans (03a-03f)

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

~14-21 hours total

---

## Sub-Plans

This outline has been expanded into the following detailed sub-plans:

- [03a-management-api.md](03a-management-api.md) - management-api migration (1-2 hrs)
- [03b-management-web.md](03b-management-web.md) - management-web migration (2-3 hrs)
- [03c-workers.md](03c-workers.md) - workers migration (2-3 hrs)
- [03d-api.md](03d-api.md) - api migration (3-4 hrs)
- [03e-web.md](03e-web.md) - web migration (4-6 hrs)
- [03f-integration.md](03f-integration.md) - integration and Dockerfiles (2-3 hrs)
