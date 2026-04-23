# 04 - Auth Token Policy Hardening (`PVSA-005`, `PVSA-006`)

## Goal

Reduce token theft blast radius and remove unnecessary token exposure in response bodies.

## Target Files

- `/Users/mitcheldowney/repos/pv/podverse/apps/api/src/lib/auth/index.ts`
- `/Users/mitcheldowney/repos/pv/podverse/apps/management-api/src/lib/auth/index.ts`
- auth tests in both API apps

## Plan

1. Shorten JWT lifetime from current 365-day window to a shorter policy value.
2. Decide and enforce token-in-body policy:
   - disable by default; keep only if required for explicit non-cookie clients.
3. If token-in-body must remain, gate it behind strict opt-in and document risk.
4. Update tests for login/session behavior and expiry assumptions.
5. Document migration impact for clients relying on old TTL or response token payload.

## Verification

```bash
npm run test -w apps/api
npm run test -w apps/management-api
npm run lint -w apps/api
npm run lint -w apps/management-api
```

## Done Criteria

- Token lifetime aligns with security policy.
- Token response exposure is eliminated or explicitly constrained and documented.
