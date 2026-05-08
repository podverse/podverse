# Phase 04 — Caps in DB + API + entitlements

- `0031_product_membership_settings_caps.sql`: four `INTEGER NOT NULL` columns with `CHECK (>= 0)`.
- Entity + `BillingPriceCatalogService` seed/update/resolve + `accountEntitlements` read row caps.
- Joi partial PATCH; management-api route; `make db_regen_linear_baseline`.
