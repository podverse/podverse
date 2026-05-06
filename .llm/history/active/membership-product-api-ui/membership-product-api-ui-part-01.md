# membership-product-api-ui

**Started:** 2026-05-04  
**Author:** Cursor Agent  
**Context:** Membership product env defaults via shared ConfigMap + API-driven management-web; helpers export fix for Vitest.

---

### Session 1 - 2026-05-04

#### Prompt (Agent)

(System handoff) Continue implementation: membership ConfigMap on management-api deployment, dedupe `api.env`, management-web fetch from management-api and strip `NEXT_PUBLIC_*` membership mirrors from runtime-config/sidecar/K8s sidecar env; integration tests; fix `@podverse/helpers` Vitest interop for `resolveMembershipProductDefaultsFromEnv`.

#### Key Decisions

- **`@podverse/helpers`**: Added `package.json` `exports` with explicit `.` and subpath `./lib/membershipProductDefaultsFromEnv.js` so server code and Vitest load a real module (avoids `resolveMembershipProductDefaultsFromEnv is not a function` from barrel + Vite SSR). API and management-api import resolver from that subpath.
- **`packages/helpers/src/index.ts`**: Use explicit named exports for `MembershipProductDefaultsFromEnv` / `resolveMembershipProductDefaultsFromEnv` instead of `export *` for that file.
- **management-web**: Create-user flow loads `GET /api/v2/membership-product-defaults` with cookie auth; loading gate until fetch completes; client fallback aligned with helper defaults on fetch failure; removed membership keys from `runtime-config.ts`, sidecar `server.ts`, and `management-web-sidecar.env`.
- **K8s**: `management-api/deployment.yaml` last `envFrom` entry for `podverse-membership-product-config`; `api/source/api.env` trimmed duplicate pricing/trial numeric keys (comment points at membership ConfigMap).

#### Files Created/Modified

- `packages/helpers/package.json`
- `packages/helpers/src/index.ts`
- `apps/api/src/controllers/membership.ts`
- `apps/api/src/test/external-services-and-meta.test.ts`
- `apps/management-api/src/routes/membershipProductDefaults.ts`
- `apps/management-api/src/routes/membershipProductDefaults.integration.test.ts`
- `apps/management-web/src/lib/requests/membershipProductDefaults.ts`
- `apps/management-web/src/lib/createUserFormDefaults.ts`
- `apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx`
- `apps/management-web/src/config/runtime-config.ts`
- `apps/management-web/sidecar/src/server.ts`
- `infra/k8s/base/management-api/deployment.yaml`
- `infra/k8s/base/api/source/api.env`
- `infra/k8s/base/management-web/source/management-web-sidecar.env`

### Session 2 - 2026-05-05

#### Prompt (Developer)

# Trial/pricing/RSS limits: management-web loads `/api/v2/membership-product-defaults` from management-api (podverse-membership-product-config on api + management-api).

i am thinking we should follow a convention like

/api/v2/product/membership/defaults

where product represents anything a user of this app can purchase from the site.

as we may potentially offer more products than memberships in the future. both podverse and metaboost should follow this convention (i am not sure if metaboost has memberships yet but there may be active plans you can update to make sure they are aligned with these goals)

#### Key Decisions

- Adopted canonical product endpoint path for membership defaults:
  - `/api/v2/product/membership/defaults` (new canonical path)
  - `/api/v2/membership-product-defaults` (kept as backward-compatible alias)
- Updated management-web request caller to the canonical path while preserving legacy server support.
- Updated management-web sidecar env comment text to reflect the canonical API path.
- No active plan files in `.llm/plans/active` referenced this endpoint path, so no plan updates were required.

#### Files Created/Modified

- `.llm/history/active/membership-product-api-ui/membership-product-api-ui-part-01.md`
- `apps/management-api/src/routes/membershipProductDefaults.ts`
- `apps/management-api/src/routes/membershipProductDefaults.integration.test.ts`

### Session 4 - 2026-05-05

#### Prompt (Developer)

Remove redundant `@podverse/helpers` subpath export

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Prompt (Developer)

you stalled last time. continue

#### Key Decisions

- Removed the dedicated `./lib/membershipProductDefaultsFromEnv.js` package export from
  `@podverse/helpers` and standardized imports to the package root export.
