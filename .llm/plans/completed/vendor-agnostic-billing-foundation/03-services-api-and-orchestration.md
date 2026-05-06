# 03 — Services, API, and Orchestration (Podverse)

## Scope

- Build provider-agnostic billing workflows for extension and auto-renew orchestration.
- Add management governance for pricing updates with auditability.

## Steps

1. Implement normalized billing domain events and handlers:
   - payment settled
   - renewal succeeded/failed
   - pay-on-demand extension requested
2. Add idempotent extension service that always delegates expiry math to the period policy helper.
3. Add management API endpoints for pricing operations:
   - list active prices
   - create/schedule price changes
   - activate/deprecate prices
4. Add near-expiry renewal scheduler/cron behavior:
   - scan due accounts within 24h
   - emit renewal attempts through provider-agnostic adapter boundary
   - persist attempt outcomes and retry strategy metadata
5. Expose client-safe billing and pricing read models for web and future React Native.
6. Add integration and E2E coverage for renewal visibility and admin pricing governance.

## Key files to touch later

- `apps/api/src/controllers/`
- `apps/api/src/routes/`
- `apps/management-api/src/routes/`
- `apps/management-web/src/`
- `infra/k8s/base/cron/` or worker scheduling location

## Verification

- Renewal attempts only trigger inside due window with idempotency checks.
- Pricing changes are permission-guarded and audited.
- API read models expose consistent tier, expiry, cadence, auto-renew, and price fields.
