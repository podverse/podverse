# Prompt 15 Result: Route-Module Management API Expansion Pack

Objective:
- Provide module-complete expansion guidance for all management API route modules in 04e index.
- Make permissions, 401/403 semantics, validation rules, and side effects explicit.

## Global Standards

- Every operation includes explicit permission notes in description.
- Every protected operation documents both 401 and 403.
- Validation constraints from Joi/route guards are mirrored in schema fields.
- High-impact operations document audit or state-transition side effects.
- Postman-safe schema style and operation naming.

## Module Completion Matrix

| module plan | route module | tag draft | permission focus |
|---|---|---|---|
| 04e1 | auth | Management Auth | login/session/token lifecycle |
| 04e2 | admins | Management Admins | requireCrud('admins', action) + invite flows |
| 04e3 | users | Management Users | superuser-only operations |
| 04e4 | feeds | Management Feeds | requireCrud('feeds', read/update) |
| 04e5 | database | Management Database | dynamic table resource permission mapping |
| 04e6 | storage | Management Storage | requireCrud('bucket', read/delete) |
| 04e7 | workers | Management Workers | superuser command visibility |
| 04e8 | stats | Management Stats | requireCrud('stats', read) |
| 04e9 | product-membership | Management Product Membership | superuser + billing_prices update |
| 04e10 | product-pricing | Management Product Pricing | billing_prices read/create/update lifecycle |

## 401 vs 403 Documentation Rules

- 401: no valid authenticated admin identity.
- 403: valid admin identity lacking required superuser/CRUD permission.
- Document both on every non-public operation.

## Validation Reflection Rules

- Mirror Joi string length, enum, numeric min/max, and optional/default behavior.
- Mirror route/body schema custom constraints from management route code.
- Ensure invalid-id and invalid-param cases are represented as 400 responses.

## Side-Effect Documentation Rules

Mandatory side-effect sections for:
- product-pricing schedule/activate/deprecate
- product-membership patch settings
- storage delete/bulk-delete/delete-by-prefix
- database write operations

Each side-effect section should include:
- data stores touched
- audit/event emissions
- idempotency notes
- eventual consistency caveats (if any)

## Postman Compatibility Constraints

- Stable operationIds with management-prefixed naming.
- Concrete requestBody examples for all POST/PATCH/DELETE.
- Avoid unsupported schema constructs for permissions payloads.
- Keep path parameter docs explicit and consistent.

## Deliverable Shape Per Module

- operation blocks with tags/security/permissions
- request and response schemas with examples
- explicit error matrix (400/401/403/404/409/500 as applicable)
- module-specific QA checklist section
