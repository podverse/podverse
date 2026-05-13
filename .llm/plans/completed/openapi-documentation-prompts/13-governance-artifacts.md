# Prompt 13 Result: Governance Artifacts Draft

Objective:
- Draft rule/checklist language that enforces OpenAPI updates for API behavior changes.

## Cursor Rule Draft

Rule name:
- OpenAPI Update Required For API Surface Changes

Rule text draft:
- Any PR that changes HTTP routes, request payload validation, response payload shape, authentication behavior, or authorization semantics MUST update:
  - apps/api/openapi.yml and/or
  - apps/management-api/openapi.yml
- If no spec change is needed, PR must include an explicit justification comment.
- New or changed endpoints must include operationId, tags, request/response schemas, and auth/security documentation.
- Mutating endpoints must include at least one success and one failure example.

## PR Checklist Additions Draft

Add checklist items:
- [ ] OpenAPI updated for all API route changes
- [ ] operationId values are unique and stable
- [ ] 401/403 semantics documented where applicable
- [ ] request and response examples added/updated
- [ ] Postman import sanity check performed
- [ ] Route matrix/spec coverage re-verified

## Ownership Boundaries Draft

- API team owns apps/api/openapi.yml.
- Management API team owns apps/management-api/openapi.yml.
- Shared component conventions are co-owned; breaking changes require cross-team review.

## Reviewer Guidance

Reviewers should verify:
- every changed route has matching spec path+method
- every changed validator is reflected in schema constraints
- every authz change has updated security and 401/403 response docs
- no stale examples conflict with runtime behavior

## Enforcement Strategy

- CI guard: route matrix diff + spec coverage check.
- CI guard: operationId uniqueness + unresolved reference checks.
- Block merge on failed OpenAPI checks unless waiver approved.
