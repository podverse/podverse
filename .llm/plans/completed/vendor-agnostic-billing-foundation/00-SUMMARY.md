# Summary — Vendor-Agnostic Billing Foundation (Podverse)

## Objective

Create a future-focused billing foundation for Podverse that standardizes month-safe renewal math,
moves pricing source-of-truth to DB, and adds non-vendor-specific renewal and extension workflows.

## Scope of this plan set

- Premium membership is the first purchasable product.
- Schema and services must support additional purchasable products without redesign.
- Monthly renewal uses calendar-month clamp semantics.
- Auto-renew attempts are due in the near-expiry window (within 24 hours).
- Documentation and naming remain future-focused only.

## Planned outputs

- Centralized period policy module for month/year extension behavior.
- Billing product + pricing tables with audit-friendly history.
- Vendor-agnostic billing domain service contracts and extension APIs.
- Near-expiry renewal orchestrator with idempotent attempt handling.
- API read models usable by web and future React Native clients.

## Plan files

1. [01-domain-and-period-policy.md](./01-domain-and-period-policy.md)
2. [02-pricing-catalog-and-schema.md](./02-pricing-catalog-and-schema.md)
3. [03-services-api-and-orchestration.md](./03-services-api-and-orchestration.md)