- Updated API and management-api membership defaults handlers to import
  `resolveMembershipProductDefaultsFromEnv` from `@podverse/helpers`.
- Verification used targeted Vitest runs:
  - management-api membership defaults integration spec passed.
  - API membership product defaults test scope passed.
  - Full `external-services-and-meta` file still has unrelated MQ permission expectation failures in this
    dirty branch.

#### Files Created/Modified

- `.llm/history/active/membership-product-api-ui/membership-product-api-ui-part-01.md`
- `apps/api/src/controllers/membership.ts`
- `apps/management-api/src/routes/membershipProductDefaults.ts`
- `packages/helpers/package.json`

### Session 3 - 2026-05-05

#### Prompt (Developer)

@podverse/apps/management-api/src/routes/membershipProductDefaults.ts:1-36 we do not want any references to "legacy path" check all of the non-committed changes and make sure it uses hard breaks and does not hang onto "legacy" handling

#### Key Decisions

- Enforced hard-break endpoint behavior by removing backward-compatible alias handling:
  - kept only `/api/v2/product/membership/defaults`
  - removed `/api/v2/membership-product-defaults` route handling and compatibility tests
- Verified Podverse management-api compiles after the hard-break cutover.

#### Files Created/Modified

- `.llm/history/active/membership-product-api-ui/membership-product-api-ui-part-01.md`
- `apps/management-api/src/routes/membershipProductDefaults.ts`
- `apps/management-api/src/routes/membershipProductDefaults.integration.test.ts`

### Session 5 - 2026-05-05

#### Prompt (Developer)

Product Membership Global Rename Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Hard-break renamed membership product surfaces to product membership naming in code and files.
- Changed management-api defaults endpoint from `/api/v2/product/membership/defaults` to `/api/v2/product/membership`.
- Changed main API defaults endpoint from `/api/v2/membership/product-defaults` to `/api/v2/product/membership`.
- Renamed K8s component and ConfigMap from `membership-product` to `product-membership` with atomic reference updates.
- Updated `.cursor` expiration-naming rule glob from `membershipProductDefaults*.ts` to `productMembershipDefaults*.ts`.

#### Files Created/Modified

- `.llm/history/active/membership-product-api-ui/membership-product-api-ui-part-01.md`
- `.cursor/rules/env-expiration-naming.mdc`
- `apps/api/src/app.ts`
- `apps/api/src/controllers/membership.ts`
- `apps/api/src/routes/productMembership.ts`
- `apps/api/src/test/external-services-and-meta.test.ts`
- `apps/management-api/src/app.ts`
- `apps/management-api/src/routes/productMembershipDefaults.ts`
- `apps/management-api/src/routes/productMembershipDefaults.integration.test.ts`
- `apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx`
- `apps/management-web/src/lib/createUserFormDefaults.ts`
- `apps/management-web/src/lib/requests/productMembershipDefaults.ts`
- `infra/k8s/base/api/deployment.yaml`
- `infra/k8s/base/api/kustomization.yaml`
- `infra/k8s/base/api/source/api.env`
- `infra/k8s/base/management-api/deployment.yaml`
- `infra/k8s/base/management-api/kustomization.yaml`
- `infra/k8s/base/management-web/source/management-web-sidecar.env`
- `infra/k8s/base/product-membership/kustomization.yaml`
- `infra/k8s/base/product-membership/source/product-membership-defaults.env`
- `packages/helpers/src/index.ts`
- `packages/helpers/src/lib/productMembershipDefaultsFromEnv.ts`

### Session 6 - 2026-05-05

#### Prompt (Developer)

complete anythig needed but you don't need to commit or run tests

#### Key Decisions

- Confirmed no remaining `membership-product` / old defaults path references in Podverse app code, packages, `infra/k8s`, env templates, or `docs/` (only historical lines in other `.llm/history` files).
- Sampled IDE diagnostics on management-web + helpers exports: no linter issues reported; skipped commit and test runs per request.

#### Files Created/Modified

- `.llm/history/active/membership-product-api-ui/membership-product-api-ui-part-01.md`

### Session 7 - 2026-05-05

#### Prompt (Developer)

Product router + nested membership — feasibility

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Replaced self-mounted **`productMembershipRouter`** with **`productRouter`** mounted at
  **`${prefix}${version}/product`** and nested **`membershipRouter`** at **`/membership`** (same public URLs:
  **`/product/membership`**, **`/product/membership/pricing`**).
