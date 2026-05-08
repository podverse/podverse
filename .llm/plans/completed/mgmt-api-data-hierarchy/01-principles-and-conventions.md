# Phase 01 — Principles and Conventions

Establishes the contract every later phase follows. No code changes here; this
file exists so each per-resource phase can cite the same rules.

## Hierarchy contract

- Routers are organized by **top-level resource**, not feature area.
  Resources: `auth`, `admins`, `users`, `feeds`, `products`, `stats`, `storage`,
  `database`, `workers`.
- Every URL begins `/<prefix><version>/<resource>` (e.g. `/api/v2/admins`).
- Sub-resources nest under their parent
  (e.g. `/admins/:id/invite-link`, `/users/:id/password`,
  `/products/pricing/:id/activate`).
- Public actions on a resource that cannot key on a parent id (token redemption)
  live at the resource root
  (e.g. `POST /admins/invite-link/redeem`).
- Inversion of "verb-first" paths: `/stats/top/:type` becomes `/stats/:type/top`.
  Entity type is the parent; ranking/search are children.
- RPC-style "do verb on entity" endpoints stay as
  `POST /<resource>/:id/<verb>` (e.g. activate/deprecate pricing) — REST-ish
  where natural, RPC-ish where the operation is not a CRUD field replacement.

## Mount-style routers

All router files match `apps/api/src/routes/account.ts` style:

```ts
import { Router } from 'express';
import { config } from '@mgmt-api/config/index.js';

const router = Router();
router.use(`${config.api.prefix}${config.api.version}/<segment>`, router);

router.get('/', ...);
router.get('/:id', ...);
```

- **Banned**: `${baseUrl}/<segment>/...` repeated in every handler.
- **Banned**: per-handler prefix concatenation; one mount per file.
- **Allowed exception**: composite resources may compose sub-routers
  (see `apps/management-api/src/routes/product/index.ts`); the composition file
  performs the single mount.

## Test, doc, and request-module symmetry

For every renamed URL the phase must update:

1. The router file in `apps/management-api/src/routes/`.
2. The `apps/management-api/src/routes/*.integration.test.ts` for that resource.
3. The `apps/management-web/src/lib/requests/*.ts` request module(s).
4. Any management-web page (`apps/management-web/src/app/(management)/**` or
   public route) that references the renamed URL.
5. Any e2e spec under `apps/management-web/e2e/` that drives a renamed page or
   API path.
6. `apps/management-api/APPS-MANAGEMENT-API.md` endpoint list.

No legacy alias, no soft deprecation. Hard break per **D4**.
