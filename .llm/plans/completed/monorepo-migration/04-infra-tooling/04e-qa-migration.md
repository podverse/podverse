# Phase 4E: QA Tool Migration

**Status**: Ready for execution
**Estimated effort**: 1-2 hours
**Dependencies**: None (can run in parallel with Part A)

## Overview

Migrate the podverse-qa testing and faker utilities to the monorepo as a workspace tool package at `tools/qa/`.

## Source Structure

```
podverse-qa/
├── docs/
│   └── faker/              # 32 documentation files
├── src/
│   ├── config/
│   │   └── index.ts
│   ├── factories/
│   │   └── loggerService.ts
│   ├── faker/
│   │   └── constants.ts
│   ├── index.ts
│   └── module-alias-config.ts
├── ENV.md
├── eslint.config.mjs
├── LICENSE
├── nodemon.json
├── package.json
├── README.md
└── tsconfig.json
```

## Target Structure

```
tools/qa/
├── docs/
│   └── faker/
├── src/
│   ├── config/
│   ├── factories/
│   ├── faker/
│   ├── index.ts
│   └── module-alias-config.ts
├── ENV.md
├── eslint.config.mjs
├── LICENSE
├── nodemon.json
├── package.json
├── README.md
└── tsconfig.json
```

## Current Dependencies

From `podverse-qa/package.json`:
```json
{
  "dependencies": {
    "@faker-js/faker": "^10.0.0",
    "module-alias": "^2.2.3",
    "podverse-external-services": "^5.0.3",
    "podverse-helpers": "^5.1.0",
    "podverse-orm": "^5.0.5",
    "podverse-parser": "^5.0.9"
  }
}
```

## Updated Dependencies

Convert npm package references to workspace references:

```json
{
  "dependencies": {
    "@faker-js/faker": "^10.0.0",
    "module-alias": "^2.2.3",
    "@podverse/external-services": "workspace:*",
    "@podverse/helpers": "workspace:*",
    "@podverse/orm": "workspace:*",
    "@podverse/parser": "workspace:*"
  }
}
```

## Tasks

### Task 1: Copy source files

```bash
# From monorepo root
mkdir -p tools/qa
cp -r ../podverse-qa/src tools/qa/
cp -r ../podverse-qa/docs tools/qa/
cp ../podverse-qa/ENV.md tools/qa/
cp ../podverse-qa/eslint.config.mjs tools/qa/
cp ../podverse-qa/LICENSE tools/qa/
cp ../podverse-qa/nodemon.json tools/qa/
cp ../podverse-qa/README.md tools/qa/
cp ../podverse-qa/tsconfig.json tools/qa/
```

### Task 2: Create updated package.json

Create `tools/qa/package.json`:

```json
{
  "name": "@podverse/qa",
  "version": "5.2.0",
  "description": "QA tools and faker utilities for Podverse testing",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/**/*"
  ],
  "scripts": {
    "build:watch": "nodemon --watch 'src' --delay 500ms -x \"npm run build\"",
    "build": "npm run lint && tsc",
    "lint": "eslint ./src",
    "lint:fix": "eslint ./src --fix",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit",
    "start": "ts-node ./dist/index.js",
    "faker": "ts-node ./src/faker/index.ts"
  },
  "license": "AGPL-3.0",
  "dependencies": {
    "@faker-js/faker": "^10.0.0",
    "module-alias": "^2.2.3",
    "@podverse/external-services": "workspace:*",
    "@podverse/helpers": "workspace:*",
    "@podverse/orm": "workspace:*",
    "@podverse/parser": "workspace:*"
  },
  "devDependencies": {
    "@dotenvx/dotenvx": "^1.49.0",
    "@types/node": "^24.4.0",
    "nodemon": "^3.1.10",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.2"
  }
}
```

### Task 3: Update import paths in source files

**src/factories/loggerService.ts**

Before:
```typescript
import { LoggerService } from 'podverse-helpers/dist/lib/backend/logger';
```

After:
```typescript
import { LoggerService } from '@podverse/helpers/dist/lib/backend/logger';
```

**Any other files with podverse-* imports** need similar updates.

### Task 4: Update tsconfig.json

Ensure tsconfig.json references the workspace base config:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES6",
    "module": "commonjs",
    "strict": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./"
  },
  "include": [
    "./src/**/*.ts"
  ],
  "exclude": ["node_modules", "dist"]
}
```

### Task 5: Add to root package.json workspaces

The root package.json already includes `"tools/*"` in workspaces:

```json
{
  "workspaces": [
    "packages/*",
    "apps/*",
    "tools/*"
  ]
}
```

No changes needed.

### Task 6: Add build script to root package.json (optional)

If you want a dedicated QA build script:

```json
{
  "scripts": {
    "build:qa": "npm run build -w tools/qa"
  }
}
```

## Import Path Changes

| Old Import | New Import |
|------------|------------|
| `podverse-helpers` | `@podverse/helpers` |
| `podverse-external-services` | `@podverse/external-services` |
| `podverse-orm` | `@podverse/orm` |
| `podverse-parser` | `@podverse/parser` |

## Module Alias Update

Update `src/module-alias-config.ts` if needed (it should work as-is since it just uses `__dirname`).

## Documentation

The `docs/faker/` directory contains 32 markdown files documenting the faker implementation. These should be copied as-is.

## Verification Steps

1. Run `npm install` from monorepo root
2. Run `npm run build -w tools/qa`
3. Verify no TypeScript errors
4. Run `npm run lint -w tools/qa`
5. Test faker script: `npm run faker -w tools/qa` (may require env setup)

## Notes

- The `module-alias` package is used for path aliases but may not be necessary in the monorepo with proper tsconfig paths
- Consider removing `module-alias` in a future refactor if tsconfig paths are sufficient
- The QA tool depends on all four core packages, so it should be built after them in the build chain
- The faker documentation is comprehensive and should be preserved for LLM context

## Build Order

The QA tool should be built last due to its dependencies:

```
1. packages/helpers
2. packages/external-services
3. packages/orm
4. packages/notifications (not used by QA)
5. packages/parser
6. packages/mq (not used by QA)
7. tools/qa  <- After all its dependencies
```