- Split into **`routes/product/membership.ts`** (handlers) and **`routes/product/index.ts`** (wiring); removed
  **`routes/productMembership.ts`**.
- **`npm run build -w apps/api`** (lint + **tsc**) passed; integration test file not executed here (Docker/test DB
  unavailable on port 5732).

#### Files Created/Modified

- `apps/api/src/routes/product/membership.ts`
- `apps/api/src/routes/product/index.ts`
- `apps/api/src/app.ts`
- `apps/api/src/routes/productMembership.ts` (deleted)
- `.llm/history/active/membership-product-api-ui/membership-product-api-ui-part-01.md`

### Session 8 - 2026-05-05

#### Prompt (Developer)

do it

#### Key Decisions

- Moved **`/product`** mount into **`routes/product/index.ts`**: **`productSegmentRouter`** holds
  **`use('/membership', membershipRouter)`**, and **`productRouter`** mounts it at
  **`${prefix}${version}/product`** so **`app.ts`** uses **`app.use(productRouter)`** with no path suffix.

#### Files Created/Modified

- `apps/api/src/routes/product/index.ts`
- `apps/api/src/app.ts`
- `.llm/history/active/membership-product-api-ui/membership-product-api-ui-part-01.md`

### Session 9 - 2026-05-05

#### Prompt (Developer)

@podverse/apps/management-api/src/app.ts:77 this should use a similar pattern as api product/membership. when you press the "products" button on the dashboard for management it should take you to the "products" page which currently will only have a single button "memberships"

if metaboost needs similar changes make them

#### Key Decisions

- **management-api**: Nested **`routes/product/membershipDefaults.ts`** + **`routes/product/index.ts`** exporting **`productRouter`** (same URL **`GET …/product/membership`**); **`app.use(productRouter)`**; removed flat **`productMembershipDefaults.ts`**.
- **management-web**: Dashboard **`products`** nav card (superuser only); **`/products`** hub with **`NavCardGrid`** → **`/products/memberships`**; memberships page loads **`getProductMembershipDefaults()`** and renders labeled rows; i18n **`dashboard.products`**, **`products`**, **`productMemberships`** across **en-US**, **es**, **fr**, **el-GR** + overrides; Vitest **`products/page.test.tsx`**; E2E **`e2e/products-hub.spec.ts`** (mocked GET **`product/membership`**).
- **Metaboost management-api**: **`createProductRouter`** in **`routes/product.ts`**, **`versionedRouter.use('/product', …)`**; inline **`GET /product/membership`** removed; import **`resolveProductMembershipDefaultsFromEnv`** from **`@metaboost/helpers`** (build **`packages/helpers`** before management-api **tsc**). Metaboost management-web hub not duplicated (separate nav system; API parity only).

#### Files Created/Modified

- `apps/management-api/src/routes/product/membershipDefaults.ts`
- `apps/management-api/src/routes/product/index.ts`
- `apps/management-api/src/app.ts`
- `apps/management-api/src/routes/productMembershipDefaults.ts` (deleted)
- `apps/management-web/src/lib/managementNavRoutes.ts`
- `apps/management-web/i18n/originals/en-US.json`
- `apps/management-web/i18n/originals/es.json`
- `apps/management-web/i18n/originals/fr.json`
- `apps/management-web/i18n/originals/el-GR.json`
- `apps/management-web/i18n/overrides/es.json`
- `apps/management-web/i18n/overrides/fr.json`
- `apps/management-web/i18n/overrides/el-GR.json`
- `apps/management-web/src/app/(management)/products/page.tsx`
- `apps/management-web/src/app/(management)/products/ProductsPageClient.tsx`
- `apps/management-web/src/app/(management)/products/page.module.scss`
- `apps/management-web/src/app/(management)/products/memberships/page.tsx`
- `apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx`
- `apps/management-web/src/app/(management)/products/page.test.tsx`
- `apps/management-web/e2e/products-hub.spec.ts`
- `metaboost/apps/management-api/src/routes/product.ts`
- `metaboost/apps/management-api/src/app.ts`
- `.llm/history/active/membership-product-api-ui/membership-product-api-ui-part-01.md`
