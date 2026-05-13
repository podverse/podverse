# Execution Order — OpenAPI Documentation Detailed Plan

## Dependency Graph

```text
Wave 1: Census + Baselines
  01-audit-inventory.md
  01a-audit-api-route-matrix.md
  01b-audit-management-route-matrix.md
  05a-shared-components-and-errors.md
  05b-security-authz-model.md

Wave 2: Core Domain Drafting (parallel)
  03a-api-auth-account.md
  03b-api-content-discovery.md
  03e-api-route-module-index.md
  04a-management-auth-admins.md
  04b-management-users-feeds.md
  04e-management-route-module-index.md

Wave 3: High-Risk Domain Drafting (parallel)
  03c-api-user-media-and-queues.md
  03d-api-product-membership-and-integrations.md
  04c-management-products-pricing.md
  04d-management-storage-database-workers-stats.md

Wave 4: Normalization
  05c-examples-and-edge-cases.md
  03-document-endpoints.md
  04-testing-validation.md

Wave 5: Validation + Governance
  06a-validation-structural.md
  06b-validation-behavioral-conformance.md
  06c-swagger-usability-release-readiness.md
  06d-postman-compatibility-readiness.md
  07-governance-cursor-rules-and-pr-checklists.md
```

## Wave Details

### Wave 1: Census + Baselines
- Build complete route-to-operation matrices for API and management API.
- Define component reuse policy and security/authz semantics.
- Outcome: no unmapped routes, no ambiguity on auth model, baseline schema map ready.

Exit criteria:
- Every file under `apps/api/src/routes` and `apps/management-api/src/routes` is accounted for in a matrix.
- Baseline component list exists (error envelopes, pagination, identity fragments, product/pricing structures).
- Security model documented (public, cookie, bearer, privileged constraints).

### Wave 2: Core Domain Drafting
- Draft lower-risk but high-volume endpoint families.
- Keep `operationId` and tags consistent with domain naming conventions.

Exit criteria:
- Core domains have request/response schemas and error models.
- Auth/admin domains explicitly document 401 vs 403 behavior.

### Wave 3: High-Risk Domain Drafting
- Focus on mutable, sensitive, and side-effect-heavy endpoints.
- Capture permission checks, validation constraints, and audit side effects.

Exit criteria:
- Product and pricing lifecycle operations are fully documented.
- Storage/database dangerous operations include guardrail notes and failure cases.
- Integration routes include webhook/async behavior notes.

### Wave 4: Normalization
- Remove schema duplication and normalize example quality.
- Ensure consistent naming, tags, and operation semantics.

Exit criteria:
- Shared components are reused via references.
- Each operation has at least one success example plus one failure example class.

### Wave 5: Validation + Governance
- Validate structure, behavior conformance, and Swagger usability.
- Validate Postman import and request execution compatibility.
- Finalize governance artifacts for ongoing maintenance.

Exit criteria:
- Structural validation passes (refs, operationIds, schema consistency).
- Behavioral spot checks against high-risk route handlers and integration tests pass.
- Postman compatibility checklist passes for both specs.
- PR checklist and Cursor guidance are finalized.

## Recommended Parallelization

1. One contributor on API tracks, one on management tracks.
2. One reviewer dedicated to cross-cutting quality (`05*` + `06*` + `07*`).
3. Merge by wave to keep diff reviewable and prevent cross-wave churn.

## Time Allocation

| Wave | Duration | Parallelizable |
|------|----------|----------------|
| Wave 1 | 1 day | Yes |
| Wave 2 | 1-2 days | Yes |
| Wave 3 | 1-2 days | Yes |
| Wave 4 | 1 day | Partial |
| Wave 5 | 1 day | Partial |
| Total | 5-7 days | Optimized |
