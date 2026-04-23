# 01 - Management API Authz Scope (`PVSA-001`)

## Goal

Prevent authenticated admins from querying arbitrary admin account ids unless explicitly allowed by
policy.

## Target Files

- `/Users/mitcheldowney/repos/pv/podverse/apps/management-api/src/routes/adminAccount.ts`
- `/Users/mitcheldowney/repos/pv/podverse/apps/management-api/src/lib/auth/index.ts`
- management-api tests for admin-account route behavior

## Plan

1. Define route policy:
   - default: only allow `:id` equal to authenticated user id.
   - keep response shape unchanged for allowed requests.
2. Add explicit guard in route before service lookup.
3. Return `403` (or `404` if preferred by policy) for cross-account access attempts.
4. Add/extend integration tests for:
   - admin reads self -> success.
   - admin reads other admin -> denied.
5. Confirm no regressions in auth middleware behavior.

## Verification

```bash
npm run test -w apps/management-api
npm run lint -w apps/management-api
```

## Done Criteria

- Cross-admin read access is blocked by route-level authz.
- Tests clearly prove deny behavior.
