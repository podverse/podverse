# Plan 04 - Security And Audit Hardening

## Goal

Harden the generic admin data surface to be safe for production use.

## Phase Gate

- Start only after `03` acceptance criteria and tests are complete.

## Clean-Break Rule

- Security and audit behavior is defined in canonical target-state only.

## Target Files

- `apps/management-api/src/lib/*` (authz, policy, validation, audit)
- `apps/management-api/src/routes/*` (database route guards)
- `apps/management-web/src/app/database/*` (UX safeguards and confirmations)

## Steps

1. Implement server-side query constraints:
   - max page size,
   - max filter count,
   - max sort clauses,
   - timeout/abort boundaries.
2. Enforce policy-registry gates:
   - table allowlist only,
   - column-level read/write rules,
   - operation-level permissions per role.
3. Add mutation safeguards:
   - explicit confirmation for deletes,
   - optional dry-run mode for high-risk tables,
   - blocklist/readonly tables by default,
   - feature-flag gating for high-risk table writes.
4. Implement audit trail:
   - actor id,
   - operation,
   - table and row identifier,
   - before/after summary (redacted where needed),
   - timestamp and request id.
5. Add standardized error handling:
   - security-safe error payloads,
   - no sensitive SQL/internal leakage in responses.
6. Threat-model check for generic endpoints and role escalation paths.

## Acceptance Criteria

- All writes emit audit records.
- Overly broad/invalid queries are rejected.
- Unauthorized operations fail with consistent status codes.
- High-risk operations require explicit user confirmation paths.
- High-risk table writes are disabled by default and explicitly enabled.

## Risks

- Audit logging can leak PII if not redacted carefully.
- Overly strict limits can hurt admin usability; tune defaults with telemetry.
