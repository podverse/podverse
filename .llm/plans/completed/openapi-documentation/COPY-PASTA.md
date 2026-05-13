# COPY-PASTA Prompts — Detailed OpenAPI Plan Expansion

Use one prompt at a time to deepen a specific subplan.

## Completed

### Prompt 1: API Route Matrix Extraction (`01a`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/01-api-route-matrix.md`

```text
Build a full route matrix for apps/api/src/routes including product subdirectory routes.
For each operation include: method, canonical path, auth requirement, request schema source, response schema source, and risk class (low/medium/high).
Output as markdown tables grouped by route module.
```

### Prompt 2: Management Route Matrix Extraction (`01b`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/02-management-route-matrix.md`

```text
Build a full route matrix for apps/management-api/src/routes including product routes.
Include explicit permission requirements (superuser, requireCrud target, public).
Output grouped tables plus a summary of highest-risk operations.
```

### Prompt 3: API Auth + Account Documentation (`03a`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/03-api-auth-account-documentation.md`

```text
Draft exhaustive OpenAPI operations for API auth and account/account-settings endpoints.
Include cookie vs bearer security notes, 401 vs 403 semantics, validation failures, and realistic examples.
```

### Prompt 4: API Content + Discovery Documentation (`03b`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/04-api-content-discovery-documentation.md`

```text
Draft operations for category/channel/feed/item/live-item/medium/profile-content/publisher-feed/podroll.
Standardize pagination/filter/search parameter docs and list/detail response models.
```

### Prompt 5: API User Media + Queue Documentation (`03c`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/05-api-user-media-queue-documentation.md`

```text
Draft operations for playlist/clip/queue/itemChapter/itemSoundbite/itemTranscript endpoints.
Include ownership/authorization constraints and mutation error cases.
```

### Prompt 6: API Product + Integrations Documentation (`03d`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/06-api-product-integrations-documentation.md`

```text
Draft operations for product membership and integration-facing routes (externalServices/paypal/metaboost/mq/stats).
Call out side effects, webhook constraints, and async behavior where applicable.
```

### Prompt 7: Management Auth + Admins Documentation (`04a`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/07-management-auth-admins-documentation.md`

```text
Draft operations for management auth and admins endpoints including invite issuance and redeem flows.
Include role/permission semantics and expected forbidden responses.
```

### Prompt 8: Management Users + Feeds Documentation (`04b`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/08-management-users-feeds-documentation.md`

```text
Draft operations for management users and feeds endpoints with pagination, query filtering, policy-state transitions, and superuser restrictions.
```

### Prompt 9: Management Products + Pricing Documentation (`04c`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/09-management-products-pricing-documentation.md`

```text
Draft operations for products/membership and products/pricing endpoints.
Include scheduling lifecycle, activate/deprecate semantics, Joi validations, and audit side effects.
```

### Prompt 10: Management Storage/Database/Workers/Stats (`04d`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/10-management-storage-database-workers-stats-documentation.md`

```text
Draft operations for storage, database, workers, and stats endpoints.
Include allowlist constraints, destructive operation safeguards, and large-response caveats.
```

### Prompt 11: Shared Components + Error Envelopes (`05a`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/11-shared-components-error-envelopes.md`

```text
Define a reusable components library for both specs covering error envelopes, pagination, identity fragments, permissions, and product pricing/membership structures.
Minimize inline schema duplication.
```

### Prompt 12: Security/Authz + Examples + QA (`05b`/`05c`/`06*`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/12-security-examples-qa-pass.md`

```text
Create a combined cross-cutting quality pass:
1) enforce operation-level security policy,
2) add success/failure examples,
3) run structural and behavioral validation checks,
4) produce a release-readiness checklist.
```

### Prompt 13: Governance Artifacts (`07`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/13-governance-artifacts.md`

```text
Draft Cursor rule and PR checklist updates that require OpenAPI spec updates whenever API routes, request/response payloads, or auth behavior change.
Include reviewer checks and ownership boundaries.
```

### Prompt 14: Route-Module Public API Expansion (`03e`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/14-route-module-public-api-expansion.md`

```text
For each public API route module subplan listed in 03e-api-route-module-index.md, generate operation-complete OpenAPI docs with:
- unique operationId values,
- consistent tags,
- complete request/response schemas,
- success + failure examples,
- explicit auth mode.
Ensure output is compatible with Swagger UI and Postman import.
```

### Prompt 15: Route-Module Management API Expansion (`04e`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/15-route-module-management-api-expansion.md`

```text
For each management API route module subplan listed in 04e-management-route-module-index.md, generate operation-complete OpenAPI docs with:
- explicit permission/superuser notes,
- complete error semantics (401 vs 403),
- request validators reflected in schemas,
- lifecycle side effects documented for pricing/storage/database operations.
Ensure Postman collection import and request execution remain clean.
```

### Prompt 16: Postman Compatibility Pass (`06d`) — Completed

- Status: completed
- Output: `.llm/plans/completed/openapi-documentation-prompts/16-postman-compatibility-pass.md`

```text
Run a Postman compatibility pass on both OpenAPI specs.
Check and fix:
- server URLs and base paths,
- security scheme mapping for bearer/cookie auth,
- content-type declarations,
- parameter serialization styles,
- requestBody examples,
- unique operationId and stable naming,
- unsupported schema constructs for Postman import.
Output a checklist with pass/fail and concrete fixes.
```

## Pending

## Prompt 1: API Route Matrix Extraction (`01a`)

```text
Moved to Completed section above.
```

## Prompt 2: Management Route Matrix Extraction (`01b`)

```text
Moved to Completed section above.
```

## Prompt 3: API Auth + Account Documentation (`03a`)

```text
Moved to Completed section above.
```

## Prompt 4: API Content + Discovery Documentation (`03b`)

```text
Moved to Completed section above.
```

## Prompt 5: API User Media + Queue Documentation (`03c`)

```text
Moved to Completed section above.
```

## Prompt 6: API Product + Integrations Documentation (`03d`)

```text
Moved to Completed section above.
```

## Prompt 7: Management Auth + Admins Documentation (`04a`)

```text
Moved to Completed section above.
```

## Prompt 8: Management Users + Feeds Documentation (`04b`)

```text
Moved to Completed section above.
```

## Prompt 9: Management Products + Pricing Documentation (`04c`)

```text
Moved to Completed section above.
```

## Prompt 10: Management Storage/Database/Workers/Stats (`04d`)

```text
Moved to Completed section above.
```

## Prompt 11: Shared Components + Error Envelopes (`05a`)

```text
Moved to Completed section above.
```

## Prompt 12: Security/Authz + Examples + QA (`05b`/`05c`/`06*`)

```text
Moved to Completed section above.
```

## Prompt 13: Governance Artifacts (`07`)

```text
Moved to Completed section above.
```

## Prompt 14: Route-Module Public API Expansion (`03e`)

```text
Moved to Completed section above.
```

## Prompt 15: Route-Module Management API Expansion (`04e`)

```text
Moved to Completed section above.
```

## Prompt 16: Postman Compatibility Pass (`06d`)

```text
Moved to Completed section above.
```
