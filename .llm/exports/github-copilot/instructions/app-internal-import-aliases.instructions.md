---
description: "App-internal TypeScript path aliases must match the full apps/<name>/ directory name"
applyTo:
  - "apps/api/**/*.ts"
  - "apps/management-api/**/*.ts"
  - "apps/workers/**/*.ts"
  - "apps/api/tsconfig*.json"
  - "apps/management-api/tsconfig*.json"
  - "apps/workers/tsconfig*.json"
  - "apps/api/vitest.config.ts"
  - "apps/management-api/vitest.config.ts"
  - "apps/workers/vitest.config.ts"
---

# App internal import aliases

Node apps under `apps/` use a **TypeScript path alias** for imports from their own `src/` tree. The alias prefix must match the **full app directory name** under `apps/` — not abbreviations.

## Do

| App directory | Alias prefix | Example |
| --- | --- | --- |
| `apps/api/` | `@api/*` | `import { config } from '@api/config/index.js'` |
| `apps/management-api/` | `@management-api/*` | `import { config } from '@management-api/config/index.js'` |
| `apps/workers/` | `@workers/*` | `import { config } from '@workers/config/index.js'` |

Configure in each app's `tsconfig.json` `paths` and mirror the prefix root in `vitest.config.ts` for tests. Build uses `tsc-alias` to rewrite aliases to relative paths in `dist/`.

## Don't

- Do not abbreviate directory names (`@mgmt-api`, `@m-api`, etc.).
- Do not use npm workspace names (`@podverse/management-api/*`) for in-app imports — those are for cross-package deps only.

## Distinction

- **`@podverse/*`** — published/workspace packages under `packages/`
- **`@<app-dir-name>/*`** — internal imports within one deployable app
