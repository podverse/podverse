# Phase 05 — Products pluralization (was /product)

Aligns `/product/*` with the rest of the resource roots (`/admins`, `/users`,
`/feeds`).

## Scope

- API renames:
  - `GET /product/membership` -> `GET /products/membership`
  - `PATCH /product/membership` -> `PATCH /products/membership`
  - `GET /product/pricing/active` -> `GET /products/pricing/active`
  - `POST /product/pricing/schedule` -> `POST /products/pricing/schedule`
  - `POST /product/pricing/:id/activate` ->
    `POST /products/pricing/:id/activate`
  - `POST /product/pricing/:id/deprecate` ->
    `POST /products/pricing/:id/deprecate`
- No web page changes (already at `/products/memberships`).

## Steps

1. Update `apps/management-api/src/routes/product/index.ts` mount path
   `'product'` -> `'products'`. Rename file directory
   `apps/management-api/src/routes/product/` -> `products/`.
2. Update `apps/management-api/src/app.ts` import
   (`@mgmt-api/routes/product/index.js` -> `products/index.js`).
3. Update `apps/management-api/src/routes/productMembership.integration.test.ts`
   and `productPricing.integration.test.ts` paths.
4. Update `apps/management-web/src/lib/requests/productMembership.ts` and
   `productPricing.ts` `path:` strings.
5. Confirm no other callers reference `/product/...`.
6. Update e2e spec `products-hub.spec.ts` if it asserts API paths.

## Key files

- `apps/management-api/src/routes/products/index.ts` (renamed dir)
- `apps/management-api/src/routes/products/productMembership.ts`
- `apps/management-api/src/routes/products/pricing.ts`
- `apps/management-api/src/app.ts`
- `apps/management-api/src/routes/productMembership.integration.test.ts`
- `apps/management-api/src/routes/productPricing.integration.test.ts`
- `apps/management-web/src/lib/requests/productMembership.ts`
- `apps/management-web/src/lib/requests/productPricing.ts`
- `apps/management-web/e2e/products-hub.spec.ts`

## Verification

- `npm run test:e2e:api` covers `/products/membership` and
  `/products/pricing/...`.
- `make e2e_test_management_web_report_spec SPEC=e2e/products-hub.spec.ts`
  passes.
