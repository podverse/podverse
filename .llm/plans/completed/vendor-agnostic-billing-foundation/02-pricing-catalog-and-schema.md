# 02 — Pricing Catalog and Schema (Podverse)

## Scope

- Make DB the source of truth for pricing and cadence-linked product offers.
- Keep env pricing values as bootstrap defaults and safety fallback only.

## Steps

1. Add product and price schema primitives, including effective-window support:
   - `billing_product`
   - `billing_price`
   - optional `billing_price_change_audit`
2. Extend membership status or adjacent billing profile data with renewal-operational metadata:
   - cadence, auto-renew mode, next/last renewal attempt, last status
   - idempotency key material for extension and renewal attempts
3. Seed DB defaults for premium membership:
   - monthly: 3.00 USD
   - annual: 30.00 USD
4. Add migration-safe bootstrap logic that can initialize pricing from env defaults only when DB
   values are missing.
5. Add permission model requirements for management price updates.

## Key files to touch later

- `infra/k8s/base/ops/source/database/linear-migrations/app/`
- `packages/orm/src/entities/`
- `packages/orm/src/services/`
- `apps/management-api/src/routes/`

## Verification

- Migration creates catalog and pricing tables with required constraints.
- Seeded pricing rows are queryable and active.
- Runtime pricing reads resolve DB values first and only fallback when expected.
