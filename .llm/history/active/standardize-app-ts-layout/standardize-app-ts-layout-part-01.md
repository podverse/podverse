# standardize-app-ts-layout

**Started:** 2026-05-03  
**Author:** Agent  
**Context:** Align Express `app.ts` layout across Podverse API, Podverse management-api, Metaboost API, and Metaboost management-api (comments + route order only).

---

### Session 1 - 2026-05-03

#### Prompt (Developer)

Standardize `app.ts` layout (Podverse + Metaboost)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Podverse API: `reflect-metadata` moved to first import (with `simple-import-sort` eslint suppression); section banners (`// --- ...`); versioned `meta` route registered before versioned `/` after dynamic imports; health remains before category cache as before.
- Podverse management-api: versioned route order `/` → `meta` → `registerHealthRoutes` → `${baseUrl}/` → feature routers; matching section banners; blank line after reflect-metadata block.
- Metaboost API + management-api: single `import type { Express, NextFunction, Request, Response } from 'express'`; section banners including note on path-split CORS for main API.
- Fixed `registerHealthRoutes.ts` import order in Podverse management-api (eslint `--fix`) so workspace lint passes.
- Full Podverse `npm run test:e2e:api` failed on `health-ready.test.ts` with missing `category` table (environment/DB migration); other API tests and all management-api tests passed when excluding that file.

#### Files Created/Modified

- apps/api/src/app.ts
- apps/management-api/src/app.ts
- apps/management-api/src/lib/health/registerHealthRoutes.ts
