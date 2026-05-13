# Prompt 9 Result: Management Products + Pricing OpenAPI Draft

Scope route modules:
- products/pricing
- products/membership

Objective:
- Draft operation-complete docs for pricing lifecycle and product membership settings.
- Capture Joi validation behavior and audit/logged side effects.

## Operations

| method | path | operationId draft | authz draft | lifecycle/side effects |
|---|---|---|---|---|
| GET | /products/pricing/active | managementPricingGetActive | requireCrud('billing_prices','read') | read active pricing rows |
| POST | /products/pricing/schedule | managementPricingSchedule | requireCrud('billing_prices','create') | schedules new price, closes prior active row |
| POST | /products/pricing/{id}/activate | managementPricingActivate | requireCrud('billing_prices','update') | activates specific row, deactivates conflicting active rows |
| POST | /products/pricing/{id}/deprecate | managementPricingDeprecate | requireCrud('billing_prices','update') | deprecates/ends target pricing row |
| GET | /products/membership | managementProductMembershipGet | superuser + authenticated | resolve membership settings snapshot |
| PATCH | /products/membership | managementProductMembershipPatch | superuser + requireCrud('billing_prices','update') | updates membership settings and writes audit record |

## Joi Validation Reflection

For POST /products/pricing/schedule, request schema should reflect:
- productCode: string, default membership_premium
- currencyCode: 3-letter uppercase, default USD
- cadence: enum monthly|annual (required)
- amountCents: integer >= 0 (required)
- effectiveFrom: ISO datetime (optional)
- changeReason: string max 500 (optional)

For PATCH /products/membership, request schema should reflect optional integer fields:
- freeTrialExpirationSeconds
- trialMaxAddByRSSFeeds
- trialMaxManualRefreshesPerHour
- premiumMaxAddByRSSFeeds
- premiumMaxManualRefreshesPerHour

If no valid fields are present, return 400 Invalid body.

## Lifecycle Semantics Draft

Schedule:
- closes existing active row for same product/currency/cadence by setting effective_to
- inserts new row with effective_from and null effective_to
- appends billing_price_change_audit record

Activate:
- verifies id exists
- sets target effective_to null and closes conflicting active rows for same dimension
- should document idempotency and resulting active timeline

Deprecate:
- marks target row end-of-life (effective_to)
- document behavior when already deprecated

Membership patch:
- validates patch payload
- updates settings store
- records audit log for table product_membership_settings
- returns resolved membership payload after update

## Response and Error Draft

For pricing schedule/activate/deprecate:
- 201 or 200 success with identifier/updated row
- 400 validation or invalid id
- 401 unauthenticated
- 403 insufficient billing_prices permissions
- 404 missing billing product/pricing row
- 500 server error

For membership get/patch:
- 200 success with data envelope
- 400 invalid body
- 401 unauthenticated
- 403 non-superuser or insufficient permission
- 500 server error

## Audit and Side-Effect Notes

Document that these operations have durable side effects:
- writes to billing_price and billing_price_change_audit tables
- writes to product membership settings
- writes admin audit log entries with request id where available

Include x-request-id header as optional documented header for traceability.
