# Phase 2: Package Migration (Outline)

**Status**: Complete

## Overview

Migrate 6 packages in dependency order.

## Migration Order

1. helpers → `packages/helpers/`
2. external-services → `packages/external-services/`
3. orm → `packages/orm/`
4. notifications → `packages/notifications/`
5. parser → `packages/parser/`
6. mq → `packages/mq/`

## Per-Package Tasks

1. Copy source files
2. Update `package.json` (scope name, workspace deps)
3. Create `tsconfig.json` extending base
4. Verify build and lint
5. Update imports

## Key Considerations

- **helpers** is foundational - must work first
- **orm** needs TypeORM tsconfig adjustments
- **parser** depends on external `podverse-partytime`

## Verification

```bash
npm run build:packages
npm run lint
npm run type-check
```

## Estimated Effort

~8-12 hours total
