# Phase 14: ESM Migration (Future Work)

**Status**: Placeholder - to be detailed after package migration

## Overview

Convert all packages and apps from CommonJS to ESM (NodeNext module system).

## Why ESM?

- Future-proof: ESM is the official JavaScript module standard
- Better tree-shaking for smaller bundles
- Top-level await support
- Consistent with browser JavaScript
- Node.js is moving toward ESM as default

## Prerequisites

- All packages migrated to monorepo (Phase 2)
- All apps migrated to monorepo (Phases 3-5)
- Stable builds with CommonJS

## Migration Steps (High-Level)

1. Update each package's `tsconfig.json`:
   - Change `"module": "CommonJS"` to `"module": "NodeNext"`
   - Change `"moduleResolution": "Node"` to `"moduleResolution": "NodeNext"`

2. Update import statements:
   - Add `.js` extension to relative imports
   - Replace `require()` with `import`
   - Replace `__dirname`/`__filename` with `import.meta.url` workarounds

3. Update `package.json` files:
   - Add `"type": "module"` to each package

4. Update any dynamic imports

5. Test thoroughly - ESM has different timing semantics

## Estimated Effort

~4-8 hours for all packages

## Notes

- TypeORM 0.3.x is compatible with ESM
- Some older dependencies may need `esModuleInterop`
- Consider doing this as a single PR to avoid mixed module states
