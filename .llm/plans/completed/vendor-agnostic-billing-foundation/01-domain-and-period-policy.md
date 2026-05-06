# 01 — Domain and Period Policy (Podverse)

## Scope

- Define vendor-agnostic billing domain language for purchasable products.
- Centralize membership extension math with calendar-clamp monthly behavior.

## Steps

1. Add shared domain types for `BillingCadence`, `BillingProductCode`, and extension reasons.
2. Create a pure period policy helper for:
   - extend from current expiry when still active
   - extend from now when expired or unset
   - monthly calendar clamp at month end
   - annual extension behavior aligned to the same policy surface
3. Replace direct date arithmetic call sites in membership claim, admin defaults, and membership
   service flows with this policy helper.
4. Add deterministic unit tests for month-end and leap-year boundaries.

## Key files to touch later

- `packages/orm/src/services/membershipClaimToken.helpers.ts`
- `packages/orm/src/services/account/accountPayPalOrder.ts`
- `packages/orm/src/services/account/account.ts`
- `apps/management-api/src/routes/users.ts`
- `apps/management-web/src/lib/createUserFormDefaults.ts`

## Verification

- Unit tests prove Jan/Mar/Feb boundary behavior.
- All extension paths call one period policy helper.
- No service computes membership expiry using ad-hoc month arithmetic.
