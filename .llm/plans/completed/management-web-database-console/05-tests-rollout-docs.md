# Plan 05 - Tests, Rollout, And Documentation

## Goal

Validate correctness/security and document operational usage for the new admin database experience.

## Phase Gate

- Start only after `04` acceptance criteria and tests are complete.

## Clean-Break Rule

- Tests and rollout docs validate canonical behavior only; no legacy-path validation.

## Target Files

- `packages/orm/src/services/feed/*.test.ts`
- `apps/management-api/src/routes/*.integration.test.ts`
- `apps/management-web/e2e/*.spec.ts` (if/when added for management-web routes)
- `docs/*` (new admin database operation docs)

## Steps

1. ORM tests:
   - feed status updates with reason,
   - compatibility with existing status updates without reason.
2. Management-api integration tests:
   - auth/authz pass and fail cases,
   - allowlist enforcement,
   - policy-registry field-level permission enforcement,
   - query validation bounds,
   - CRUD happy paths and invalid payload failures.
3. Management-web tests:
   - dashboard navigation links,
   - `/database` route guard behavior,
   - table query/filter/sort behavior,
   - TanStack state to API payload mapping behavior,
   - URL/query param round-trip for table state,
   - create/edit/delete confirmation workflows,
   - `/workers` coming soon page render.
4. Audit coverage tests:
   - verify write operations emit audit records with actor/table/row/operation.
   - verify redaction rules for sensitive fields in audit payloads.
5. Documentation:
   - admin operations guide,
   - table onboarding process (how new tables become allowlisted),
   - audit and rollback procedures.
6. Rollout plan:
   - feature-flag gated release,
   - staged enablement for selected tables first,
   - post-release monitoring checklist.

## Acceptance Criteria

- Core flows are covered by automated tests.
- Docs are sufficient for admins and engineers to operate safely.
- Rollout can be staged and reversed without downtime.
- TanStack-driven table state behavior is regression-protected by tests.

## Risks

- Test setup complexity for generic endpoints can delay delivery.
- Incomplete docs may cause unsafe manual operations in production.
