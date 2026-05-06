# Execution order — Vendor-Agnostic Billing Foundation (Podverse)

## Phase order

1. [01-domain-and-period-policy.md](./01-domain-and-period-policy.md)
2. [02-pricing-catalog-and-schema.md](./02-pricing-catalog-and-schema.md)
3. [03-services-api-and-orchestration.md](./03-services-api-and-orchestration.md)

## Why this order

- Period policy must be finalized first so all service and schema behavior is consistent.
- Pricing and renewal metadata schema comes next so service/API work has stable storage contracts.
- Service, API, and scheduler work follows once policy and schema are locked.
