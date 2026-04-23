# COPY-PASTA

Use these prompts in sequence to execute the database-console plan set one-by-one.
Run all commands from the monorepo root.

## Phase 0 (must be first)

### Plan 00A - Admin CRUD Permissions Foundation

```text
Implement the plan in .llm/plans/active/management-web-database-console/00a-admin-crud-permissions-foundation.md
Build Metaboost-like admin CRUD permission support in Podverse management-api and management-web.
Expose role + CRUD permissions in management auth context and /auth/me.
Add permission middleware for resource/operation checks.
Add admin create/update management flows to assign/update CRUD permissions.
Enforce: admins cannot change their own CRUD permissions.
Add integration tests for allow/deny behavior and self-permission-change denial.
Implement as clean-break only: no fallback code, no legacy comments, no compatibility branches.
```

```bash
./scripts/nix/with-env npm run test -w apps/management-api
./scripts/nix/with-env npm run test -w apps/management-web
```

## Phase 1

### Plan 01 - FeedFlagStatusReason

```text
Implement the plan in .llm/plans/active/management-web-database-console/01-feed-flag-status-reason.md
Add FeedFlagStatusReason schema/entity/service support using one canonical schema and contract.
Register reason fields in management-api policy/metadata for admin usage.
Implement as clean-break only: no fallback code, no legacy comments, no compatibility branches.
```

```bash
./scripts/nix/with-env npm run test -w packages/orm
./scripts/nix/with-env npm run test -w apps/workers
```

### Plan 02 - Management API Generic Database Layer

```text
Implement the plan in .llm/plans/active/management-web-database-console/02-management-api-database-layer.md
Create generic policy-driven /database endpoints for metadata/query/detail/create/update/delete.
Enforce allowlisted tables/fields/operations only.
Do not allow browser-provided raw SQL; use strict parameter binding and validated query payloads.
Use role + CRUD permission checks on all endpoints.
Restrict v1 scope to feed, feed_flag_status, and feed_flag_status_reason tables only.
Implement as clean-break only: no fallback code, no legacy comments, no compatibility branches.
```

```bash
./scripts/nix/with-env npm run test -w apps/management-api
./scripts/nix/with-env npm run lint -w apps/management-api
```

## Phase 2

### Plan 03 - Management Web Database UI

```text
Implement the plan in .llm/plans/active/management-web-database-console/03-management-web-database-ui.md
Use @tanstack/react-table and @tanstack/react-query for table/query behavior.
Keep rendering/forms custom in management-web.
Add dashboard links to /database and /workers.
Add /workers Coming Soon page.
Build /database table index, table browser, and row create/edit/delete pages.
Limit v1 table UI scope to feed, feed_flag_status, and feed_flag_status_reason.
Implement as clean-break only: no fallback code, no legacy comments, no compatibility branches.
```

```bash
./scripts/nix/with-env npm run test -w apps/management-web
./scripts/nix/with-env npm run lint -w apps/management-web
```

## Phase 3

### Plan 04 - Security And Audit Hardening

```text
Implement the plan in .llm/plans/active/management-web-database-console/04-security-audit-hardening.md
Add policy gates, strict query bounds, and default read-only behavior for high-risk tables.
Add feature-flag gating for high-risk writes.
Add audit logs for all write operations with sensitive-field redaction.
Complete threat-model checks for generic endpoints and role escalation paths.
Implement as clean-break only: no fallback code, no legacy comments, no compatibility branches.
```

```bash
./scripts/nix/with-env npm run test -w apps/management-api
```

## Final

### Plan 05 - Tests, Rollout, Docs

```text
Implement the plan in .llm/plans/active/management-web-database-console/05-tests-rollout-docs.md
Add integration/unit/E2E coverage for policy enforcement, CRUD authz, TanStack state mapping, and audit logs.
Complete rollout docs and runbooks for allowlist onboarding and rollback.
Verify staged rollout checklist is ready for production execution.
Implement as clean-break only: no fallback code, no legacy comments, no compatibility branches.
```

```bash
./scripts/nix/with-env npm run test -w apps/management-api
./scripts/nix/with-env npm run test -w apps/management-web
./scripts/nix/with-env npm run lint
```

## Completion Step

When all plans are complete, move the set from active to completed following plan lifecycle rules:

```bash
mkdir -p .llm/plans/completed/management-web-database-console
mv .llm/plans/active/management-web-database-console/*.md .llm/plans/completed/management-web-database-console/
```
