# Admin Mutation Audit And Rollback Runbook

This runbook defines minimum operational handling for management-admin write actions.

## Audit Logging Requirements

Every successful write action must capture:

- actor id and actor role,
- route and operation (`create`, `update`, `delete`),
- resource key and table name,
- row identifier,
- timestamp and request id,
- before/after change summary (redacted where required).

## Sensitive Data Handling

- Never store plaintext credentials or token values in audit payloads.
- Redact known sensitive columns before persistence.
- Mask large JSON payloads to changed keys only when possible.

## Incident Response Steps

1. Identify incident scope:
   - affected table(s),
   - time window,
   - actor(s),
   - operation types.
2. Query audit records by request id, actor id, and table.
3. Determine rollback strategy:
   - point-in-time restore,
   - targeted row correction,
   - replay from previous values where captured.
4. Apply rollback in controlled environment first.
5. Verify data integrity and permission policy before reopening writes.

## Emergency Controls

- Disable high-risk write feature flags.
- Temporarily force target tables to read-only in policy registry.
- Restrict write operations to superuser-only until incident is resolved.

## Post-Incident Checklist

- Document root cause.
- Add regression tests to cover the failure mode.
- Update policy or validation constraints.
- Confirm runbook updates are committed with the fix.
